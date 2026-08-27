// Node.js 24 c-ares defaults to 127.0.0.1 if system DNS isn't detected, which breaks
// the mongodb+srv lookup. Runs via --require so it applies to all threads.
const dns = require("node:dns");
if (dns.getServers().join(",") === "127.0.0.1") {
  const override = process.env.DNS_SERVERS;
  dns.setServers(override ? override.split(",") : ["1.1.1.1", "8.8.8.8"]);
}
