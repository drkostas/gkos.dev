/**
 * Curated inspirations — books, papers, researchers, and resources that
 * shaped Kostas's thinking and work.
 *
 * Currently used as defaults in the bento widget components
 * (FavoritePaperBentoReact, BookshelfBentoReact, etc.).
 * Edit the DEFAULT_* constants in each component to update content,
 * or wire this file as props when customizing.
 *
 * Add new items at the TOP so they appear first.
 */

export interface Inspiration {
  title: string;
  author?: string;
  description: string;
  link?: string;
  category: "paper" | "book" | "person" | "resource";
}

export const INSPIRATION_CATEGORIES = ["paper", "book", "person", "resource"] as const;

export const inspirations: Inspiration[] = [
  // ── Papers (5) ──
  {
    title: "Masked Autoencoders Are Scalable Vision Learners",
    author: "He et al., 2021",
    description: "The MAE paper changed how I think about self-supervised pre-training. Cross-Scale MAE is a direct descendant.",
    link: "https://arxiv.org/abs/2111.06377",
    category: "paper",
  },
  {
    title: "Learning Transferable Visual Models From Natural Language Supervision",
    author: "Radford et al. (CLIP), 2021",
    description: "CLIP bridged vision and language in a way that made MEDiC possible. The zero-shot transfer paradigm reshaped my research.",
    link: "https://arxiv.org/abs/2103.00020",
    category: "paper",
  },
  {
    title: "An Image is Worth 16x16 Words",
    author: "Dosovitskiy et al. (ViT), 2020",
    description: "Vision Transformers proved that attention can replace convolutions. Every model I've trained since 2021 builds on this.",
    link: "https://arxiv.org/abs/2010.11929",
    category: "paper",
  },
  {
    title: "A Simple Framework for Contrastive Learning",
    author: "Chen et al. (SimCLR), 2020",
    description: "SimCLR's elegance convinced me that self-supervised learning was the future. My mCL-LC paper extends these ideas to aerial imagery.",
    link: "https://arxiv.org/abs/2002.05709",
    category: "paper",
  },
  {
    title: "Attention Is All You Need",
    author: "Vaswani et al., 2017",
    description: "The paper that started the transformer revolution. Hard to overstate its impact on everything I work on today.",
    link: "https://arxiv.org/abs/1706.03762",
    category: "paper",
  },

  // ── Books (5) ──
  {
    title: "On Intelligence",
    author: "Jeff Hawkins",
    description: "A framework for understanding the brain that changed how I think about neural architectures and representation learning.",
    category: "book",
  },
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
    description: "Career-shaping advice on craft. I re-read chapters every time I start a new project.",
    category: "book",
  },
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    description: "Not a tech book, but it shaped how I approach experiment design and evaluate results.",
    category: "book",
  },

  // ── People (5) ──
  {
    title: "Dr. Hairong Qi",
    description: "My PhD advisor at UTK. Taught me how to think rigorously about problems and write papers that matter.",
    link: "https://scholar.google.com/citations?user=2HBSM2AAAAAJ",
    category: "person",
  },
  {
    title: "Andrej Karpathy",
    description: "His lectures (CS231n) and blog posts were my gateway into deep learning. Still the clearest explainer in the field.",
    link: "https://karpathy.ai/",
    category: "person",
  },
  {
    title: "Yann LeCun",
    description: "Self-supervised learning prophet. His vision for non-contrastive methods influenced Cross-Scale MAE directly.",
    link: "https://yann.lecun.com/",
    category: "person",
  },
  {
    title: "Kaiming He",
    description: "ResNet, MAE, Masked Autoencoders — his work is in the backbone of almost every model I've ever trained.",
    link: "https://scholar.google.com/citations?user=DhtAFkwAAAAJ",
    category: "person",
  },
  {
    title: "Jeremy Howard",
    description: "Fast.ai taught me that you don't need a PhD to do deep learning. Turns out having one helps anyway.",
    link: "https://www.fast.ai/",
    category: "person",
  },

  // ── Resources (5) ──
  {
    title: "arXiv",
    description: "My daily reading list. Where I keep up with everything happening in ML and computer vision.",
    link: "https://arxiv.org/",
    category: "resource",
  },
  {
    title: "Papers With Code",
    description: "The first place I check when starting a new project. Benchmarks + code = reproducibility.",
    link: "https://paperswithcode.com/",
    category: "resource",
  },
  {
    title: "Yannic Kilcher",
    description: "Best paper walkthroughs on YouTube. Saves hours of reading dense notation.",
    link: "https://www.youtube.com/@YannicKilcher",
    category: "resource",
  },
  {
    title: "Two Minute Papers",
    description: "Quick pulse on what's exciting in AI research. Great for papers outside my niche.",
    link: "https://www.youtube.com/@TwoMinutePapers",
    category: "resource",
  },
  {
    title: "Lex Fridman Podcast",
    description: "Long-form conversations with researchers I admire. Commute fuel.",
    link: "https://lexfridman.com/podcast/",
    category: "resource",
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  paper: "Papers that shaped my research",
  book: "Books I keep coming back to",
  person: "People I learn from",
  resource: "Where I stay current",
};
