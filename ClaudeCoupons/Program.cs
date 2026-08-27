using System.Threading.RateLimiting;

using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

using ClaudeCoupons.BL;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews(options =>
    // Every non-GET is a form post or a fetch from our own pages, so validate everywhere and
    // let the JSON endpoints pass the token in a header.
    options.Filters.Add(new AutoValidateAntiforgeryTokenAttribute()));
builder.Services.AddAntiforgery(options => options.HeaderName = "X-CSRF-TOKEN");

// Local config (gitignored) carries the Google client secret in development.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true);

var auth = builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "cc_auth";
        options.LoginPath = "/signin";
        options.ExpireTimeSpan = TimeSpan.FromDays(90);
        options.SlidingExpiration = true;
        // The board's fetch calls need a status they can react to, not a redirect into HTML.
        options.Events.OnRedirectToLogin = context =>
        {
            if (context.Request.Path.StartsWithSegments("/api"))
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            else
                context.Response.Redirect(context.RedirectUri);
            return Task.CompletedTask;
        };
    })
    // Short-lived holding cookie for the Google handshake; AuthController maps the Google
    // identity onto our own user document and main cookie, then discards this one.
    .AddCookie("external", options =>
    {
        options.Cookie.Name = "cc_ext";
        options.ExpireTimeSpan = TimeSpan.FromMinutes(10);
    });

var googleClientId = builder.Configuration["Google:ClientId"];
if (!string.IsNullOrWhiteSpace(googleClientId))
{
    auth.AddGoogle(options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = builder.Configuration["Google:ClientSecret"] ?? "";
        options.SignInScheme = "external";
    });
}

builder.Services.AddSingleton<PassStore>();
builder.Services.AddSingleton<MagicLinkEmailSender>();

// One modest bucket per IP for the write endpoints (sign-in emails, submissions, unlocks).
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("writes", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(10) }));
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// First run on an empty database lists our own referral link so the board has something on it.
await app.Services.GetRequiredService<PassStore>()
    .Seed(app.Configuration["Seed:Code"], app.Configuration["Seed:Email"]);

app.Run();
