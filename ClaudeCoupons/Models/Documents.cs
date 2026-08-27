using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ClaudeCoupons.Models
{
    // One account per email, shared by both sides of the exchange: a user signs in with a
    // magic link whether they came to list a pass or to unlock one. No passwords anywhere.
    public class UserDoc
    {
        [BsonId]
        public ObjectId Id { get; set; }

        public string Email { get; set; } = "";
        public DateTime CreatedAt { get; set; }
        public DateTime LastSignInAt { get; set; }
    }

    // A single-use magic-link token. Consumed on first click, dead after 30 minutes.
    public class LoginTokenDoc
    {
        [BsonId]
        public ObjectId Id { get; set; }

        public string Token { get; set; } = "";
        public string Email { get; set; } = "";
        public string ReturnUrl { get; set; } = "/";
        public DateTime CreatedAt { get; set; }
        public DateTime? UsedAt { get; set; }
    }

    public static class PassStatus
    {
        public const string Live = "live";
        public const string Exhausted = "exhausted"; // 3 claims reported - the sender's allotment
        public const string Dead = "dead";           // reported not working by claimers
        public const string Expired = "expired";     // not refreshed by the submitter in time
        public const string Removed = "removed";     // taken down by the submitter
    }

    // One listed referral link. Only the code is stored; the URL is always reconstructed
    // server-side as https://claude.ai/referral/{code}, so arbitrary links can never enter.
    public class PassDoc
    {
        [BsonId]
        public ObjectId Id { get; set; }

        public string Code { get; set; } = "";
        public ObjectId SubmitterUserId { get; set; }
        public string Status { get; set; } = PassStatus.Live;
        public DateTime CreatedAt { get; set; }
        public DateTime LastRefreshedAt { get; set; }

        // Counters denormalized from unlocks so the board reads without an aggregation.
        public int UnlockCount { get; set; }
        public int ClaimedCount { get; set; }
        public int DeadCount { get; set; }

        public string Url => "https://claude.ai/referral/" + Code;

        // What the board shows before an unlock: enough to look real, not enough to use.
        public string MaskedCode =>
            Code.Length <= 5 ? Code[..1] + "•••" : Code[..3] + new string('•', Code.Length - 5) + Code[^2..];
    }

    public static class UnlockOutcome
    {
        public const string None = "none";       // unlocked, no answer yet
        public const string Claimed = "claimed"; // "I claimed it"
        public const string Dead = "dead";       // "link didn't work"
    }

    // The log the whole wall exists for: who unlocked which pass, and what they reported
    // happened when they tried it. One row per (pass, user) - re-unlocking is idempotent.
    public class UnlockDoc
    {
        [BsonId]
        public ObjectId Id { get; set; }

        public ObjectId PassId { get; set; }
        public ObjectId UserId { get; set; }
        public DateTime At { get; set; }
        public string IpHash { get; set; } = "";
        public string Outcome { get; set; } = UnlockOutcome.None;
        public DateTime? OutcomeAt { get; set; }
    }
}
