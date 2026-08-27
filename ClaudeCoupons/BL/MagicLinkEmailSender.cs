using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace ClaudeCoupons.BL
{
    // Sends the sign-in magic link via a raw SendGrid mail/send call. Without an API key
    // configured (development), the link is written to the log instead so the flow can be
    // walked locally end to end.
    public class MagicLinkEmailSender(IConfiguration config, ILogger<MagicLinkEmailSender> logger)
    {
        private static readonly HttpClient _http = new();

        public async Task<string?> Send(string toEmail, string link)
        {
            var apiKey = config["SendGrid:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                logger.LogInformation("Magic link for {Email}: {Link}", toEmail, link);
                return null;
            }

            var fromEmail = config["Email:From"] ?? "passes@claudecoupons.com";
            var fromName = config["Email:FromName"] ?? "Claude Coupons";
            var body = new
            {
                from = new { email = fromEmail, name = fromName },
                personalizations = new[]
                {
                    new { to = new[] { new { email = toEmail } }, subject = "Your sign-in link for claudecoupons.com" }
                },
                content = new object[]
                {
                    new
                    {
                        type = "text/plain",
                        value = $"Click to sign in to claudecoupons.com:\n\n{link}\n\nThe link works once and expires in 30 minutes. If you didn't request it, ignore this email.",
                    },
                    new
                    {
                        type = "text/html",
                        value = $"<p>Click to sign in to claudecoupons.com:</p><p><a href=\"{link}\">{link}</a></p><p>The link works once and expires in 30 minutes. If you didn&rsquo;t request it, ignore this email.</p>",
                    },
                },
            };

            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.sendgrid.com/v3/mail/send")
            {
                Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var response = await _http.SendAsync(request);
            if (response.IsSuccessStatusCode)
                return null;

            var error = $"SendGrid {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}";
            logger.LogError("Magic link send failed for {Email}: {Error}", toEmail, error);
            return error;
        }
    }
}
