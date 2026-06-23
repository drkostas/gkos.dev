export type ProjectCategory = "Machine Learning" | "Products" | "Tools" | "Fun";

export interface Project {
  slug: string;
  name: string;
  image: string;
  description: string;
  tags: string[];
  category: ProjectCategory;
  featured?: boolean;
  source_code?: string;
  demo?: string;
  live?: string;
  scholar?: string;
  pypi?: string;
  /** When this project was added to the site. Optional — if missing, the RSS
   *  feed falls back to the site-launch date so the item still appears. */
  addedAt?: Date;
}

export const projects: Project[] = [
  // ---- Machine Learning ----
  {
    slug: "explore",
    name: "ExPLoRe",
    image: "/projects/explore-hero.png",
    description:
      "Official PyTorch implementation of the ECCV 2026 ExPLoRe paper. Repurposes Soft-MoE dispatch weights as learned, per-patch loss coefficients for multi-objective masked image modeling — loss-coupling lets gradients flow through dispatch to the router for content-dependent specialization. ViT-Base + CLIP-B/16 teacher hits 80.6% linear probe and 85.3% finetune on ImageNet-1K.",
    tags: ["PyTorch", "Self-Supervised", "Soft-MoE", "MIM", "CLIP", "Computer-Vision", "ECCV-2026"],
    category: "Machine Learning",
    featured: true,
    source_code: "https://github.com/aicip/ExPLoRe",
  },
  {
    slug: "medic",
    name: "MEDiC",
    image: "https://i.imgur.com/R6FkX4x.png",
    description:
      "Official PyTorch implementation of MEDiC: Multi-objective Exploration of Distillation from CLIP. Combines token distillation, CLS alignment, and pixel reconstruction with Evolved Part Masking. Achieves 85.07% finetuning and 73.92% k-NN on ImageNet-1K.",
    tags: ["PyTorch", "Self-Supervised", "CLIP", "MIM", "Computer-Vision", "HuggingFace"],
    category: "Machine Learning",
    featured: true,
    source_code: "https://github.com/aicip/MEDiC",
    demo: "https://huggingface.co/drkostas/MEDiC-ViT-Base",
  },
  {
    slug: "cross-scale-mae",
    name: "Cross-scale MAE",
    image: "https://i.imgur.com/3zery4d.png",
    description:
      "Official code for the paper 'Cross-Scale MAE: A Tale of Multi-Scale Exploitation in Remote Sensing'. Self-supervised learning for multi-scale geospatial imagery.",
    tags: ["PyTorch", "MIM", "Computer-Vision"],
    category: "Machine Learning",
    source_code: "https://github.com/aicip/Cross-Scale-MAE",
    scholar:
      "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=b___QQ8AAAAJ&authuser=1&citation_for_view=b___QQ8AAAAJ:d1gkVwhDpl0C",
  },
  {
    slug: "maskdistill-pytorch",
    name: "MaskDistill-PyTorch",
    image: "https://i.imgur.com/skFXu8Z.png",
    description:
      "First open PyTorch reproduction of MaskDistill with pre-trained weights. Reproduces 84.8% finetuning accuracy (paper: 85.3%), with full evaluation suite: semantic segmentation, object detection, k-NN, and linear probe.",
    tags: ["PyTorch", "Self-Supervised", "CLIP", "Computer-Vision", "HuggingFace"],
    category: "Machine Learning",
    source_code: "https://github.com/drkostas/MaskDistill-PyTorch",
    demo: "https://huggingface.co/drkostas/MaskDistill-ViT-Base",
  },
  {
    slug: "minecraft-ai",
    name: "Minecraft AI",
    image: "https://i.imgur.com/rH7S0M9.png",
    description:
      "A Reinforcement Learning agent that learns how to solve maze missions in Minecraft.",
    tags: ["PyTorch", "Reinforcement-Learning", "Minecraft"],
    category: "Machine Learning",
    source_code: "https://github.com/drkostas/Minecraft-AI",
  },
  {
    slug: "3d-semantic-segmentation",
    name: "3D Semantic Segmentation",
    image: "https://i.imgur.com/NtIvxWG.png",
    description: "Semantic Segmentation with Transformers on 3D Medical Images.",
    tags: ["PyTorch", "OpenCV", "SegFormer", "Semantic-Segmentation", "Medical-Imaging"],
    category: "Machine Learning",
    source_code: "https://github.com/drkostas/3D-Semantic-Segmentation",
  },
  {
    slug: "bert-qa",
    name: "BERT Question Answering",
    image: "https://i.imgur.com/dw21deK.png",
    description: "BERT-based question answering / reading comprehension methods on Rinehart Novels.",
    tags: ["PyTorch", "SpaCy", "HuggingFace", "Transformers", "BERT"],
    category: "Machine Learning",
    source_code: "https://github.com/drkostas/Bert-Question-Answering",
  },
  {
    slug: "accident-severity-prediction",
    name: "Accident Severity Prediction",
    image: "https://i.imgur.com/3w7SKLt.png",
    description: "Predicting the severity of car accidents from various attributes.",
    tags: ["Pandas", "Scipy", "Bayesian-Optimization", "XGBoost", "Neural-Network"],
    category: "Machine Learning",
    source_code: "https://github.com/drkostas/accident-severity-prediction",
  },
  {
    slug: "covid-vaccination-prediction",
    name: "COVID-19 Vaccination Prediction",
    image: "https://i.imgur.com/uXxzBBC.png",
    description: "Simultaneous Time Series Forecasting on the global COVID-19 Daily Vaccinations.",
    tags: ["Tensorflow", "LSTMs", "Multivariate-Time-Series"],
    category: "Machine Learning",
    source_code: "https://github.com/drkostas/covid19-vaccinations-predict",
  },
  {
    slug: "instagram-likes-prediction",
    name: "Instagram Likes Prediction",
    image: "https://i.imgur.com/siwQMhc.png",
    description: "First attempt on predicting the likes a photo will get on Instagram.",
    tags: ["Tensorflow", "OpenCV", "Instagram", "Scraper", "CNN"],
    category: "Machine Learning",
    source_code: "https://github.com/drkostas/Insta-Likes-Predict",
  },
  {
    slug: "rl-value-iteration",
    name: "RL Value Iteration",
    image: "https://i.imgur.com/v0s5gPx.png",
    description: "Implementation of value iteration algorithm for calculating an optimal MDP policy.",
    tags: ["Markov-Decision-Process", "Value-Iteration", "RL"],
    category: "Machine Learning",
    source_code: "https://github.com/drkostas/RL-Value-Iteration",
  },

  // ---- Products ----
  {
    slug: "gkos-dev",
    name: "gkos.dev (this site)",
    image: "/projects/gkos-dev-hero.png",
    description:
      "The personal portfolio + blog you're on right now. Astro + Tailwind + React islands + Supabase + PostHog. Built to ship fast, stay light, and own its own analytics.",
    tags: ["Astro", "Tailwind", "React", "Supabase", "PostHog", "Vercel"],
    category: "Products",
    source_code: "https://github.com/drkostas/gkos.dev",
    live: "https://gkos.dev",
  },
  {
    slug: "hevy2garmin",
    name: "Hevy → Garmin Sync",
    image: "/projects/hevy2garmin-hero.png",
    description:
      "Web tool that pulls strength workouts from Hevy and writes them into Garmin Connect with exercise names, sets, reps, weights, HR overlay, and calorie estimation. Solves a real gap in both apps' APIs. 36 stars, 109 forks — the most-forked project I have.",
    tags: ["Python", "FastAPI", "Garmin", "Hevy", "OAuth"],
    category: "Products",
    source_code: "https://github.com/drkostas/hevy2garmin",
    demo: "https://hevy2garmin-demo.gkos.dev",
  },
  {
    slug: "fleetsmart",
    name: "FleetSmart.ai",
    image: "/projects/fleetsmart-hero.png",
    description:
      "AI-powered maritime decision engine. Helps shipowners make profitable positioning decisions: which vessel goes where, when to reposition, how to bid on cargo. Role: technical lead on a contract build — backend, LLM agent layer, data pipelines, cloud infra. Closed-source (commercial product), live in production with paying customers.",
    tags: ["FastAPI", "Next.js", "GCP", "LLM", "Agents", "PostgreSQL"],
    category: "Products",
    live: "https://fleetsmart.ai",
  },
  {
    slug: "shiftmd",
    name: "ShiftMD",
    image: "https://i.imgur.com/Q4ZNPZS.png",
    description:
      "Intelligent shift scheduling system for medical departments using constraint programming optimization.",
    tags: ["Next.js", "Python", "OR-Tools", "Supabase"],
    category: "Products",
  },
  {
    slug: "xpensai",
    name: "XpensAI",
    image: "https://i.imgur.com/cAq97ow.png",
    description:
      "AI-powered expense management platform with automated receipt scanning, OCR, and intelligent categorization.",
    tags: ["Python", "AWS", "Azure", "GPT-4o", "Serverless"],
    category: "Products",
    live: "https://xpensai.com",
  },
  {
    slug: "soma",
    name: "Soma",
    image: "https://i.imgur.com/QUZHpLd.png",
    description:
      "Personal health and fitness dashboard aggregating data from Garmin, Strava, and Hevy into a unified analytics view.",
    tags: ["Python", "Next.js", "Garmin", "Strava"],
    category: "Products",
    featured: true,
    source_code: "https://github.com/drkostas/soma",
    demo: "https://soma-demo.gkos.dev",
  },

  // ---- Tools (PyPI) ----
  {
    slug: "python-search-engine",
    name: "Python Search Engine",
    image: "https://i.imgur.com/skFXu8Z.png",
    description:
      "A search engine for the Gutenberg Project archive, written in Python with a Flask front-end. Inverted-index lookup, ranked retrieval, query suggestions.",
    tags: ["Python", "Flask", "IR", "Search"],
    category: "Tools",
    source_code: "https://github.com/drkostas/python_search_engine",
    live: "https://search.gkos.dev",
  },
  {
    slug: "garmin-auth",
    name: "Garmin Auth",
    image: "https://i.imgur.com/KGOsaKq.png",
    description:
      "Self-healing Garmin Connect OAuth authentication. Handles the complex SSO flow (OAuth1 to OAuth2), automatic token refresh, and rate limit recovery.",
    tags: ["PyPi", "Garmin", "OAuth", "Python", "authentication"],
    category: "Tools",
    source_code: "https://github.com/drkostas/garmin-auth",
    pypi: "https://pypi.org/project/garmin-auth/",
  },
  {
    slug: "high-sql",
    name: "High SQL",
    image: "https://i.imgur.com/Sx43htM.png",
    description: "A high-level SQL command utility. Currently only MySQL is supported.",
    tags: ["PyPi", "MySQL", "CircleCI", "wrapper"],
    category: "Tools",
    source_code: "https://github.com/drkostas/high-sql",
    pypi: "https://pypi.org/project/high-sql/",
  },
  {
    slug: "cloud-filemanager",
    name: "Cloud File Manager",
    image: "https://i.imgur.com/TWD42kg.png",
    description: "A high-level filemanager utility for cloud services. Currently only Dropbox is supported.",
    tags: ["PyPi", "Dropbox", "CircleCI", "wrapper"],
    category: "Tools",
    source_code: "https://github.com/drkostas/cloud-filemanager",
    pypi: "https://pypi.org/project/cloud-filemanager/",
  },
  {
    slug: "yaml-wrapper",
    name: "YAML Wrapper",
    image: "https://i.imgur.com/98sBFjF.png",
    description: "A YAML configuration wrapper.",
    tags: ["PyPi", "CircleCI", "yaml", "configuration", "wrapper"],
    category: "Tools",
    source_code: "https://github.com/drkostas/yaml-config-wrapper",
    pypi: "https://pypi.org/project/yaml-config-wrapper/",
  },
  {
    slug: "color-logger",
    name: "Color Logger",
    image: "https://i.imgur.com/4LumI32.png",
    description: "A logger with text formatting using termcolor.",
    tags: ["PyPi", "CircleCI", "logger", "termcolor"],
    category: "Tools",
    source_code: "https://github.com/drkostas/termcolor-logger",
    pypi: "https://pypi.org/project/termcolor-logger/",
  },
  {
    slug: "email-sender",
    name: "Email Sender",
    image: "https://i.imgur.com/kWJweYF.png",
    description: "A utility for sending emails with attachments. Currently only Gmail is supported.",
    tags: ["PyPi", "Gmail", "wrapper"],
    category: "Tools",
    source_code: "https://github.com/drkostas/pyemail-sender",
    pypi: "https://pypi.org/project/pyemail-sender/",
  },
  {
    slug: "benchmark-tools",
    name: "Benchmark Tools",
    image: "https://i.imgur.com/k64Z12r.png",
    description: "A collection of benchmarking tools.",
    tags: ["PyPi", "CircleCI", "benchmarking"],
    category: "Tools",
    source_code: "https://github.com/drkostas/bench-utils",
    pypi: "https://pypi.org/project/bench-utils/",
  },

  // ---- Fun ----
  {
    slug: "youtube-comment-bot",
    name: "YouTube Comment Bot",
    image: "https://i.imgur.com/bFXeKlG.png",
    description: "A bot that posts the first comment on every new video of specified channels.",
    tags: ["Youtube", "Gmail", "Dropbox", "MySQL", "AWS", "CircleCI", "Heroku"],
    category: "Fun",
    source_code: "https://github.com/drkostas/Youtube-FirstCommentBot",
    demo: "https://www.youtube.com/channel/UC_nnPV1zXEqIP42HOiVdg1A",
  },
  {
    slug: "job-application-bot",
    name: "Job Application Bot",
    image: "https://i.imgur.com/BX6C6ke.png",
    description: "A bot that automatically sends emails to new ads posted in any desired xe.gr search url.",
    tags: ["Gmail", "Dropbox", "MySQL", "AWS", "CircleCI", "Heroku", "Scraper"],
    category: "Fun",
    source_code: "https://github.com/drkostas/JobApplicationBot",
  },
  {
    slug: "tunecraft",
    name: "TuneCraft",
    image: "https://i.imgur.com/9vekJOP.png",
    description:
      "Effortlessly create personalized Spotify playlists with fresh, undiscovered tracks tailored to your taste.",
    tags: ["Spotify", "automation"],
    category: "Fun",
    source_code: "https://github.com/drkostas/TuneCraft",
  },
  {
    slug: "spotify-button-presser",
    name: "Spotify Button Presser",
    image: "https://i.imgur.com/Ek1p3sE.png",
    description: "An app that clicks a physical button whenever Spotify starts playing on the target device.",
    tags: ["RaspberryPI", "Spotify", "SwitchBot", "automation", "smart-home"],
    category: "Fun",
    source_code: "https://github.com/drkostas/SpotiClick",
  },
  {
    slug: "cross-the-floor",
    name: "Cross The Floor",
    image: "https://i.imgur.com/jjPQmxf.png",
    description:
      "Uses Sankey Diagrams to visualize politicians that have 'crossed the floor' from election to election.",
    tags: ["Sankey-Diagram", "Parliament", "Scraper", "Visualization"],
    category: "Fun",
    source_code: "https://github.com/drkostas/Cross-The-Floor",
  },

  // ---- Older / archive ----
  // These are still listed for completeness but show last because they're either
  // educational reimplementations or single-purpose toys from earlier in the
  // user's career.
  {
    slug: "hybrid-girvan-newman",
    name: "Hybrid Girvan Newman",
    image: "https://i.imgur.com/FcIlWzb.png",
    description:
      "Code for the paper 'A Distributed Hybrid Community Detection Methodology for Social Networks'.",
    tags: ["Apache-Spark", "Social-Networks", "Community-Detection", "GraphFrames", "MySQL"],
    category: "Machine Learning",
    source_code: "https://github.com/drkostas/HGN",
    scholar:
      "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=b___QQ8AAAAJ&authuser=1&citation_for_view=b___QQ8AAAAJ:u5HHmVD_uO8C",
  },
  {
    slug: "vanilla-numpy-cnn",
    name: "Vanilla Numpy CNN",
    image: "https://i.imgur.com/sNrVbbL.png",
    description: "A Vanilla Numpy-only Convolutional Neural Network.",
    tags: ["Numpy", "CNN", "Vanilla-Implementation"],
    category: "Machine Learning",
    source_code: "https://github.com/drkostas/Numpy-CNN",
  },
  {
    slug: "vanilla-numpy-nn",
    name: "Vanilla Numpy Neural Network",
    image: "https://i.imgur.com/mm29qlX.png",
    description: "A Vanilla Numpy-only Feed-Forward Neural Network.",
    tags: ["Numpy", "Neural-Network", "Vanilla-Implementation"],
    category: "Machine Learning",
    source_code: "https://github.com/drkostas/Numpy-NeuralNet-1",
  },
  {
    slug: "2d-shooter-game",
    name: "2D Shooter Game",
    image: "https://i.imgur.com/GP9wwc0.png",
    description: "Simple 2d shooter game written with JavaScript and the p5.js library.",
    tags: ["P5.js", "game", "shooter-game"],
    category: "Fun",
    source_code: "https://github.com/drkostas/shooter-game-with-p5js",
    demo: "http://shooter-game.gkos.dev",
  },
  {
    slug: "quantum-mechanics-quiz",
    name: "Quantum Mechanics Quiz App",
    image: "https://i.imgur.com/GZAcsg4.png",
    description: "Android app with 10 questions about Quantum Mechanics.",
    tags: ["Android-App", "Java", "Quantum-Mechanics", "Quiz"],
    category: "Fun",
    source_code: "https://github.com/drkostas/Quantum-Mechanics-Quiz-App",
  },
];

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  "Machine Learning",
  "Products",
  "Tools",
  "Fun",
];
