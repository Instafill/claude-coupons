// The reciprocal links page. Ordered by how much a Claude Code user landing here is likely
// to care, not alphabetically - the developer tools go first because that is who visits.
export interface Friend {
  name: string;
  url: string;
  tag: string;
  blurb: string;
}

export const FRIENDS: Friend[] = [
  {
    name: "KitCut",
    url: "https://kitcut.ai",
    tag: "Claude video",
    blurb:
      "Launch a YouTube channel and Claude makes the videos. Pick a niche, get finished episodes (script, animation, voice-over, music) with titles and thumbnails, published to your channel on a schedule.",
  },
  {
    name: "Mister Blocks",
    url: "https://misterblocks.com",
    tag: "LEGO AI",
    blurb:
      "LEGO AI for the bin of loose bricks: snap a photo and it suggests builds made only from the pieces you have, with 3D step-by-step instructions. You can also just ask it for a model. Free.",
  },
  {
    name: "VideoMakers",
    url: "https://videomakers.io/",
    tag: "AI video",
    blurb:
      "A directory of AI video creators from X and Threads: see what each one makes and the tools they use, then hire one for your project.",
  },
  {
    name: "InstaShare",
    url: "https://instashare.to",
    tag: "Developer tools",
    blurb:
      "Turns a Claude Code session into a link you can send someone, with a redaction pass first so your keys and local paths don't travel with it.",
  },
  {
    name: "BuildersHQ",
    url: "https://buildershq.net",
    tag: "Data MCP",
    blurb:
      "One MCP server for the numbers builders look up: keyword volumes, ideas and ad forecasts, your sites on Google Search Console and Bing, site traffic, and YouTube and app store stats, for Claude or any assistant that speaks MCP.",
  },
  {
    name: "Instafill.ai",
    url: "https://instafill.ai",
    tag: "Document automation",
    blurb:
      "Fills PDF and Word forms with AI, built for teams that process the same paperwork a few hundred times a month.",
  },
  {
    name: "Copilot.us",
    url: "https://copilot.us",
    tag: "AI apps",
    blurb:
      "A bundle of small, focused AI apps - PDF work, job search, writing - on one subscription, rather than one tool that claims to do all of it.",
  },
  {
    name: "Resume Copilot",
    url: "https://resumecopilot.net",
    tag: "Job search",
    blurb:
      "Resume building and parsing aimed at people mid-career-change, plus the parsing library that sits underneath it.",
  },
  {
    name: "Who Is Growing",
    url: "https://whoisgrowing.com",
    tag: "Newsletter",
    blurb:
      "A weekend newsletter on which AI companies are actually growing, measured in traffic rather than funding announcements.",
  },
  {
    name: "Hipa.ai",
    url: "https://hipa.ai",
    tag: "Clinical research",
    blurb:
      "Everything between a Google search and a screening visit: patients find trials they qualify for, and research sites get applicants who match the protocol.",
  },
  {
    name: "Sprinkles Stories",
    url: "https://sprinklesstories.com",
    tag: "Bedtime stories",
    blurb:
      "Illustrated bedtime stories written for one particular child - their name, their world, a new one each night.",
  },
  {
    name: "Collaborator",
    url: "https://collaborator.pro/",
    tag: "Marketing",
    blurb:
      "A marketplace pairing advertisers with publishers for sponsored posts and placements.",
  },
];

// The site-wide footer's "Friends" block: short labels, Mister Blocks first. KitCut has its
// own footer line already, so it is not repeated here.
export const FOOTER_FRIENDS: { name: string; url: string; label: string }[] = [
  { name: "Mister Blocks", url: "https://misterblocks.com", label: "LEGO AI build ideas" },
  { name: "InstaShare", url: "https://instashare.to", label: "share a Claude Code session" },
  { name: "BuildersHQ", url: "https://buildershq.net", label: "SEO and traffic data MCP" },
  { name: "VideoMakers", url: "https://videomakers.io", label: "hire an AI video creator" },
  { name: "Who Is Growing", url: "https://whoisgrowing.com", label: "AI growth newsletter" },
  { name: "Instafill.ai", url: "https://instafill.ai", label: "AI form filling" },
];

// The home page's "From our friends" strip. Worded for someone who came here for Claude Code.
export const HOME_FRIENDS: { name: string; url: string; line: string }[] = [
  {
    name: "Mister Blocks",
    url: "https://misterblocks.com",
    line: "LEGO AI from your own bricks: photograph the pile, get a model you can build tonight, step by step in 3D.",
  },
  {
    name: "InstaShare",
    url: "https://instashare.to",
    line: "Send a Claude Code session to a teammate as one link, with API keys and local paths scrubbed out.",
  },
  {
    name: "BuildersHQ",
    url: "https://buildershq.net",
    line: "Give Claude your Search Console, keyword and traffic numbers through a single MCP server.",
  },
  {
    name: "Who Is Growing",
    url: "https://whoisgrowing.com",
    line: "A weekend read on which AI companies are gaining real traffic, not just funding.",
  },
];
