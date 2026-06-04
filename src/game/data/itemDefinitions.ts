/**
 * Central item definitions — the single source of truth for every
 * item the player can collect. An item belongs to exactly one bag
 * pocket, so the giveItem flow can look the item up by id and route
 * it to the right pocket array in GameSave.
 *
 * Adding a new item:
 *   1. Pick an id and pocket.
 *   2. Drop an entry into ITEM_DEFINITIONS.
 *   3. Reference the id from wherever grants the item — a hidden item
 *      tile (hiddenItems.ts), an NPC gift, a step milestone, a
 *      questionnaire reward, etc.
 */

export type BagPocketId = "papers" | "blogs" | "keyItems" | "tms";

export interface ItemDef {
  /** Unique id — used for save persistence. */
  id: string;
  /** Display name shown in the bag and in pickup dialogs. */
  name: string;
  /** Which pocket this item lives in. */
  pocket: BagPocketId;
  /** Multi-line description for the bag's detail panel. */
  description: string;
  /** Optional URL — makes the item act like a link when USEd. */
  url?: string;
  /** Optional custom bag icon. Falls back to a pocket default. */
  icon?: string;
}

export const ITEM_DEFINITIONS: Record<string, ItemDef> = {
  // ── PAPERS pocket — research papers collected at the GYM ────
  "paper_medic": {
    id: "paper_medic",
    name: "MEDiC",
    pocket: "papers",
    description: "Medical CLIP distillation.\nVision-language transfer.",
    url: "https://scholar.google.com/citations?user=drkostas",
    icon: "/game/ui/bag/oran_berry.png",
  },
  "paper_maskdistill": {
    id: "paper_maskdistill",
    name: "MaskDistill",
    pocket: "papers",
    description: "PyTorch mask distillation\npaper.",
    url: "https://scholar.google.com/citations?user=drkostas",
    icon: "/game/ui/bag/master_ball.png",
  },
  "paper_wacv": {
    id: "paper_wacv",
    name: "Vision Paper",
    pocket: "papers",
    description: "Computer vision paper.\nAttention + transfer.",
    url: "https://scholar.google.com/citations?user=drkostas",
    icon: "/game/ui/bag/star_piece.png",
  },
  "paper_igarss": {
    id: "paper_igarss",
    name: "Remote Sensing Paper",
    pocket: "papers",
    description: "Geoscience and remote\nsensing applied research.",
    url: "https://scholar.google.com/citations?user=drkostas",
    icon: "/game/ui/bag/nugget.png",
  },
  "paper_chase": {
    id: "paper_chase",
    name: "Healthcare Paper",
    pocket: "papers",
    description: "ML applied to healthcare\nat scale.",
    url: "https://scholar.google.com/citations?user=drkostas",
    icon: "/game/ui/bag/stardust.png",
  },

  // ── BLOG POSTS pocket — stories shared by NPCs ───────────────
  "blog_first_post": {
    id: "blog_first_post",
    name: "Hello World",
    pocket: "blogs",
    description: "My very first blog post.\nEvery journey starts here.",
    url: "https://gkos.dev/blog",
    icon: "/game/ui/bag/tm_case.png",
  },
  "blog_phd_journey": {
    id: "blog_phd_journey",
    name: "PhD Journey",
    pocket: "blogs",
    description: "Reflections from the\nBredesen Center at UTK.",
    url: "https://gkos.dev/blog",
    icon: "/game/ui/bag/old_amber.png",
  },

  // ── KEY ITEMS pocket — world exploration rewards ────────────
  "key_resume": {
    id: "key_resume",
    name: "RESUME.PDF",
    pocket: "keyItems",
    description: "KOSTAS's CV.\nUSE to download the PDF.",
    url: "/resume.pdf",
    icon: "/game/ui/bag/aurora_ticket.png",
  },
  "key_github": {
    id: "key_github",
    name: "GITHUB.URL",
    pocket: "keyItems",
    description: "KOSTAS's GitHub:\nrepos, dotfiles, side projects.",
    url: "https://github.com/drkostas",
    icon: "/game/ui/bag/master_ball.png",
  },
  "key_linkedin": {
    id: "key_linkedin",
    name: "LINKEDIN.URL",
    pocket: "keyItems",
    description: "Professional profile\non LinkedIn.",
    url: "https://linkedin.com/in/drkostas",
    icon: "/game/ui/bag/amulet_coin.png",
  },
  "key_scholar": {
    id: "key_scholar",
    name: "SCHOLAR.URL",
    pocket: "keyItems",
    description: "Google Scholar.\nPapers and citations.",
    url: "https://scholar.google.com/citations?user=drkostas",
    icon: "/game/ui/bag/lucky_egg.png",
  },
  "key_huggingface": {
    id: "key_huggingface",
    name: "HUGGINGFACE.URL",
    pocket: "keyItems",
    description: "HuggingFace models\nand datasets.",
    url: "https://huggingface.co/drkostas",
    icon: "/game/ui/bag/oran_berry.png",
  },
  "tm_portfolio": {
    id: "tm_portfolio",
    name: "TM PORTFOLIO",
    pocket: "tms",
    description: "Awarded for completing\nthe portfolio questionnaire.",
    icon: "/game/ui/bag/tm_case.png",
  },
  "key_rock_potion": {
    id: "key_rock_potion",
    name: "ROCK POTION",
    pocket: "keyItems",
    description: "A POTION you found\nbeside a rock.",
    icon: "/game/ui/bag/potion.png",
  },
  "key_research_log": {
    id: "key_research_log",
    name: "RESEARCH LOG",
    pocket: "keyItems",
    description: "KOSTAS's personal journal.\nUSE to read entries.",
    icon: "/game/ui/bag/old_amber.png",
  },

  // ── TMs pocket — foundational starters + MART purchases ─────
  // STARTER TMs pre-loaded in the PC at the POKeMON CENTER on a
  // fresh save. These are the skills every ML engineer begins with
  // before buying higher-tier TMs from the MART (see StepMilestones
  // for the purchasable catalog).
  "tm_python": {
    id: "tm_python",
    name: "TM PYTHON",
    pocket: "tms",
    description: "The lingua franca of\nmachine learning.",
    icon: "/game/ui/bag/tm_case.png",
  },
  "tm_git": {
    id: "tm_git",
    name: "TM GIT",
    pocket: "tms",
    description: "Version control for every\nproject worth shipping.",
    icon: "/game/ui/bag/tm_case.png",
  },
  "tm_linux": {
    id: "tm_linux",
    name: "TM LINUX",
    pocket: "tms",
    description: "The operating system\nbehind every ML rig.",
    icon: "/game/ui/bag/tm_case.png",
  },
  // ── MART purchases — step-threshold catalog (StepMilestones) ──
  "tm_tailwind": {
    id: "tm_tailwind",
    name: "TM TAILWIND",
    pocket: "tms",
    description: "Utility-first CSS.\nWalked 250 steps.",
    icon: "/game/ui/bag/tm_case.png",
  },
  "tm_fastapi": {
    id: "tm_fastapi",
    name: "TM FASTAPI",
    pocket: "tms",
    description: "Python web framework.\nWalked 500 steps.",
    icon: "/game/ui/bag/pp_up.png",
  },
  "tm_nextjs": {
    id: "tm_nextjs",
    name: "TM NEXT.JS",
    pocket: "tms",
    description: "React meta-framework.\nWalked 1000 steps.",
    icon: "/game/ui/bag/pp_max.png",
  },
  "tm_docker": {
    id: "tm_docker",
    name: "TM DOCKER",
    pocket: "tms",
    description: "Containerization.\nWalked 1500 steps.",
    icon: "/game/ui/bag/fresh_water.png",
  },
  "tm_pytorch": {
    id: "tm_pytorch",
    name: "TM PYTORCH",
    pocket: "tms",
    description: "Deep learning framework.\nWalked 2000 steps.",
    icon: "/game/ui/bag/soda_pop.png",
  },
  "tm_aws": {
    id: "tm_aws",
    name: "TM AWS",
    pocket: "tms",
    description: "Cloud infrastructure.\nWalked 3000 steps.",
    icon: "/game/ui/bag/lemonade.png",
  },
  "tm_kubernetes": {
    id: "tm_kubernetes",
    name: "TM KUBERNETES",
    pocket: "tms",
    description: "Container orchestration.\nWalked 4000 steps.",
    icon: "/game/ui/bag/berry_juice.png",
  },
  "tm_terraform": {
    id: "tm_terraform",
    name: "TM TERRAFORM",
    pocket: "tms",
    description: "Infrastructure as code.\nWalked 6000 steps.",
    icon: "/game/ui/bag/lava_cookie.png",
  },
  "tm_system_design": {
    id: "tm_system_design",
    name: "TM SYSTEM DESIGN",
    pocket: "tms",
    description: "Architecture at scale.\nWalked 8000 steps.",
    icon: "/game/ui/bag/leftovers.png",
  },
};

/** Get a list of item definitions for a pocket. */
export function getItemsByPocket(pocket: BagPocketId): ItemDef[] {
  return Object.values(ITEM_DEFINITIONS).filter((i) => i.pocket === pocket);
}

/** Look up an item definition by id. Returns undefined if unknown. */
export function getItemDef(id: string): ItemDef | undefined {
  return ITEM_DEFINITIONS[id];
}

/** Display label for a pocket id. */
export const POCKET_LABELS: Record<BagPocketId, string> = {
  papers: "PAPERS",
  blogs: "BLOG POSTS",
  keyItems: "KEY ITEMS",
  tms: "TMs",
};
