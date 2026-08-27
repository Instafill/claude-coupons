using System.Security.Cryptography;
using System.Text;

using MongoDB.Bson;
using MongoDB.Driver;

using ClaudeCoupons.Models;

namespace ClaudeCoupons.BL
{
    // All Mongo access and every lifecycle rule in one place. Registered as a singleton.
    public class PassStore
    {
        // A Pro/Max subscriber holds at most this many guest passes, so after this many
        // reported claims the listing cannot have anything left to give.
        public const int MaxClaimsPerPass = 3;
        private const int DeadReportsToHide = 2;
        private const int ListingLifetimeDays = 21;

        // Anti-hoarding: how many distinct passes one account may unlock per rolling day.
        public const int UnlocksPerUserPerDay = 3;

        private readonly IMongoCollection<UserDoc> _users;
        private readonly IMongoCollection<LoginTokenDoc> _loginTokens;
        private readonly IMongoCollection<PassDoc> _passes;
        private readonly IMongoCollection<UnlockDoc> _unlocks;
        private readonly string _ipSalt;

        public PassStore(IConfiguration config)
        {
            var client = new MongoClient(config["Mongo:ConnectionString"] ?? "mongodb://localhost:27017");
            var db = client.GetDatabase(config["Mongo:Database"] ?? "claudecoupons");
            _users = db.GetCollection<UserDoc>("users");
            _loginTokens = db.GetCollection<LoginTokenDoc>("login_tokens");
            _passes = db.GetCollection<PassDoc>("passes");
            _unlocks = db.GetCollection<UnlockDoc>("unlocks");
            _ipSalt = config["IpHashSalt"] ?? "claudecoupons";

            _users.Indexes.CreateOne(new CreateIndexModel<UserDoc>(
                Builders<UserDoc>.IndexKeys.Ascending(u => u.Email), new CreateIndexOptions { Unique = true }));
            _loginTokens.Indexes.CreateOne(new CreateIndexModel<LoginTokenDoc>(
                Builders<LoginTokenDoc>.IndexKeys.Ascending(t => t.Token), new CreateIndexOptions { Unique = true }));
            _passes.Indexes.CreateOne(new CreateIndexModel<PassDoc>(
                Builders<PassDoc>.IndexKeys.Ascending(p => p.Code), new CreateIndexOptions { Unique = true }));
            _unlocks.Indexes.CreateOne(new CreateIndexModel<UnlockDoc>(
                Builders<UnlockDoc>.IndexKeys.Ascending(u => u.PassId).Ascending(u => u.UserId),
                new CreateIndexOptions { Unique = true }));
        }

