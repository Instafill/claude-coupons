import { kitcutUrl } from "@/lib/kitcut";

export interface BlogPostAuthor {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  url?: string;
}

export interface BlogFaq {
  q: string;
  a: string;
}

export interface BlogTableColumn {
  key: string;
  label: string;
}

export interface BlogTableRow {
  [key: string]: string;
}

export interface BlogImage {
  src: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
  /** The word before the caption: "Verified" (the default in a section), "Screenshot"... */
  label?: string;
}

/** A film played in the article. Also emitted as a VideoObject, so it can surface in
    video results; the poster is a local still, the file is the film's own web copy. */
export interface BlogVideo {
  title: string;
  /** What was typed to make it, quoted as far as it is known. */
  prompt: string;
  src: string;
  poster: string;
  /** Where it plays with its own page (and sound) - the film's page. */
  pageUrl: string;
  /** ISO 8601, e.g. PT30S. */
  duration: string;
  /** Shown beside the title: "0:30 · painted · made in 9 min". */
  meta: string;
  uploadDate: string;
}

export interface BlogTakeaway {
  mark: "yes" | "no";
  title: string;
  text: string;
}

export interface BlogCta {
  kicker?: string;
  title: string;
  text: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}

export interface BlogPostSection {
  id: string;
  h2: string;
  lead?: string;
  body?: string[];
  /** Paragraphs shown after the section's table or steps rather than before them. */
  bodyAfter?: string[];
  bullets?: string[];
  steps?: string[];
  /** The heading over a steps list. */
  stepsTitle?: string;
  images?: BlogImage[];
  videos?: BlogVideo[];
  /** A call to action boxed at the end of the section. */
  cta?: BlogCta;
  table?: {
    columns: BlogTableColumn[];
    rows: BlogTableRow[];
    caption?: string;
  };
  callout?: {
    type: "tip" | "warning" | "note" | "highlight";
    title: string;
    text: string;
  };
  subsections?: {
    h3: string;
    body: string[];
    bullets?: string[];
    images?: BlogImage[];
    callout?: {
      type: "tip" | "warning" | "note" | "highlight";
      title: string;
      text: string;
    };
  }[];
}

export interface BlogPost {
  slug: string;
  title: string;
  h1: string;
  metaDescription: string;
  summary: string;
  publishedAt: string;
  updatedAt: string;
  readingTime: string;
  category: string;
  tags: string[];
  author: BlogPostAuthor;
  keywords: string[];
  imageAlt: string;
  /** The share image (1200x630) and the Article schema's image; the site card otherwise. */
  image?: string;
  featured?: boolean;
  /** The pill beside the category. "Verified Active" when unset. */
  badge?: string;
  /** The TL;DR box. The first post's is hand-written in the page; later posts bring theirs. */
  takeaways?: BlogTakeaway[];
  faqHeading?: string;
  /** The closing box. The guest-pass one when unset. */
  cta?: BlogCta;
  sections: BlogPostSection[];
  faqs: BlogFaq[];
}

export const AUTHORS: Record<string, BlogPostAuthor> = {
  alex: {
    name: "Oleksandr G",
    role: "Founder & Developer @ ClaudeCoupons",
    bio: "Developer and creator of ClaudeCoupons. Tracking Anthropic API pricing, referral mechanics, and cloud startup credits.",
    avatar: "/logo-256.png",
    url: "https://x.com/ogamaniuk",
  },
};

// The Claude video guide's films: public films on kitcut.ai, each played from its own web
// copy (the files kitcut.ai's pages play). Prompts are quoted as far as the film page shows
// them; the "made in" times are the film pages' own.
const KITCUT_FILMS_BASE = "https://kitcutst.blob.core.windows.net/films";
const GUIDE_IMG = "/blog/claude-video";
function kitcutFilm(id: string, film: Omit<BlogVideo, "src" | "pageUrl">): BlogVideo {
  return {
    ...film,
    src: `${KITCUT_FILMS_BASE}/${id}/film_web.mp4`,
    pageUrl: `https://kitcut.ai/film/${id}?utm_source=claudecoupons&utm_medium=blog&utm_campaign=claude-video`,
  };
}

const CLAUDE_VIDEO_FILMS: BlogVideo[] = [
  kitcutFilm("studio-20260928-102317-awn3zx", {
    title: "Marisol - a restaurant opening ad",
    prompt:
      "A 30-second ad for the opening of Marisol, a new seafood restaurant by the harbour: fish from the morning's boats, cooked over a wood fire, served at a long table…",
    poster: `${GUIDE_IMG}/marisol-restaurant-ad.jpg`,
    duration: "PT30S",
    meta: "0:30 · painted · made in 9 min",
    uploadDate: "2026-09-28",
  }),
  kitcutFilm("studio-20260928-041445-2p46v3", {
    title: "Turing Complete - a game launch ad",
    prompt: 'Create a 10-second high-end advertisement for the Steam game "Turing Complete".',
    poster: `${GUIDE_IMG}/turing-complete-launch-ad.jpg`,
    duration: "PT10S",
    meta: "0:10 · hand-drawn · made in 13 min",
    uploadDate: "2026-09-28",
  }),
  kitcutFilm("studio-20260927-223145-5wo5i4", {
    title: "queensgame.io - a product ad",
    prompt:
      "…Show queensgame.io as a modern, addictive online logic puzzle game. Focus on a polished puzzle board, queen placement…",
    poster: `${GUIDE_IMG}/queensgame-product-ad.jpg`,
    duration: "PT10S",
    meta: "0:10 · hand-drawn, clean · made in 11 min",
    uploadDate: "2026-09-27",
  }),
  kitcutFilm("studio-20260927-061617-q6t772", {
    title: "Clamly - a brand values film",
    prompt: "create something for https://clamly.app to show Clamly values",
    poster: `${GUIDE_IMG}/clamly-brand-film.jpg`,
    duration: "PT30S",
    meta: "0:30 · hand-drawn · made in 15 min",
    uploadDate: "2026-09-27",
  }),
  kitcutFilm("studio-20260927-171047-mgkibw", {
    title: "Dell vs HP - an 8-minute business documentary",
    prompt:
      'An 8-minute hand-drawn documentary explainer titled "Dell Went Private. HP Split in Two. AI Picked a Winner." Two PC giants hit the same wall, made opposite bets…',
    poster: `${GUIDE_IMG}/dell-hp-documentary.jpg`,
    duration: "PT8M",
    meta: "8:00 · hand-drawn · made in 2 h 21 min",
    uploadDate: "2026-09-27",
  }),
  kitcutFilm("studio-20260927-084459-7xaoci", {
    title: "How a fuel cell works - a painted science film",
    prompt:
      "Create a visually stunning 30-second hand-painted scientific film explaining how a proton exchange membrane fuel cell works…",
    poster: `${GUIDE_IMG}/fuel-cell-explainer.jpg`,
    duration: "PT30S",
    meta: "0:30 · painted · made in 16 min",
    uploadDate: "2026-09-27",
  }),
  kitcutFilm("studio-20260927-033619-iucict", {
    title: "How a lever lifts a car - a blueprint explainer",
    prompt: "How a lever lets one person lift a car, drawn as a blueprint",
    poster: `${GUIDE_IMG}/lever-blueprint-explainer.jpg`,
    duration: "PT10S",
    meta: "0:10 · hand-drawn, blueprint · made in 12 min",
    uploadDate: "2026-09-27",
  }),
  kitcutFilm("studio-20260926-195810-6kj2uw", {
    title: "Pip the fox sees snow - a story",
    prompt: "Pip the fox sees snow for the first time.",
    poster: `${GUIDE_IMG}/pip-fox-snow.jpg`,
    duration: "PT20S",
    meta: "0:20 · hand-drawn, crayon · made in 14 min",
    uploadDate: "2026-09-26",
  }),
];

