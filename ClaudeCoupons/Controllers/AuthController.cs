using System.Security.Claims;

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

using ClaudeCoupons.BL;

namespace ClaudeCoupons.Controllers
{
    // The signup wall. Both sides of the exchange pass through here: an email address, a
    // one-time magic link, a 90-day cookie. Proving the mailbox is the whole signup.
    public class AuthController(PassStore store, MagicLinkEmailSender emailSender) : Controller
    {
        private static readonly System.Text.RegularExpressions.Regex EmailShape =
            new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", System.Text.RegularExpressions.RegexOptions.Compiled);

        [HttpGet("signin")]
        public IActionResult SignInPage(string? returnUrl)
        {
            if (User.Identity?.IsAuthenticated == true)
                return LocalRedirect(SafeReturnUrl(returnUrl));
            ViewBag.returnUrl = SafeReturnUrl(returnUrl);
            return View("~/Views/Auth/SignIn.cshtml");
        }

        [HttpPost("signin")]
        [EnableRateLimiting("writes")]
        public async Task<IActionResult> SendLink(string? email, string? returnUrl, string? website)
        {
            // "website" is the honeypot field - humans never see it, bots fill it.
            if (!string.IsNullOrEmpty(website))
                return View("~/Views/Auth/LinkSent.cshtml");

            email = email?.Trim().ToLowerInvariant() ?? "";
            if (!EmailShape.IsMatch(email))
            {
                ViewBag.returnUrl = SafeReturnUrl(returnUrl);
                ViewBag.error = "That doesn't look like an email address.";
                return View("~/Views/Auth/SignIn.cshtml");
            }

            var token = await store.CreateLoginToken(email, SafeReturnUrl(returnUrl));
            var link = $"{Request.Scheme}://{Request.Host}/auth/{token}";
            await emailSender.Send(email, link);

            return View("~/Views/Auth/LinkSent.cshtml");
        }

        [HttpGet("auth/{token}")]
        public async Task<IActionResult> Magic(string token)
        {
            var loginToken = await store.ConsumeLoginToken(token);
            if (loginToken == null)
            {
                ViewBag.error = "This sign-in link is invalid or has expired. Request a fresh one.";
                ViewBag.returnUrl = "/";
                return View("~/Views/Auth/SignIn.cshtml");
            }

            await IssueCookie(loginToken.Email);
            return LocalRedirect(SafeReturnUrl(loginToken.ReturnUrl));
        }

        // ---- Google ----

        [HttpGet("signin/google")]
        public IActionResult Google(string? returnUrl) =>
            Challenge(new AuthenticationProperties
            {
                RedirectUri = "/signin/google/complete?returnUrl=" + Uri.EscapeDataString(SafeReturnUrl(returnUrl)),
            }, "Google");

        [HttpGet("signin/google/complete")]
        public async Task<IActionResult> GoogleComplete(string? returnUrl)
        {
            var external = await HttpContext.AuthenticateAsync("external");
            var email = external.Principal?.FindFirstValue(ClaimTypes.Email);
            await HttpContext.SignOutAsync("external");

            if (string.IsNullOrWhiteSpace(email))
            {
                ViewBag.error = "Google didn't hand back an email address. Try the email link instead.";
                ViewBag.returnUrl = SafeReturnUrl(returnUrl);
                return View("~/Views/Auth/SignIn.cshtml");
            }

            await IssueCookie(email);
            return LocalRedirect(SafeReturnUrl(returnUrl));
        }

        // Both doors end here: an email address proven either by mailbox or by Google becomes
        // the same UserDoc and the same 90-day cookie.
        private async Task IssueCookie(string email)
        {
            var user = await store.FindOrCreateUser(email);
            var identity = new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                ],
                CookieAuthenticationDefaults.AuthenticationScheme);
            await HttpContext.SignInAsync(new ClaimsPrincipal(identity),
                new AuthenticationProperties { IsPersistent = true });
        }

        [HttpPost("signout")]
        public async Task<IActionResult> SignOutPost()
        {
            await HttpContext.SignOutAsync();
            return Redirect("/");
        }

        private string SafeReturnUrl(string? returnUrl) =>
            !string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl) ? returnUrl : "/";
    }
}