        public string HashIp(string? ip) =>
            Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(_ipSalt + (ip ?? ""))))[..16];

        // ---- users & magic links ----

        public async Task<UserDoc> FindOrCreateUser(string email)
        {
            email = email.Trim().ToLowerInvariant();
            var now = DateTime.UtcNow;
            return await _users.FindOneAndUpdateAsync<UserDoc>(
                u => u.Email == email,
                Builders<UserDoc>.Update
                    .SetOnInsert(u => u.Email, email)
                    .SetOnInsert(u => u.CreatedAt, now)
                    .Set(u => u.LastSignInAt, now),
                new FindOneAndUpdateOptions<UserDoc> { IsUpsert = true, ReturnDocument = ReturnDocument.After });
        }

        public async Task<UserDoc?> GetUser(ObjectId id) =>
            await _users.Find(u => u.Id == id).FirstOrDefaultAsync();

        public async Task<string> CreateLoginToken(string email, string returnUrl)
        {
            var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();
            await _loginTokens.InsertOneAsync(new LoginTokenDoc
            {
                Token = token,
                Email = email.Trim().ToLowerInvariant(),
                ReturnUrl = returnUrl,
                CreatedAt = DateTime.UtcNow,
            });
            return token;
        }

        // Marks the token used and hands back its email + return URL, or null when the token
        // is unknown, already used, or older than 30 minutes.
        public async Task<LoginTokenDoc?> ConsumeLoginToken(string token)
        {
            var cutoff = DateTime.UtcNow.AddMinutes(-30);
            return await _loginTokens.FindOneAndUpdateAsync<LoginTokenDoc>(
                t => t.Token == token && t.UsedAt == null && t.CreatedAt > cutoff,
                Builders<LoginTokenDoc>.Update.Set(t => t.UsedAt, DateTime.UtcNow),
                new FindOneAndUpdateOptions<LoginTokenDoc> { ReturnDocument = ReturnDocument.After });
        }

        // ---- passes ----

        // Returns null when the code is already listed.
        public async Task<PassDoc?> SubmitPass(string code, ObjectId submitterUserId)
        {
            var now = DateTime.UtcNow;
            var pass = new PassDoc
            {
                Code = code,
                SubmitterUserId = submitterUserId,
                Status = PassStatus.Live,
                CreatedAt = now,
                LastRefreshedAt = now,
            };
            try
            {
                await _passes.InsertOneAsync(pass);
                return pass;
            }
            catch (MongoWriteException e) when (e.WriteError.Category == ServerErrorCategory.DuplicateKey)
            {
                return null;
            }
        }

        // The public board: live listings, least-claimed first so fresh allotments surface.
        public async Task<List<PassDoc>> GetBoard()
        {
            var passes = await _passes.Find(p => p.Status == PassStatus.Live).ToListAsync();
            foreach (var pass in passes)
                await ApplyLifecycle(pass);
            return [.. passes
                .Where(p => p.Status == PassStatus.Live)
                .OrderBy(p => p.ClaimedCount)
                .ThenByDescending(p => p.CreatedAt)];
        }

        public async Task<PassDoc?> GetPass(ObjectId id) =>
            await _passes.Find(p => p.Id == id).FirstOrDefaultAsync();

        public async Task<List<PassDoc>> GetUserListings(ObjectId userId) =>
            await _passes.Find(p => p.SubmitterUserId == userId && p.Status != PassStatus.Removed)
                .SortByDescending(p => p.CreatedAt).ToListAsync();

        // The hiding rules. Evaluated lazily on read; writes back only on a transition.
        private async Task ApplyLifecycle(PassDoc pass)
        {
            if (pass.Status != PassStatus.Live)
                return;

            string? next = null;
            if (pass.ClaimedCount >= MaxClaimsPerPass)
                next = PassStatus.Exhausted;
            else if (pass.DeadCount >= DeadReportsToHide && pass.DeadCount > pass.ClaimedCount)
                next = PassStatus.Dead;
            else if (pass.LastRefreshedAt < DateTime.UtcNow.AddDays(-ListingLifetimeDays))
                next = PassStatus.Expired;

            if (next != null)
            {
                pass.Status = next;
                await _passes.UpdateOneAsync(p => p.Id == pass.Id,
                    Builders<PassDoc>.Update.Set(p => p.Status, next));
            }
        }

        // ---- submitter self-service ----

        public async Task<bool> RefreshPass(ObjectId passId, ObjectId userId)
        {
            var result = await _passes.UpdateOneAsync(
                p => p.Id == passId && p.SubmitterUserId == userId,
                Builders<PassDoc>.Update
                    .Set(p => p.LastRefreshedAt, DateTime.UtcNow)
                    .Set(p => p.Status, PassStatus.Live));
            return result.ModifiedCount > 0;
        }

        public async Task<bool> SetOwnStatus(ObjectId passId, ObjectId userId, string status)
        {
            if (status != PassStatus.Exhausted && status != PassStatus.Removed)
                return false;
            var result = await _passes.UpdateOneAsync(
                p => p.Id == passId && p.SubmitterUserId == userId,
                Builders<PassDoc>.Update.Set(p => p.Status, status));
            return result.ModifiedCount > 0;
        }

        // ---- unlocks: the who-got-what log ----

        public async Task<Dictionary<ObjectId, UnlockDoc>> GetUserUnlocks(ObjectId userId)
        {
            var unlocks = await _unlocks.Find(u => u.UserId == userId).ToListAsync();
            return unlocks.ToDictionary(u => u.PassId);
        }

        public async Task<int> CountRecentUnlocks(ObjectId userId)
        {
            var cutoff = DateTime.UtcNow.AddHours(-24);
            return (int)await _unlocks.CountDocumentsAsync(u => u.UserId == userId && u.At > cutoff);
        }

        // Idempotent: a second unlock of the same pass returns the existing row and does not
        // touch the counter or the daily cap.
        public async Task<UnlockDoc> RecordUnlock(ObjectId passId, ObjectId userId, string ipHash)
        {
            var existing = await _unlocks.Find(u => u.PassId == passId && u.UserId == userId).FirstOrDefaultAsync();
            if (existing != null)
                return existing;

            var unlock = new UnlockDoc { PassId = passId, UserId = userId, At = DateTime.UtcNow, IpHash = ipHash };
            try
            {
                await _unlocks.InsertOneAsync(unlock);
                await _passes.UpdateOneAsync(p => p.Id == passId,
                    Builders<PassDoc>.Update.Inc(p => p.UnlockCount, 1));
            }
            catch (MongoWriteException e) when (e.WriteError.Category == ServerErrorCategory.DuplicateKey)
            {
                unlock = await _unlocks.Find(u => u.PassId == passId && u.UserId == userId).FirstAsync();
            }
            return unlock;
        }

        // Records the "did it work?" answer on the caller's own unlock, once. The pass
        // counters move with it, which is what eventually hides the listing.
        public async Task<bool> RecordOutcome(ObjectId passId, ObjectId userId, string outcome)
        {
            if (outcome != UnlockOutcome.Claimed && outcome != UnlockOutcome.Dead)
                return false;

            var updated = await _unlocks.FindOneAndUpdateAsync<UnlockDoc>(
                u => u.PassId == passId && u.UserId == userId && u.Outcome == UnlockOutcome.None,
                Builders<UnlockDoc>.Update
                    .Set(u => u.Outcome, outcome)
                    .Set(u => u.OutcomeAt, DateTime.UtcNow));
            if (updated == null)
                return false;

            var inc = outcome == UnlockOutcome.Claimed
                ? Builders<PassDoc>.Update.Inc(p => p.ClaimedCount, 1)
                : Builders<PassDoc>.Update.Inc(p => p.DeadCount, 1);
            await _passes.UpdateOneAsync(p => p.Id == passId, inc);
            return true;
        }

        // ---- startup seed ----

        // Lists our own referral link so the board is never empty. Idempotent.
        public async Task Seed(string? code, string? email)
        {
            if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(email))
                return;
            var user = await FindOrCreateUser(email);
            await SubmitPass(code, user.Id);
        }
    }
}