// KitCut is made by the people who run this site, so the guide says so before it praises
// anything, and every number in it is one kitcut.ai's own docs state.
const CLAUDE_VIDEO_GUIDE: BlogPost = {
  slug: "claude-video",
  title: "Claude Video: Make Videos with Claude Opus 5.5 (2026 Guide)",
  h1: "Claude video: how to make a finished film with Claude Opus 5.5",
  metaDescription:
    "Can Claude make videos? With KitCut, Claude Opus 5.5 writes, draws, narrates and scores a 1080p film from one sentence. Real examples, steps and prices.",
  summary:
    "Claude does not export a video file on its own - but with KitCut, Claude Opus 5.5 turns one sentence into a narrated, scored 1080p film. Eight real examples, how it works, how to use it from inside Claude, and what it costs.",
  publishedAt: "2026-09-28T18:00:00Z",
  updatedAt: "2026-09-28T18:00:00Z",
  readingTime: "11 min read",
  category: "Claude Video",
  tags: ["Claude video", "Opus 5.5", "KitCut", "AI video", "Claude animation", "MCP"],
  author: {
    ...AUTHORS.alex,
    role: "Maker of KitCut and ClaudeCoupons",
    bio: "Builds KitCut, the Claude video maker, and ClaudeCoupons. Writes about what Claude can make when it is given the right tools.",
  },
  keywords: [
    "claude video",
    "claude video maker",
    "claude video generator",
    "can claude make videos",
    "how to make a video with claude",
    "claude ai video",
    "opus 5.5 video",
    "claude opus 5.5 video",
    "claude animation",
    "claude animated video",
    "claude mcp video",
    "claude code video",
    "ai explainer video",
    "text to video claude",
    "kitcut",
  ],
  imageAlt: "Claude video: films made with Claude Opus 5.5 on KitCut",
  image: `${GUIDE_IMG}/og-claude-video.jpg`,
  featured: true,
  badge: "Hands-on guide",
  takeaways: [
    {
      mark: "yes",
      title: "Claude can make videos with KitCut:",
      text: "type one sentence; Claude Opus 5.5 writes, draws, animates, narrates and scores the film, and KitCut renders a 1920x1080 MP4.",
    },
    {
      mark: "yes",
      title: "Free to start:",
      text: "30 seconds of film every month with no card, and an invite link adds 2 more minutes.",
    },
    {
      mark: "yes",
      title: "Works inside Claude:",
      text: "add kitcut.ai/mcp as a custom connector and ask for a film mid-conversation - in Claude, Claude Code, ChatGPT or Grok.",
    },
    {
      mark: "no",
      title: "Not a video generator:",
      text: "no photoreal footage or real people moving - films are drawn or painted animation, in 16:9.",
    },
  ],
  faqHeading: "Claude video: frequently asked questions",
  cta: {
    title: "Make your first Claude video",
    text: "Type one sentence and watch Claude Opus 5.5 make the film. 30 seconds of film free every month, no card needed.",
    primary: { href: kitcutUrl("blog"), label: "Make a free Claude video →" },
    secondary: { href: "/kitcut-referral-code", label: "Get 2 extra minutes" },
  },
  sections: [
    {
      id: "can-claude-make-videos",
      h2: "Can Claude make videos?",
      lead: "Yes, with the right tool around it. On its own, Claude writes text and code; it does not hand you an MP4. KitCut is the missing half: it gives Claude Opus 5.5 a drawing engine, a narrator, an orchestra and a renderer, so one sentence comes back as a finished, narrated film.",
      body: [
        "That is a different thing from an AI video generator. Sora, Veo or Runway turn a prompt into moving pixels a few seconds at a time. On KitCut, Claude writes the whole film as a program - every drawing, camera move, word on screen and music cue - and KitCut renders it. So a film can run from 5 seconds to 8 minutes as one planned piece, with the picture, the narration and the music timed to each other, word by word.",
        "A disclosure before the praise: we built KitCut, so read this as the maker's guide. Everything below is what the product does today, shown with real films made on it, and the limits are listed as plainly as the strengths. KitCut is an independent product built on Claude; it is not made or endorsed by Anthropic.",
      ],
      images: [
        {
          src: `${GUIDE_IMG}/kitcut-home.jpg`,
          alt: "The KitCut home page: 'Type an idea. Get a Claude video.', the idea box, the look, the length slider and the Make the film button",
          caption: "kitcut.ai: every Claude video starts in the idea box. Pick a look and a length, and press Make the film.",
          width: 1440,
          height: 610,
          label: "Screenshot",
        },
      ],
    },
    {
      id: "claude-video-examples",
      h2: "Claude video examples: eight films, each from one prompt",
      lead: "Every film below was made on KitCut from the prompt under it, and none was edited afterwards - KitCut has no edit step. Press play; the small kitcut.ai mark on some is the Free plan's.",
      videos: CLAUDE_VIDEO_FILMS,
    },
    {
      id: "how-to-make-a-claude-video",
      h2: "How to make a Claude video in four steps",
      stepsTitle: "Make your first Claude video",
      steps: [
        "Open kitcut.ai and describe the film in the idea box: what it is about, who it is for, the tone, and anything it must say or show. One sentence is enough; up to 12,000 characters are allowed.",
        "Add pictures or voice notes if you have them - a logo, a product shot, a sketch or a spoken brief. Up to 6 pictures and 3 voice notes a film.",
        "Pick a look (hand-drawn or painted) and a length, then press Make the film. You sign in the first time, and nothing you typed is lost.",
        "Watch it being made. The film's page shows what Claude is doing and the stills it is checking, then plays the finished film. A 30-second film takes about 16 to 24 minutes once its turn comes.",
      ],
      callout: {
        type: "tip",
        title: "Write the idea like a brief",
        text: "Say who the film is for and what it must say. The voice, the music and the drawing style are Claude's choice, but you can ask for them in words - 'a calm female voice, solo piano, clean line art' - and Claude follows when it can.",
      },
      images: [
        {
          src: `${GUIDE_IMG}/kitcut-composer.webp`,
          alt: "The KitCut idea box with numbered red circles: the idea text, the + button for pictures, the microphone for voice notes, the look, the length slider and Make the film",
          caption: "The idea box: ① the idea, ② pictures, ③ voice notes, ④ the look, ⑤ the length and ⑥ Make the film.",
          width: 2408,
          height: 824,
          label: "Screenshot",
        },
        {
          src: `${GUIDE_IMG}/kitcut-making.webp`,
          alt: "A Claude video being made: the review sheet of stills Claude is checking, and the log headed What Claude is doing, circled in red",
          caption: "While Claude works: the stills it is reviewing, and its own notes under 'What Claude is doing'.",
          width: 2388,
          height: 2020,
          label: "Screenshot",
        },
        {
          src: `${GUIDE_IMG}/kitcut-film-page.webp`,
          alt: "A finished KitCut film's page: the video player circled in red, the making log, and the stats - made in 14:37, Claude 12:34, render 117 s, 41 turns",
          caption: "A finished film's page: the video, the making log and the stats. This one took 14 minutes 37 seconds from start to finish.",
          width: 2560,
          height: 2580,
          label: "Screenshot",
        },
      ],
    },
    {
      id: "how-claude-makes-the-film",
      h2: "What Claude Opus 5.5 does inside every film",
      lead: "KitCut does not ask a model to imagine pixels. Claude directs the film, writes it as code and checks its own work; KitCut supplies the voice, the instruments and the renderer.",
      table: {
        columns: [
          { key: "step", label: "Step" },
          { key: "what", label: "What happens" },
        ],
        rows: [
          {
            step: "Direction",
            what: "Claude decides who the film is for and its mood, then the drawing or painting style, the narrator's voice and the music - and holds the film to looking professionally made for that audience.",
          },
          {
            step: "Narration",
            what: "Claude writes the script. Gemini's text-to-speech records it, and every word is timed so the picture can change on it.",
          },
          {
            step: "Picture",
            what: "Claude draws and animates every scene in code on KitCut's sketch engine - or, in the painted look, has the scenes painted and animates the paintings.",
          },
          {
            step: "Review",
            what: "Claude renders stills and a motion check from across the film, looks at them and fixes what is wrong, up to twice.",
          },
          {
            step: "Music and sound",
            what: "Claude writes an instrumental score and the sound effects; KitCut plays them on sampled instruments and keeps the music under the voice.",
          },
          {
            step: "Render",
            what: "Every frame is drawn and encoded to a 1920x1080 MP4 - 60 frames a second on paid plans, 30 on Free - with subtitles.",
          },
        ],
        caption: "From kitcut.ai/docs/how-films-are-made.",
      },
      bodyAfter: [
        "Because the film is code, the words on screen are typed text, spelled exactly as written. A logo you attach is placed as it is, not re-imagined. And a character Claude drew is kept, so it can come back in your next film with the same look, voice and music.",
      ],
    },
    {
      id: "two-looks",
      h2: "Two looks: hand-drawn Claude animation or painted scenes",
      body: [
        "Hand-drawn: Claude draws every frame in code. The default crayon style has lines that boil slightly from frame to frame, off-register fills and paper grain; the clean style is crisp editorial line art with flat fills. There are ten grounds, from paper and kraft to chalkboard and blueprint.",
        "Painted: an image model paints the scenes from Claude's descriptions, and Claude animates them - camera moves across each painting, cross-fades on spoken words, and words drawn on top. Styles range from 1950s travel poster and ink wash to claymation and watercolour.",
        "You pick the look; Claude picks everything inside it, and your idea can steer it in plain words.",
      ],
      images: [
        {
          src: `${GUIDE_IMG}/kitcut-look-drawn.webp`,
          alt: "A hand-drawn KitCut still in the crayon style: Pip, an orange fox in a blue scarf, by an igloo among snowy pines",
          caption: "Hand-drawn, crayon style: Pip the fox.",
          width: 1280,
          height: 720,
          label: "Still",
        },
        {
          src: `${GUIDE_IMG}/kitcut-look-drawn-clean.webp`,
          alt: "A hand-drawn KitCut still in the clean style on a blueprint ground: a lever lifting a car, labelled rises, pivot, push and long end",
          caption: "Hand-drawn, clean style on the blueprint ground.",
          width: 1280,
          height: 720,
          label: "Still",
        },
        {
          src: `${GUIDE_IMG}/kitcut-look-painted.webp`,
          alt: "A painted KitCut still: glowing particles over a dark painted landscape, with the word proton drawn on top by Claude",
          caption: "Painted: the scene is painted, the word on top is drawn.",
          width: 1280,
          height: 720,
          label: "Still",
        },
      ],
    },
    {
      id: "claude-video-inside-claude",
      h2: "Make a Claude video without leaving Claude",
      lead: "KitCut is also an MCP server, so you can ask Claude for a film in the middle of a conversation and get the link back in the chat.",
      stepsTitle: "Connect KitCut to Claude",
      steps: [
        "In Claude on the web, desktop or phone, open Settings → Connectors → Add custom connector.",
        "Name it KitCut and paste https://kitcut.ai/mcp. Press Connect, sign in to KitCut and press Allow.",
        "Ask for a film - for example, 'Make a 30-second hand-drawn explainer of how our onboarding works.' Claude confirms the idea, length and look, starts the film and gives you its link straight away.",
        "Claude checks on the film and tells you when it is ready; the finished film plays on its own page.",
      ],
      bodyAfter: [
        "In Claude Code it is one command - claude mcp add --transport http kitcut https://kitcut.ai/mcp - then /mcp to sign in. The same address works in ChatGPT, Grok and Meta AI.",
        "Films made from a chat use the same credits as the website, and they are link-only unless you ask for them to be public.",
      ],
      images: [
        {
          src: `${GUIDE_IMG}/kitcut-connect.webp`,
          alt: "The kitcut.ai/connect page: the MCP server address with a Copy button, and setup steps for Claude, Claude Code, ChatGPT, Grok and other apps",
          caption: "kitcut.ai/connect: the server address, and the steps for each app.",
          width: 1800,
          height: 1010,
          label: "Screenshot",
        },
      ],
    },
    {
      id: "claude-video-vs-ai-video-generators",
      h2: "Claude video vs AI video generators (Sora, Veo, Runway)",
      table: {
        columns: [
          { key: "what", label: "" },
          { key: "gen", label: "AI video generators" },
          { key: "kitcut", label: "KitCut (Claude video)" },
        ],
        rows: [
          { what: "What the model makes", gen: "pixels, a clip at a time", kitcut: "a program: drawings, animation, text, sound cues" },
          { what: "Length", gen: "usually seconds per clip", kitcut: "one film of 5 seconds to 8 minutes" },
          { what: "Words on screen", gen: "often misspelled or warped", kitcut: "typed text, spelled exactly as written" },
          { what: "Your logo", gen: "re-imagined by the model", kitcut: "the picture you attached, placed as it is" },
          { what: "The same character", gen: "drifts between clips", kitcut: "kept as code and reused in later films" },
          { what: "Narration and music", gen: "usually added with other tools", kitcut: "written, recorded and mixed with the film, subtitles included" },
          { what: "Style", gen: "photoreal or painterly motion", kitcut: "hand-drawn animation, or painted scenes with camera moves" },
        ],
        caption: "Summarised from kitcut.ai/docs/compared.",
      },
      bodyAfter: [
        "Where a generator wins: photorealistic motion, real-looking people moving, live-action shots. KitCut does none of those, by design.",
        "Where a Claude video wins: explainers whose words must be right, product and brand films that must show the real logo, series whose characters must come back, and anything longer than a clip.",
      ],
    },
    {
      id: "what-to-make",
      h2: "What people make with Claude video",
      bullets: [
        "Launch and product ads - a Steam game, a web puzzle game, a restaurant opening.",
        "Explainers and lessons - a fuel cell, a lever, how bees make honey - where every label has to be right.",
        "Brand films - a company's values in 30 seconds, from nothing but its web address.",
        "Long-form business documentaries - up to 8 minutes on Pro, like the Dell vs HP film above.",
        "Stories and series - Pip the fox came back for three films with the same scarf, look and voice.",
        "Versions in other languages - the narration follows the language of your idea; words on screen cover Latin and Cyrillic alphabets.",
      ],
      images: [
        {
          src: `${GUIDE_IMG}/pip-fox-series.jpg`,
          alt: "Three stills of Pip the fox from three KitCut films: in the snow with a snowman, building a sandcastle at the sea, and flying a kite",
          caption: "One character, three films: Pip sees snow, goes to the sea and learns to fly. The fox is drawn in code and kept, so it comes back unchanged.",
          width: 1920,
          height: 357,
          label: "Series",
        },
        {
          src: `${GUIDE_IMG}/kitcut-project-cast.webp`,
          alt: "A KitCut Studio project's Cast tab listing the characters its episodes share",
          caption: "For a series, a Studio project keeps its own brief, characters and pictures for every episode.",
          width: 2560,
          height: 1600,
          label: "Screenshot",
        },
      ],
    },
    {
      id: "pricing",
      h2: "How much does a Claude video cost?",
      table: {
        columns: [
          { key: "plan", label: "Plan" },
          { key: "price", label: "Price a month" },
          { key: "film", label: "Film a month" },
          { key: "longest", label: "Longest film" },
        ],
        rows: [
          { plan: "Free", price: "$0", film: "30 seconds", longest: "1 minute" },
          { plan: "Standard", price: "$12 to $319", film: "2 to 60 minutes", longest: "1 minute" },
          { plan: "Pro", price: "$45 to $849", film: "10 to 240 minutes", longest: "8 minutes" },
        ],
        caption: "kitcut.ai/pricing, September 2026.",
      },
      bodyAfter: [
        "One credit is one second of film, and a film uses at least 30. Credits are held when a film starts and charged only when it is finished; a failed or stopped film gives them back.",
        "Paid films are 60 frames a second and carry no KitCut mark. Pro makes films up to 8 minutes and goes first when the studio is busy.",
      ],
      cta: {
        kicker: "Free minutes",
        title: "Get 2 extra minutes of Claude video",
        text: "Sign up through a KitCut invite link from our board and your first finished film adds 2 minutes of film for you - and for the person who shared it. No queue: every link is shown in full.",
        primary: { href: "/kitcut-referral-code", label: "See KitCut invite links →" },
        secondary: { href: kitcutUrl("blog"), label: "Make a free film" },
      },
    },
    {
      id: "limits",
      h2: "What KitCut doesn't do (yet)",
      bullets: [
        "No photorealistic motion or real people moving: films are drawn or painted animation.",
        "16:9 only for now - no vertical Shorts, Reels or TikToks.",
        "No editing a finished film: make a new one, and its characters, look, voice and music can come back.",
        "Instrumental music only - no songs or sung vocals.",
        "No camera footage or video uploads: pictures are the only visual material a film takes.",
        "No web research: Claude makes the film from your idea and your attachments.",
      ],
      bodyAfter: [
        "Saying this plainly is the point. A Claude video is a film written and drawn by Claude, not a clip from a video model - which is exactly why its words, logos and characters stay right.",
      ],
    },
  ],
  faqs: [
    {
      q: "Can Claude make videos?",
      a: "Not on its own - Claude writes text and code, not video files. With KitCut, Claude Opus 5.5 writes, draws, animates, narrates and scores a film, and KitCut renders it as a 1920x1080 MP4. You can use it on kitcut.ai or from inside Claude through the KitCut connector.",
    },
    {
      q: "Is there a Claude video generator?",
      a: "KitCut is a Claude video maker rather than a video generator: Claude Opus 5.5 writes the whole film as a program - drawings, camera moves, words on screen and music - and KitCut renders it. That is why words are spelled right and characters stay the same, and also why it does not make photorealistic footage.",
    },
    {
      q: "How long does it take to make a Claude video?",
      a: "Once its turn comes: about 9 to 14 minutes for a 10-second film, 16 to 24 minutes for 30 seconds, 26 to 39 minutes for a minute, and 1.5 to 2.4 hours for 8 minutes. The film's page shows what Claude is doing the whole time.",
    },
    {
      q: "Is KitCut free?",
      a: "To start, yes: 30 seconds of film every month with no card, which makes one 30-second film. Free films are 30 frames a second, carry a small kitcut.ai mark and end with a 3-second closing. An invite link adds 2 minutes.",
    },
    {
      q: "How long can a Claude video be?",
      a: "From 5 seconds up to 8 minutes, in steps of 5 seconds. Free and Standard make films up to 1 minute; Pro makes them up to 8 minutes.",
    },
    {
      q: "Which AI models make the film?",
      a: "Claude Opus 5.5 does the direction, the script, every drawing and animation, the music and sound-effect scores, and the review of its own frames. Gemini's text-to-speech is the narrator, Meta's Muse paints the scenes of painted films, and Whisper times each spoken word. There is no video-generation model and no stock footage.",
    },
    {
      q: "Can I use Claude videos commercially?",
      a: "Yes. KitCut's terms allow commercial use of the films you make.",
    },
    {
      q: "What languages can the narration be in?",
      a: "The narration follows the language your idea is written in, or the one it asks for, and the narrator speaks many languages. Words on screen are limited to Latin and Cyrillic alphabets.",
    },
    {
      q: "Can I make vertical videos for TikTok or YouTube Shorts?",
      a: "Not yet. Films are 16:9 landscape, 1920x1080.",
    },
    {
      q: "Is KitCut made by Anthropic?",
      a: "No. KitCut is an independent product built on Claude by the people who run ClaudeCoupons. Anthropic does not make or endorse it.",
    },
  ],
};

