/**
 * Curated inspirations — books, papers, researchers, and resources that
 * shaped Kostas's thinking and work. Displayed on /inspirations.
 *
 * Add new items at the TOP so they appear first.
 */

export interface Inspiration {
  title: string;
  author?: string;
  description: string;
  link?: string;
  category: "paper" | "book" | "person" | "resource";
  image?: string; // optional icon/cover URL
}

export const INSPIRATION_CATEGORIES = ["paper", "book", "person", "resource"] as const;

export const inspirations: Inspiration[] = [
  // Papers
  {
    title: "Masked Autoencoders Are Scalable Vision Learners",
    author: "He et al.",
    description: "The MAE paper changed how I think about self-supervised pre-training. Cross-Scale MAE is a direct descendant.",
    link: "https://arxiv.org/abs/2111.06377",
    category: "paper",
  },
  {
    title: "Learning Transferable Visual Models From Natural Language Supervision",
    author: "Radford et al. (CLIP)",
    description: "CLIP bridged vision and language in a way that made MEDiC possible. The zero-shot transfer paradigm reshaped my research.",
    link: "https://arxiv.org/abs/2103.00020",
    category: "paper",
  },
  {
    title: "An Image is Worth 16x16 Words",
    author: "Dosovitskiy et al. (ViT)",
    description: "Vision Transformers proved that attention can replace convolutions. Every model I've trained since 2021 builds on this.",
    link: "https://arxiv.org/abs/2010.11929",
    category: "paper",
  },
  {
    title: "A Simple Framework for Contrastive Learning of Visual Representations",
    author: "Chen et al. (SimCLR)",
    description: "SimCLR's elegance convinced me that self-supervised learning was the future. My mCL-LC paper extends these ideas to aerial imagery.",
    link: "https://arxiv.org/abs/2002.05709",
    category: "paper",
  },
  {
    title: "Attention Is All You Need",
    author: "Vaswani et al.",
    description: "The paper that started the transformer revolution. Hard to overstate its impact on everything I work on today.",
    link: "https://arxiv.org/abs/1706.03762",
    category: "paper",
  },
  {
    title: "Deep Residual Learning for Image Recognition",
    author: "He et al. (ResNet)",
    description: "Skip connections seem obvious in hindsight — but they unlocked depth in neural networks and paved the way for everything after.",
    link: "https://arxiv.org/abs/1512.03385",
    category: "paper",
  },

  // Books
  {
    title: "Deep Learning",
    author: "Goodfellow, Bengio, Courville",
    description: "The textbook I keep going back to. Best reference for fundamentals that matter when your model isn't training.",
    link: "https://www.deeplearningbook.org/",
    category: "book",
  },
  {
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    description: "Changed how I think about systems beyond the model. Essential for anyone shipping ML to production.",
    link: "https://dataintensive.net/",
    category: "book",
  },
  {
    title: "The Pragmatic Programmer",
    author: "Hunt & Thomas",
    description: "Career-shaping advice. I re-read chapters every time I start a new project.",
    category: "book",
  },
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    description: "Not a tech book, but it fundamentally shaped how I approach experiment design and evaluate results.",
    category: "book",
  },

  // People
  {
    title: "Dr. Hairong Qi",
    description: "My PhD advisor at UTK. Taught me how to think rigorously about problems and write papers that matter.",
    link: "https://scholar.google.com/citations?user=2HBSM2AAAAAJ",
    category: "person",
  },
  {
    title: "Andrej Karpathy",
    description: "His blog posts and lectures (CS231n) were my gateway into deep learning. Still the clearest explainer in the field.",
    link: "https://karpathy.ai/",
    category: "person",
  },
  {
    title: "Yann LeCun",
    description: "Self-supervised learning prophet. His vision for non-contrastive methods influenced Cross-Scale MAE directly.",
    link: "https://yann.lecun.com/",
    category: "person",
  },

  // Resources
  {
    title: "arXiv",
    description: "My daily reading list. Where I keep up with everything happening in ML and computer vision.",
    link: "https://arxiv.org/",
    category: "resource",
    image: "https://cdn.simpleicons.org/arxiv",
  },
  {
    title: "Papers With Code",
    description: "The first place I check when starting a new project. Benchmarks + code = reproducibility.",
    link: "https://paperswithcode.com/",
    category: "resource",
  },
  {
    title: "Yannic Kilcher's YouTube",
    description: "Best paper walkthroughs on the internet. Saves me hours of reading dense notation.",
    link: "https://www.youtube.com/@YannicKilcher",
    category: "resource",
  },
  {
    title: "Two Minute Papers",
    description: "Quick pulse on what's exciting in AI research. Great for discovering papers outside my niche.",
    link: "https://www.youtube.com/@TwoMinutePapers",
    category: "resource",
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  paper: "Papers",
  book: "Books",
  person: "People",
  resource: "Resources",
};

export const CATEGORY_ICONS: Record<string, string> = {
  paper: "📄",
  book: "📚",
  person: "👤",
  resource: "🔗",
};
