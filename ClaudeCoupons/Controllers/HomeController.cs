using System.Security.Claims;
using System.Text.RegularExpressions;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MongoDB.Bson;

using ClaudeCoupons.BL;
using ClaudeCoupons.Models;

namespace ClaudeCoupons.Controllers
{
    public partial class HomeController(PassStore store) : Controller
    {
        // Accepts a full referral URL or a bare code; only the code survives into the database.
        [GeneratedRegex(@"^(?:https?://claude\.ai/referral/)?([A-Za-z0-9]{6,20})/?$")]
        private static partial Regex ReferralShape();

        private ObjectId CurrentUserId() =>
            ObjectId.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpGet("")]
        public async Task<IActionResult> Index()
        {
            ViewBag.board = await store.GetBoard();

            // A signed-in visitor sees links they already unlocked revealed straight on the
            // board instead of paying their daily cap again.
            ViewBag.myUnlocks = User.Identity?.IsAuthenticated == true
                ? await store.GetUserUnlocks(CurrentUserId())
                : new Dictionary<ObjectId, UnlockDoc>();

            return View("~/Views/Home/Index.cshtml");
        }

        [Authorize]
        [HttpGet("submit")]
        public IActionResult Submit() => View("~/Views/Home/Submit.cshtml");

        [Authorize]
        [HttpPost("submit")]
        [EnableRateLimiting("writes")]
        public async Task<IActionResult> SubmitPost(string? link)
        {
            var match = ReferralShape().Match(link?.Trim() ?? "");
            if (!match.Success)
            {
                ViewBag.error = "Paste your personal invite link, e.g. https://claude.ai/referral/AbCd123456 - nothing else is accepted.";
                return View("~/Views/Home/Submit.cshtml");
            }

            var pass = await store.SubmitPass(match.Groups[1].Value, CurrentUserId());
            if (pass == null)
            {
                ViewBag.error = "This pass link is already listed.";
                return View("~/Views/Home/Submit.cshtml");
            }

            return Redirect("/manage");
        }

        [Authorize]
        [HttpGet("manage")]
        public async Task<IActionResult> Manage()
        {
            ViewBag.listings = await store.GetUserListings(CurrentUserId());
            ViewBag.email = User.FindFirstValue(ClaimTypes.Email);
            return View("~/Views/Home/Manage.cshtml");
        }

        [Authorize]
        [HttpPost("manage/{id}/refresh")]
        public async Task<IActionResult> Refresh(string id)
        {
            if (ObjectId.TryParse(id, out var passId))
                await store.RefreshPass(passId, CurrentUserId());
            return Redirect("/manage");
        }

        [Authorize]
        [HttpPost("manage/{id}/exhausted")]
        public async Task<IActionResult> MarkExhausted(string id)
        {
            if (ObjectId.TryParse(id, out var passId))
                await store.SetOwnStatus(passId, CurrentUserId(), PassStatus.Exhausted);
            return Redirect("/manage");
        }

        [Authorize]
        [HttpPost("manage/{id}/remove")]
        public async Task<IActionResult> Remove(string id)
        {
            if (ObjectId.TryParse(id, out var passId))
                await store.SetOwnStatus(passId, CurrentUserId(), PassStatus.Removed);
            return Redirect("/manage");
        }

        [HttpGet("sitemap.xml")]
        public IActionResult Sitemap()
        {
            const string xml = """
                <?xml version="1.0" encoding="UTF-8"?>
                <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                  <url><loc>https://claudecoupons.com/</loc><changefreq>daily</changefreq></url>
                  <url><loc>https://claudecoupons.com/submit</loc><changefreq>monthly</changefreq></url>
                </urlset>
                """;
            return Content(xml, "application/xml");
        }
    }
}
