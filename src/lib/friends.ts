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
    name: "InstaShare",
    url: "https://instashare.to",
    tag: "Developer tools",
    blurb:
      "Turns a Claude Code session into a link you can send someone, with a redaction pass first so your keys and local paths don't travel with it.",
  },
  {
    name: "BuildersHQ",
    url: "https://buildershq.net",
    tag: "Developer tools",
    blurb:
      "A VS Code extension that gives a distributed team a shared sense of presence - who is online, who is shipping, what actually moved today.",
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