export const BLOG_POSTS: BlogPost[] = [
  CLAUDE_VIDEO_GUIDE,
  {
    slug: "claude-promo-codes",
    title: "Claude AI Promo Codes & Discounts: What Actually Works (September 2026)",
    h1: "Claude AI Promo Codes & Discounts: The Verified 2026 Guide",
    metaDescription:
      "Looking for a Claude promo code? We verified every discount and active promotion. Here is the honest truth, the new $250 Cloud Session credit, Opus 5.5 resets, and 7-day Pro guest passes.",
    summary:
      "Anthropic does not offer standard promo codes at checkout, but active in-app promotions are live right now: a $250 Cloud Session credit, Opus 5.5 free limit resets, 7-day Pro guest passes, and $5,000+ in AWS Bedrock credits.",
    publishedAt: "2026-09-01T08:00:00Z",
    updatedAt: "2026-09-25T17:30:00Z",
    readingTime: "10 min read",
    category: "Guides & Discounts",
    tags: [
      "Claude AI",
      "Promo Codes",
      "Cloud Sessions",
      "Claude Code",
      "Opus 5.5",
      "Anthropic",
      "Claude Pro",
      "AWS Bedrock",
    ],
    author: AUTHORS.alex,
    keywords: [
      "claude promo code",
      "claude ai promo code",
      "claude cloud session credits",
      "claude $250 credit",
      "claude opus 5.5 reset",
      "claude promo codes",
      "claude coupon code",
      "claude discount",
      "claude free credits",
      "claude pro promo code",
      "claude code pass",
      "claude for startups",
      "claude aws credits",
      "claude promo code reddit",
    ],
    imageAlt: "Claude AI Promo Codes and Active Discounts Guide",
    featured: true,
    sections: [
      {
        id: "status-matrix",
        h2: "Active Claude Discounts & Promotions (September 2026)",
        lead: "Before spending an hour trying dead codes on aggregator sites, here is the fact-checked status of every Claude offer, in-app promotion, and credit program active right now.",
        table: {
          columns: [
            { key: "deal", label: "Deal / Program" },
            { key: "target", label: "Who It's For" },
            { key: "value", label: "Real Value" },
            { key: "status", label: "Status & Expiry" },
          ],
          rows: [
            {
              deal: "Promo Code at Checkout",
              target: "Anyone buying Claude Pro or Team",
              value: "$0 (Checkout has no coupon field)",
              status: "❌ Does not exist",
            },
            {
              deal: "Claude Cloud Session Credits",
              target: "Existing Pro and Max subscribers",
              value: "$250 bonus credit for Cloud Sessions",
              status: "✅ Active (Claim by Oct 7, 2026)",
            },
            {
              deal: "Opus 5.5 Free Limit Reset",
              target: "Pro and Max users hitting weekly caps",
              value: "Free usage reset to explore Opus 5.5",
              status: "✅ Active (Expires Oct 22, 2026)",
            },
            {
              deal: "Claude Guest Passes",
              target: "New users wanting Claude Pro / Code",
              value: "7 free days of full Claude Pro ($0)",
              status: "✅ Active (Community Exchange)",
            },
            {
              deal: "Usage Credits Volume Discount",
              target: "Pro and Max users needing extra tokens",
              value: "Up to 30% off additional usage credits",
              status: "✅ Active (In-app billing option)",
            },
            {
              deal: "Claude Credit Through AWS",
              target: "Startups & developers on AWS",
              value: "$5,000+ in AWS Activate credits for Bedrock",
              status: "✅ Active (Via AWS Bedrock)",
            },
            {
              deal: "Claude for Startups",
              target: "Early-stage founders building on Claude",
              value: "Direct API credits & priority rate limits",
              status: "✅ Active (Anthropic Program)",
            },
            {
              deal: "Claude for Nonprofits",
              target: "501(c)(3)s, K-12 schools, rural health",
              value: "Team plan at $8/user/mo (60-68% off)",
              status: "✅ Active (Via Goodstack)",
            },
            {
              deal: "Annual Billing Discount",
              target: "All Pro and Team subscribers",
              value: "15% - 20% off monthly subscription",
              status: "✅ Active (Standard billing option)",
            },
            {
              deal: "Fable 5 $100 Usage Credit",
              target: "Pro & Team Standard subscribers",
              value: "$100 one-time transition credit",
              status: "⏳ Expired (Closed Aug 2, 2026)",
            },
          ],
          caption:
            "Verified from live Claude.ai settings dashboards, official Stripe checkout sessions, and AWS Bedrock foundation model pricing.",
        },
      },
      {
        id: "the-truth-about-promo-codes",
        h2: "The Honest Truth About Claude Checkout Promo Codes",
        body: [
          "If you search Google, Reddit, or coupon portals for 'Claude promo code' or 'Claude AI coupon code', you will encounter dozens of sites advertising strings like 'CLAUDE50', 'FALLSAVE20', or 'ANTHROPIC25'.",
          "Here is the reality: Anthropic's checkout page does not have a promo code or coupon field. Claude uses Stripe for subscription billing, and the promo code input has been explicitly disabled across all customer-facing checkout sessions.",
          "Anthropic's own support documentation confirms this in plain English: 'Our Support team cannot issue one-off discounts or coupons.' Any coupon website claiming to have an exclusive 50% discount code for Claude Pro is deceptive.",
        ],
        callout: {
          type: "warning",
          title: "Beware of Coupon Scams",
          text: "Never download browser extensions or provide credit card credentials to third-party sites promising 'unlocked Claude promo codes'. If a site asks you to complete surveys or install software to reveal a code, it is a data-harvesting scam.",
        },
      },
      {
        id: "official-in-app-promos",
        h2: "Live In-App Promotions: $250 Cloud Session Credit & Opus 5.5 Resets",
        lead: "While standard checkout codes don't exist, Anthropic does run direct in-app promotional grants. Right now, there are two major promotions active on Claude.ai that competitors haven't reported yet:",
        subsections: [
          {
            h3: "1. The $250 Cloud Session Bonus Credit (Claim by October 7, 2026)",
            body: [
              "Anthropic has officially launched Cloud Sessions for Claude Code. A cloud session runs your coding agent in a secure, isolated remote environment, allowing you to close your laptop while Claude executes terminal tasks, runs tests, and opens pull requests on your GitHub repository.",
              "To accelerate adoption, Anthropic is offering existing Claude Pro and Claude Max subscribers a promotional $250 bonus credit for cloud sessions, applied directly on top of regular plan limits.",
              "To claim it: navigate to Settings → Usage inside your Claude.ai account. Look for the gift box banner: 'Claim a $250 bonus credit for cloud sessions, on top of your plan limits'.",
            ],
            bullets: [
              "Eligibility: Active Claude Pro and Max subscribers.",
              "Claim Deadline: Must be claimed by 11:59 PM PDT on October 7, 2026.",
              "Credit Expiry: Claimed credits remain valid through 11:59 PM PST on November 4, 2026.",
              "How to use: Connect your GitHub account, choose a repository, and launch a Cloud Session (such as the Default Cloud Environment). Usage burns down from the $250 credit first before counting against regular plan limits.",
              "Restriction: Credits apply exclusively to Cloud Sessions and are not eligible for Projects or Routines.",
            ],
            images: [
              {
                src: "/blog/claude-cloud-session-modal-250.jpg",
                alt: "Claude.ai $250 Cloud Session Promotional Credit Modal",
                caption:
                  "The official $250 Cloud Session promotional modal in Claude.ai settings, active through October 7, 2026.",
              },
              {
                src: "/blog/claude-cloud-session-credits-applied.jpg",
                alt: "Cloud session credits balance showing $249 of $250 left",
                caption:
                  "Verified Cloud Session credit balance ($249 of $250 left, expiring November 4) inside Settings → Usage.",
              },
              {
                src: "/blog/claude-code-cloud-environment.jpg",
                alt: "Claude Code running in Default Cloud Environment on GitHub repo",
                caption:
                  "Claude Code executing in the Default Cloud Environment connected to GitHub, powered by the $250 cloud credit.",
              },
            ],
          },
          {
            h3: "2. Opus 5.5 Free Usage Limit Reset (Expires October 22, 2026)",
            body: [
              "With the release of Opus 5.5, Anthropic introduced a special exploration concession for heavy users.",
              "If you are an active subscriber approaching your weekly limit (such as 95%+ of your weekly cap), Anthropic provides a dedicated hourglass reset button under Settings → Usage: 'Get extra wiggle room to explore Opus 5.5. Expires Oct 22. [Reset for free]'.",
              "Clicking 'Reset for free' instantly refreshes your usage envelope without requiring you to wait until the scheduled Saturday reset or purchase extra credits.",
            ],
            images: [
              {
                src: "/blog/claude-usage-limits-reset.jpg",
                alt: "Claude.ai usage settings showing Opus 5.5 Reset for free button",
                caption:
                  "Settings → Usage showing both the $250 Cloud Session bonus banner and the Opus 5.5 free limit reset.",
              },
            ],
          },
          {
            h3: "3. Up to 30% Off on Usage Credits",
            body: [
              "For teams that exhaust their base plan allocations, Anthropic now allows subscribers to purchase add-on Usage Credits directly in the dashboard.",
              "A volume discount of 'Up to 30% off' is currently available when purchasing credits in higher tiers, enabling uninterrupted sessions without needing to upgrade to higher-tier enterprise contracts.",
            ],
          },
        ],
      },
      {
        id: "the-real-solution-guest-passes",
        h2: "The #1 Free Solution for Individuals: Claude Guest Passes",
        body: [
          "If you are not an existing subscriber and want to use Claude Pro without paying upfront, Anthropic's official referral mechanism is the Claude Code and Cowork Guest Pass.",
          "Every active Claude Pro and Claude Max subscriber holds a recurring allotment of personal guest pass invite links. When shared, each pass grants someone new to paid Claude 7 full days of Claude Pro for $0.",
          "This includes full access to Claude Code, Cowork, higher message limits, and flagship models like Claude 3.5 Sonnet, Claude 3.7, and Opus 5.5. Because most subscribers let their passes sit idle and expire, ClaudeCoupons.com operates a free community exchange.",
          "Subscribers donate their spare passes, and anyone can take a number in our automated wave queue. When a wave opens, you unlock a verified pass link, activate your 7 days directly on claude.ai, and report whether it worked.",
        ],
        callout: {
          type: "tip",
          title: "Unlock 7 Free Days of Claude Pro",
          text: "You do not need to hunt through Twitter or Reddit hoping for an unexpired pass. Take a number on our live Claude board, and as passes are listed, you unlock a personal link directly.",
        },
        steps: [
          "Take a number on the ClaudeCoupons.com homepage using your email address.",
          "When your wave opens, unlock a live guest pass to reveal its personal claude.ai referral link.",
          "Open the link on claude.ai and register your account. The 7-day Pro trial activates directly on Anthropic's servers.",
          "Come back to the board and tap 'It worked!'. This helps keep our community queue fast, clean, and 100% accurate.",
        ],
      },
      {
        id: "startup-cloud-credits",
        h2: "Startup & Developer Credits: $5,000 to $25,000+",
        lead: "If you are a developer, founder, or building a product on Claude's API, you can obtain thousands of dollars in legitimate credits through official cloud and accelerator programs.",
        subsections: [
          {
            h3: "1. Claude Credits via AWS Bedrock ($5,000 - $100,000)",
            body: [
              "Anthropic foundation models are fully hosted and accessible on Amazon Bedrock. Because Bedrock is a native AWS service, AWS Activate credits apply directly to Claude API token consumption.",
              "Early-stage startups can apply for AWS Activate Founders ($1,000 - $5,000 in credits) with zero institutional funding required. Startups associated with approved accelerators or incubators can receive up to $100,000.",
              "If you run Claude through Bedrock's API endpoint, your usage is billed against your AWS Activate credit balance before touching any credit card.",
            ],
            bullets: [
              "AWS Activate Founders: $1,000 - $5,000 for bootstrapped companies.",
              "AWS Activate Portfolio: Up to $100,000 for VC/accelerator-backed startups.",
              "Valid for Anthropic Claude tokens via Amazon Bedrock runtime.",
            ],
          },
          {
            h3: "2. Claude for Startups (Anthropic Direct)",
            body: [
              "Anthropic operates its own native startup initiative. The program grants free first-party Claude API credits and priority rate limit tiers to early-stage teams building on Claude.",
              "Unlike many accelerator programs, VC backing is not strictly required, though teams must demonstrate an active product under development and have been founded within the last four years.",
              "Note: Anthropic's native startup credits are valid exclusively through the first-party Claude Console API (api.anthropic.com) and cannot be transferred to AWS Bedrock or Google Cloud.",
            ],
          },
          {
            h3: "3. Google Cloud for Startups (Gemini & Vertex AI)",
            body: [
              "Google Cloud offers between $2,000 and $100,000 in cloud credits for startups. Claude models are accessible via Vertex AI Model Garden, allowing founders holding Google Cloud credits to tap Anthropic models under their credit envelope.",
            ],
          },
        ],
      },
      {
        id: "nonprofit-and-education",
        h2: "Claude for Nonprofits, Teachers & Academic Labs",
        lead: "Anthropic provides several structured discount tracks for social impact organizations, academic researchers, and educators.",
        subsections: [
          {
            h3: "Claude for Nonprofits ($8/user/month)",
            body: [
              "For registered 501(c)(3) organizations, international charities, and qualifying mission-based clinics, Anthropic slashes the price of the Claude Team plan from the standard $20–$25 down to just $8 per user per month for organizations with under 20 seats.",
              "Eligibility verification is processed smoothly through Anthropic's nonprofit validation partner, Goodstack. Larger nonprofit deployments can negotiate custom terms through Anthropic's enterprise social impact team.",
            ],
          },
          {
            h3: "Claude Corps Fellowship ($150M Program)",
            body: [
              "Announced in mid-2026, the Claude Corps is Anthropic's $150 million initiative that embeds trained AI specialists inside qualifying nonprofits for 12 months. Fellows receive an $85,000 salary with benefits covered, and the host nonprofit receives a $10,000 implementation grant alongside up to $2,500 in Claude software licenses and API credits.",
            ],
          },
          {
            h3: "Discounted Team Plan for Scientific Research Labs",
            body: [
              "Principal Investigators (PIs) at accredited academic institutions and nonprofit scientific labs can enroll in Anthropic's discounted research lab program. Labs with under 75 members can be verified directly by the PI.",
              "Eligible scientific domains include biomedicine, physics, chemistry, computer science, and mathematics. In addition to lower seat costs, participants receive access to Anthropic's dedicated Claude Science workspace.",
            ],
          },
          {
            h3: "AI for Science Research Grants",
            body: [
              "Individual academic researchers can apply for direct Claude API research credits through the AI for Science program. Applications are reviewed on the first Monday of every month. Credits apply to first-party API workloads exploring scientific problems.",
            ],
          },
        ],
      },
      {
        id: "how-to-lower-claude-bills",
        h2: "4 Structural Ways to Cut Your Claude Costs Today",
        lead: "Even if you do not qualify for startup or nonprofit programs, you can dramatically lower what you spend on Claude by leveraging these four native levers.",
        subsections: [
          {
            h3: "1. Annual Billing (15% - 20% Instant Savings)",
            body: [
              "Switching from monthly to annual billing provides an immediate recurring discount without needing any coupon code:",
              "Claude Pro: $17/month billed annually ($200/year upfront) vs. $20/month billed monthly — an instant 15% discount.",
              "Claude Team: $20/user/month billed annually vs. $25/user/month monthly — a 20% savings per seat.",
            ],
          },
          {
            h3: "2. Model Tier Optimization (Up to 10x Cost Reduction)",
            body: [
              "If you use Claude via API or API-driven developer tools, routing queries to the right model tier is the single most powerful cost-cutting lever in AI engineering.",
              "Claude Haiku 3.5 / 4.5: ~$1.00 per million input tokens / $5.00 output.",
              "Claude Sonnet 3.5 / 3.7: ~$3.00 per million input tokens / $15.00 output.",
              "Claude Opus 5 / 5.5: ~$15.00 per million input tokens / $75.00 output.",
              "Routing routine summarization, data extraction, or classification to Haiku rather than Opus reduces your token bill by 15x instantly.",
            ],
          },
          {
            h3: "3. Anthropic Prompt Caching (90% Off Input Tokens)",
            body: [
              "Anthropic's native Prompt Caching allows you to cache long system prompts, documentation files, or codebase contexts. Cache hits receive a 90% discount on input tokens and cut latency by up to 80%.",
              "For developer tools, agentic workflows, and document analysis, prompt caching turns a $100 API bill into a $10 bill.",
            ],
          },
          {
            h3: "4. Message Batches API (50% Off Everything)",
            body: [
              "If your workload does not require immediate sub-second responses (e.g., nightly batch data processing, bulk code refactoring, content moderation), Anthropic's Message Batches API cuts both input and output pricing in half (50% off standard rates) with results delivered within 24 hours.",
            ],
          },
        ],
      },
    ],
    faqs: [
      {
        q: "What is the new $250 Claude Cloud Session credit?",
        a: "Anthropic is currently offering active Claude Pro and Max subscribers a promotional $250 bonus credit to use in Cloud Sessions for Claude Code. It allows your coding agent to run in a secure cloud environment connected to GitHub. It must be claimed in Settings → Usage by 11:59 PM PDT on October 7, 2026, and expires November 4, 2026.",
      },
      {
        q: "How does the Opus 5.5 free limit reset work?",
        a: "If you are approaching your weekly usage limit on Claude.ai, Anthropic has an active promotion running through October 22, 2026, offering a free reset button under Settings → Usage to give subscribers extra wiggle room to explore Opus 5.5.",
      },
      {
        q: "Is there a working Claude promo code for checkout in September 2026?",
        a: "No. Anthropic does not issue standard coupon codes or promo codes, and the Claude checkout screen has no promo code box. For new users, the only official way to try Claude Pro for free without paying upfront is through an unredeemed Claude Guest Pass.",
      },
      {
        q: "How does a Claude Guest Pass work?",
        a: "Claude Pro and Max subscribers receive personal guest pass referral links. Each pass gives a new user 7 free days of Claude Pro with Claude Code and Cowork included. On ClaudeCoupons.com, subscribers list their extra passes so they don't go to waste, and you can unlock one through our queue.",
      },
      {
        q: "Can startups get free Claude credits?",
        a: "Yes. Startups can obtain $1,000 to $100,000 in AWS Activate credits that cover Claude token usage on Amazon Bedrock, or apply directly to the official Claude for Startups program for first-party API credits and priority rate limits.",
      },
      {
        q: "Is there a student or education discount for Claude?",
        a: "Anthropic does not offer an individual student discount code. However, institutions can sign up for 'Claude for Higher Education', and K-12 educators can access 'Claude for Teachers'. For individual students, the permanently free Claude tier is available with no payment details required, or you can use a 7-day guest pass.",
      },
      {
        q: "How much is the Claude for Nonprofits discount?",
        a: "Qualifying 501(c)(3) nonprofits, public K-12 schools, and community healthcare providers can get Claude Team for $8 per user per month (compared to the regular $20-$25/mo), verified through Goodstack for organizations with fewer than 20 seats.",
      },
      {
        q: "Do coupon codes on RetailMeNot or Reddit work for Claude?",
        a: "No. Aggregator sites display fake or expired strings ('CLAUDE20', 'NEWUSER') to harvest search traffic and affiliate cookies. Stripe checkout on claude.ai has no promo code entry field whatsoever.",
      },
      {
        q: "What is the cheapest way to pay for Claude Pro?",
        a: "Choose annual billing. Paying annually costs $17/month ($200/year upfront) instead of $20/month monthly, saving 15% immediately.",
      },
      {
        q: "How do I share my extra Claude guest passes?",
        a: "If you have an active Claude Pro or Max subscription, run `/passes` in Claude Code or open your Claude account settings to copy your personal referral link. You can submit it to ClaudeCoupons.com to help another developer learn and build.",
      },
    ],
  },
];

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getRecentPosts(limit = 3, excludeSlug?: string): BlogPost[] {
  return getAllPosts()
    .filter((p) => p.slug !== excludeSlug)
    .slice(0, limit);
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function getAuthorInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .toUpperCase();
}
