export type WorkbenchCategory =
  | "ML & Research"
  | "Backend"
  | "Frontend"
  | "Cloud & Infra"
  | "Tools";

export interface WorkbenchItem {
  title: string;
  description: string;
  imgSrc: string;
  link: string;
  category: WorkbenchCategory;
}

// Simple-icons CDN for most brand logos — free, SVG, no asset management.
// URL format: https://cdn.simpleicons.org/<slug> or https://cdn.simpleicons.org/<slug>/<hex>
const sicon = (slug: string) => `https://cdn.simpleicons.org/${slug}`;
// Iconify is the fallback for icons that aren't in simple-icons or render incorrectly.
// URL format: https://api.iconify.design/<collection>:<name>.svg
const iconify = (slug: string) => `https://api.iconify.design/${slug}.svg`;

export const workbenchItems: WorkbenchItem[] = [
  // ------------------------------------------------------------------
  // ML & Research
  // ------------------------------------------------------------------
  {
    title: "PyTorch",
    description:
      "My primary framework for research. Every paper I've published, every model I've trained — including MEDiC, MaskDistill-PyTorch, and Cross-Scale MAE — runs on PyTorch.",
    imgSrc: sicon("pytorch"),
    link: "https://pytorch.org/",
    category: "ML & Research",
  },
  {
    title: "HuggingFace",
    description:
      "Pretrained backbones, datasets, and where I publish my own trained models and model cards. The first place I look when starting a new experiment.",
    imgSrc: iconify("logos:hugging-face-icon"),
    link: "https://huggingface.co/drkostas",
    category: "ML & Research",
  },
  {
    title: "CUDA",
    description:
      "GPU compute for training at scale. I live in nvidia-smi during research sprints and long training runs.",
    imgSrc: sicon("nvidia"),
    link: "https://developer.nvidia.com/cuda-zone",
    category: "ML & Research",
  },
  {
    title: "Jupyter",
    description:
      "Where every experiment starts. Quick prototyping, plotting, and sanity-checking model outputs before they graduate into scripts.",
    imgSrc: sicon("jupyter"),
    link: "https://jupyter.org/",
    category: "ML & Research",
  },
  {
    title: "Weights & Biases",
    description:
      "Experiment tracking, hyperparameter sweeps, and model checkpoints for every training run. The loss curves that keep me honest.",
    imgSrc: sicon("weightsandbiases"),
    link: "https://wandb.ai/",
    category: "ML & Research",
  },
  {
    title: "NumPy",
    description:
      "The backbone of every ML workflow. Data preprocessing, tensor math, and quick sanity checks before things become a Tensor.",
    imgSrc: sicon("numpy"),
    link: "https://numpy.org/",
    category: "ML & Research",
  },
  {
    title: "Pandas",
    description:
      "Daily driver for data exploration, cleaning, and feature engineering across research and production projects.",
    imgSrc: sicon("pandas"),
    link: "https://pandas.pydata.org/",
    category: "ML & Research",
  },
  {
    title: "scikit-learn",
    description:
      "Classical ML baselines and quick prototyping before I reach for deep learning. Still the cleanest API in ML.",
    imgSrc: sicon("scikitlearn"),
    link: "https://scikit-learn.org/",
    category: "ML & Research",
  },

  // ------------------------------------------------------------------
  // Backend
  // ------------------------------------------------------------------
  {
    title: "Python",
    description:
      "My primary language for research and backend work. Also how I've shipped 7 PyPI packages over the years.",
    imgSrc: sicon("python"),
    link: "https://www.python.org/",
    category: "Backend",
  },
  {
    title: "FastAPI",
    description:
      "Go-to for Python backends. Powers the APIs behind FleetSmart.ai and most of my side projects. Typed, fast, async by default.",
    imgSrc: sicon("fastapi"),
    link: "https://fastapi.tiangolo.com/",
    category: "Backend",
  },
  {
    title: "PostgreSQL",
    description:
      "The default database for every web product I build. Reliable, extensible, and I trust it with production data.",
    imgSrc: sicon("postgresql"),
    link: "https://www.postgresql.org/",
    category: "Backend",
  },
  {
    title: "Supabase",
    description:
      "Postgres + auth + storage + realtime in one package. I used it to ship ShiftMD fast without babysitting infra.",
    imgSrc: sicon("supabase"),
    link: "https://supabase.com/",
    category: "Backend",
  },
  {
    title: "Redis",
    description:
      "In-memory cache, queue, and rate limiter for when Postgres needs a little help. Used everywhere a millisecond matters.",
    imgSrc: sicon("redis"),
    link: "https://redis.io/",
    category: "Backend",
  },
  {
    title: "Pydantic",
    description:
      "Runtime data validation and type-safe models in Python. FastAPI's best friend and the thing that keeps my APIs honest.",
    imgSrc: sicon("pydantic"),
    link: "https://docs.pydantic.dev/",
    category: "Backend",
  },
  {
    title: "Poetry",
    description:
      "Python dependency and packaging management. Every PyPI package I publish goes through Poetry.",
    imgSrc: sicon("poetry"),
    link: "https://python-poetry.org/",
    category: "Backend",
  },

  // ------------------------------------------------------------------
  // Frontend
  // ------------------------------------------------------------------
  {
    title: "TypeScript",
    description:
      "Every line of frontend code I write is typed. Catches bugs at compile time so I don't ship them to production.",
    imgSrc: sicon("typescript"),
    link: "https://www.typescriptlang.org/",
    category: "Frontend",
  },
  {
    title: "Next.js",
    description:
      "Full-stack React framework behind FleetSmart.ai, ShiftMD, XpensAI, and Soma. App Router, server components, the whole thing.",
    imgSrc: sicon("nextdotjs"),
    link: "https://nextjs.org/",
    category: "Frontend",
  },
  {
    title: "React",
    description:
      "UI component library I reach for whenever I need interactive client-side work.",
    imgSrc: sicon("react"),
    link: "https://react.dev/",
    category: "Frontend",
  },
  {
    title: "Tailwind CSS",
    description:
      "Utility-first styling for every frontend I build. I haven't written a stylesheet from scratch in years.",
    imgSrc: sicon("tailwindcss"),
    link: "https://tailwindcss.com/",
    category: "Frontend",
  },
  {
    title: "Astro",
    description:
      "The framework powering this very site. Static by default, React islands where I need them, fast builds, minimal JS.",
    imgSrc: sicon("astro"),
    link: "https://astro.build/",
    category: "Frontend",
  },
  {
    title: "Framer Motion",
    description:
      "Production-grade animations for React. Behind every hover, scroll reveal, and sparkle trail you see on this portfolio.",
    imgSrc: sicon("framer"),
    link: "https://www.framer.com/motion/",
    category: "Frontend",
  },
  {
    title: "shadcn/ui",
    description:
      "Copy-paste, own-the-code React components. The UI primitives I reach for first when I start a new product.",
    imgSrc: sicon("shadcnui"),
    link: "https://ui.shadcn.com/",
    category: "Frontend",
  },

  // ------------------------------------------------------------------
  // Cloud & Infra
  // ------------------------------------------------------------------
  {
    title: "AWS",
    description:
      "S3, Lambda, ECS, and RDS for production workloads. My daily infrastructure for the day job and side projects.",
    imgSrc: iconify("logos:aws"),
    link: "https://aws.amazon.com/",
    category: "Cloud & Infra",
  },
  {
    title: "GCP",
    description:
      "Compute and storage for FleetSmart.ai's backend. Cloud Run, Cloud Storage, and Cloud SQL for the heavy lifting.",
    imgSrc: sicon("googlecloud"),
    link: "https://cloud.google.com/",
    category: "Cloud & Infra",
  },
  {
    title: "Docker",
    description:
      "Containerization for reproducible ML experiments, service deployments, and everything in between.",
    imgSrc: sicon("docker"),
    link: "https://www.docker.com/",
    category: "Cloud & Infra",
  },
  {
    title: "Kubernetes",
    description:
      "Orchestration when a single container isn't enough. Used for scaling inference services and batch training jobs.",
    imgSrc: sicon("kubernetes"),
    link: "https://kubernetes.io/",
    category: "Cloud & Infra",
  },
  {
    title: "Cloudflare",
    description:
      "CDN, DNS, Workers, and R2 storage. The edge layer sitting in front of most of my production workloads.",
    imgSrc: sicon("cloudflare"),
    link: "https://www.cloudflare.com/",
    category: "Cloud & Infra",
  },
  {
    title: "Vercel",
    description:
      "Where my Next.js apps and this portfolio get deployed. Preview URLs, edge functions, and zero-config deploys.",
    imgSrc: sicon("vercel"),
    link: "https://vercel.com/",
    category: "Cloud & Infra",
  },
  {
    title: "GitHub Actions",
    description:
      "CI/CD for all my repos. Tests, linting, builds, and deployments on every push.",
    imgSrc: sicon("githubactions"),
    link: "https://github.com/features/actions",
    category: "Cloud & Infra",
  },
  {
    title: "CircleCI",
    description:
      "CI/CD for my 7 PyPI packages. Runs the test matrix and publishes releases on version tags.",
    imgSrc: sicon("circleci"),
    link: "https://circleci.com/",
    category: "Cloud & Infra",
  },

  // ------------------------------------------------------------------
  // Tools
  // ------------------------------------------------------------------
  {
    title: "VS Code",
    description:
      "Primary editor for everything from research notebooks to production code. Extensions, debugging, git integration — the whole kit.",
    imgSrc: "/vscode_logo.png",
    link: "https://code.visualstudio.com/",
    category: "Tools",
  },
  {
    title: "Cursor",
    description:
      "VS Code with an AI pair programmer built in. I reach for it when I want Claude writing alongside me.",
    imgSrc: sicon("cursor"),
    link: "https://www.cursor.com/",
    category: "Tools",
  },
  {
    title: "Git",
    description:
      "Version control for all 59 of my GitHub repos. Obviously.",
    imgSrc: sicon("git"),
    link: "https://git-scm.com/",
    category: "Tools",
  },
  {
    title: "Obsidian",
    description:
      "Where I take notes on papers I read, meetings, and half-baked ideas that might become something.",
    imgSrc: "/obsidian_logo.png",
    link: "https://obsidian.md/",
    category: "Tools",
  },
  {
    title: "Linear",
    description:
      "Issue tracking and project planning for everything I ship. Keyboard-first, fast, and the opposite of Jira.",
    imgSrc: sicon("linear"),
    link: "https://linear.app/",
    category: "Tools",
  },
  {
    title: "Figma",
    description:
      "Design, wireframes, and the occasional quick mockup when I'm brainstorming a new feature or a layout.",
    imgSrc: sicon("figma"),
    link: "https://www.figma.com/",
    category: "Tools",
  },
];

export const WORKBENCH_CATEGORIES: WorkbenchCategory[] = [
  "ML & Research",
  "Backend",
  "Frontend",
  "Cloud & Infra",
  "Tools",
];
