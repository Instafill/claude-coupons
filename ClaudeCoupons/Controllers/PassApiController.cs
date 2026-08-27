using System.Security.Claims;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MongoDB.Bson;

using ClaudeCoupons.BL;
using ClaudeCoupons.Models;

namespace ClaudeCoupons.Controllers
{
    // The two JSON calls the board's JS makes. Both sit behind the signup wall, so every
    // unlock and every outcome lands in the log with a user attached.
    [Authorize]
    [EnableRateLimiting("writes")]
    public class PassApiController(PassStore store) : Controller
    {
        private ObjectId CurrentUserId() =>
            ObjectId.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpPost("api/passes/{id}/unlock")]
        public async Task<IActionResult> Unlock(string id)
        {
            if (!ObjectId.TryParse(id, out var passId))
                return NotFound();
            var pass = await store.GetPass(passId);
            if (pass == null || pass.Status != PassStatus.Live)
                return NotFound(new { error = "This pass is no longer available." });

            var userId = CurrentUserId();
            var existing = await store.GetUserUnlocks(userId);
            if (!existing.ContainsKey(passId) &&
                await store.CountRecentUnlocks(userId) >= PassStore.UnlocksPerUserPerDay)
            {
                return StatusCode(429, new
                {
                    error = $"You've unlocked {PassStore.UnlocksPerUserPerDay} passes in the last 24 hours. Try one of those first, or come back tomorrow.",
                });
            }

            await store.RecordUnlock(passId, userId, store.HashIp(HttpContext.Connection.RemoteIpAddress?.ToString()));
            return Json(new { url = pass.Url });
        }

        [HttpPost("api/passes/{id}/outcome")]
        public async Task<IActionResult> Outcome(string id, [FromForm] string? result)
        {
            if (!ObjectId.TryParse(id, out var passId) || result == null)
                return NotFound();
            var recorded = await store.RecordOutcome(passId, CurrentUserId(), result);
            return recorded ? Json(new { ok = true }) : BadRequest(new { error = "Nothing to record." });
        }
    }
}
