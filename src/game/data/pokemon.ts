/**
 * Project → Pokemon mapping for the Pokedex.
 *
 * Each project from the portfolio is mapped to a "Pokemon" entry
 * with a Pokedex number, name, level, typing, and status.
 */

export type PokemonStatus = "caught" | "seen" | "unseen";

export interface PokedexEntry {
  /** Pokedex number (#001, #002, etc.) */
  number: number;
  /** Project name */
  name: string;
  /** Level — represents project complexity/impact */
  level: number;
  /** Dual typing (Pokemon style) */
  types: [string, string];
  /** Caught = shipped, Seen = contributed/WIP, Unseen = placeholder */
  status: PokemonStatus;
  /** Brief description */
  description: string;
  /** URL to the project (GitHub, demo, paper, etc.) */
  url?: string;
  /** Pokemon species name (for sprite: /game/ui/pokedex/sprites/NNN.png) */
  pokemon: string;
}

/**
 * Full Pokedex of Kostas's projects.
 * "Caught" = fully shipped/published.
 * "Seen" = work in progress or contribution.
 */
export const POKEDEX: PokedexEntry[] = [
  { number: 1,  name: "MEDiC",          level: 85, types: ["Psychic", "Dragon"],   status: "caught", pokemon: "Latias",    description: "CLIP distillation framework for medical imaging",       url: "https://github.com/drkostas/MEDiC" },
  { number: 2,  name: "FleetSmart.ai",  level: 72, types: ["Water", "Steel"],      status: "caught", pokemon: "Kyogre",    description: "Maritime AI platform for fleet optimization",           url: "https://fleetsmart.ai" },
  { number: 3,  name: "ShiftMD",        level: 68, types: ["Normal", "Fighting"],   status: "caught", pokemon: "Breloom",   description: "Medical shift scheduling optimizer",                    url: "https://github.com/drkostas/ShiftMD" },
  { number: 4,  name: "XpensAI",        level: 75, types: ["Electric", "Normal"],   status: "caught", pokemon: "Manectric", description: "AI-powered expense management",                         url: "https://github.com/drkostas/XpensAI" },
  { number: 5,  name: "MaskDistill",    level: 84, types: ["Psychic", "Dark"],      status: "caught", pokemon: "Absol",     description: "PyTorch knowledge distillation with masking",           url: "https://github.com/drkostas/MaskDistill-PyTorch" },
  { number: 6,  name: "Soma",           level: 65, types: ["Fighting", "Fairy"],    status: "caught", pokemon: "Medicham",  description: "Health metrics dashboard",                              url: "https://github.com/drkostas/Soma" },
  { number: 7,  name: "Cross-Scale MAE",level: 54, types: ["Dragon", "Flying"],     status: "caught", pokemon: "Salamence", description: "Cross-scale masked autoencoder for remote sensing" },
  { number: 8,  name: "HGG in RS",      level: 60, types: ["Ground", "Rock"],       status: "caught", pokemon: "Camerupt",  description: "High-quality generation guidance for remote sensing" },
  { number: 9,  name: "3D Fused LSGAN", level: 58, types: ["Ghost", "Psychic"],     status: "caught", pokemon: "Banette",   description: "3D fused latent-space GAN for medical imaging" },
  { number: 10, name: "ACUTE",          level: 70, types: ["Ice", "Steel"],         status: "caught", pokemon: "Glalie",    description: "Automated cardiac ultrasound evaluation" },
  { number: 11, name: "Cloud-DevOps",   level: 45, types: ["Electric", "Flying"],   status: "caught", pokemon: "Swellow",   description: "High-availability cloud deployment toolkit",            url: "https://github.com/drkostas/Cloud-DevOps" },
  { number: 12, name: "YAML Configs",   level: 42, types: ["Normal", "Poison"],     status: "caught", pokemon: "Seviper",   description: "PyPI package for YAML configuration management",       url: "https://pypi.org/project/yaml-config-wrapper/" },
  { number: 13, name: "Termcolor",      level: 38, types: ["Fire", "Normal"],       status: "caught", pokemon: "Torkoal",   description: "PyPI package for terminal color output",               url: "https://pypi.org/project/termcolor-logger/" },
  { number: 14, name: "Cross-Fetch",    level: 40, types: ["Water", "Normal"],      status: "caught", pokemon: "Wailord",   description: "PyPI package for cross-platform HTTP fetching",        url: "https://pypi.org/project/cross-fetch/" },
  { number: 15, name: "ElasticDB",      level: 44, types: ["Rock", "Normal"],       status: "caught", pokemon: "Aggron",    description: "PyPI package for Elasticsearch wrappers",              url: "https://pypi.org/project/elastic-db-wrapper/" },
  { number: 16, name: "CloudStore",     level: 43, types: ["Flying", "Normal"],     status: "caught", pokemon: "Pelipper",  description: "PyPI package for cloud storage abstraction",           url: "https://pypi.org/project/cloud-filemanager/" },
  { number: 17, name: "MySQL Wrapper",  level: 41, types: ["Steel", "Normal"],      status: "caught", pokemon: "Lairon",    description: "PyPI package for MySQL database operations",           url: "https://pypi.org/project/mysql-data-manager/" },
  { number: 18, name: "Email Sender",   level: 39, types: ["Fairy", "Normal"],      status: "caught", pokemon: "Delcatty",  description: "PyPI package for SMTP email sending",                  url: "https://pypi.org/project/fancy-emailer/" },
  { number: 19, name: "Accident Bot",   level: 50, types: ["Dark", "Steel"],        status: "caught", pokemon: "Mawile",    description: "Telegram bot for accident detection alerts",           url: "https://github.com/drkostas/accident-severity-bot" },
  { number: 20, name: "Insta Bot",      level: 48, types: ["Fairy", "Ghost"],       status: "caught", pokemon: "Sableye",   description: "Instagram automation bot framework",                   url: "https://github.com/drkostas/Instagram-Bot" },
  { number: 21, name: "Onoma Bot",      level: 46, types: ["Normal", "Ghost"],      status: "caught", pokemon: "Shedinja",  description: "Greek nameday notification bot",                       url: "https://github.com/drkostas/Onoma-Bot" },
  { number: 22, name: "HF Datasets",    level: 55, types: ["Dragon", "Normal"],     status: "caught", pokemon: "Flygon",    description: "Curated HuggingFace dataset collections",              url: "https://huggingface.co/drkostas" },
  { number: 23, name: "Py Template",    level: 35, types: ["Normal", "Ground"],     status: "caught", pokemon: "Trapinch",  description: "Python project template with CI/CD",                   url: "https://github.com/drkostas/python-project-template" },
  { number: 24, name: "DSE 512",        level: 52, types: ["Ice", "Psychic"],       status: "caught", pokemon: "Solrock",   description: "Data Science coursework and experiments",              url: "https://github.com/drkostas/Data-Science-Methods" },
  { number: 25, name: "Colorized KNN",  level: 47, types: ["Fire", "Psychic"],      status: "seen",   pokemon: "Claydol",   description: "Image colorization using K-nearest neighbors" },
  { number: 26, name: "RL Grid World",  level: 49, types: ["Electric", "Psychic"],  status: "seen",   pokemon: "Plusle",    description: "Reinforcement learning grid world experiments" },
  { number: 27, name: "Stereo Depth",   level: 51, types: ["Ground", "Flying"],     status: "seen",   pokemon: "Vibrava",   description: "Stereo vision depth estimation pipeline" },
  { number: 28, name: "iOS MovieDB",    level: 40, types: ["Bug", "Normal"],        status: "seen",   pokemon: "Volbeat",   description: "iOS movie database application" },
  { number: 29, name: "Eye in the Sky", level: 56, types: ["Flying", "Dark"],       status: "seen",   pokemon: "Altaria",   description: "Satellite imagery analysis system" },
  { number: 30, name: "Face Detector",  level: 53, types: ["Psychic", "Normal"],    status: "seen",   pokemon: "Kirlia",    description: "Real-time face detection pipeline" },
  { number: 31, name: "Portfolio v2",   level: 42, types: ["Fire", "Electric"],     status: "caught", pokemon: "Blaziken",  description: "This very site — Astro + Phaser Pokemon portfolio",    url: "https://gkos.dev" },
  // ── Boundary Pokemon — map blockers that register on first talk ──
  { number: 32, name: "LLM Trainer",    level: 90, types: ["Normal", "Psychic"],    status: "seen",   pokemon: "Snorlax",   description: "Long-running deep learning training infrastructure" },
  { number: 33, name: "Data Lake",      level: 80, types: ["Normal", "Ground"],     status: "seen",   pokemon: "Slaking",   description: "Large-scale data processing and ETL pipeline" },
  { number: 34, name: "Notebook Lab",   level: 30, types: ["Normal", "Grass"],      status: "seen",   pokemon: "Slakoth",   description: "Research sandbox for Jupyter experiments" },
  { number: 35, name: "Log Hounds",     level: 28, types: ["Dark", "Normal"],       status: "seen",   pokemon: "Poochyena", description: "Distributed log monitoring agents" },
];

/** Total projects with caught status */
export const POKEDEX_CAUGHT = POKEDEX.filter((p) => p.status === "caught").length;
/** Total projects with caught or seen status */
export const POKEDEX_SEEN = POKEDEX.filter((p) => p.status !== "unseen").length;
