export interface Publication {
  slug: string;
  title: string;
  year: number;
  conference: string;
  citations: number;
  abstract: string;
  link?: string;
  code?: string;
  arxiv?: string;
}

// Add new papers at the TOP (lowest index) so they appear first.
export const publications: Publication[] = [
  {
    slug: "explore-2026",
    title: "ExPLoRe: Exploration-driven Pre-training for Long-range Remote Sensing",
    year: 2026,
    conference: "ECCV 2026 (Under Review)",
    citations: 0,
    abstract:
      "ExPLoRe presents an exploration-driven pre-training strategy designed to capture long-range spatial dependencies in remote sensing imagery. The approach leverages structured exploration of multi-scale spatial contexts during self-supervised pre-training, improving performance on downstream segmentation and detection tasks.",
  },
  {
    slug: "medic-2026",
    title: "MEDiC: Multi-objective Exploration of Distillation from CLIP",
    year: 2026,
    conference: "arXiv preprint",
    citations: 0,
    abstract:
      "MEDiC introduces a multi-objective framework for distilling knowledge from CLIP into smaller, task-specific models for remote sensing applications. By jointly optimizing multiple objectives during distillation, the method achieves strong performance on downstream tasks while significantly reducing computational requirements.",
    arxiv: "https://arxiv.org/abs/2603.29009",
    code: "https://github.com/aicip/MEDiC",
  },
  {
    slug: "trustworthy-ai-dementia-2025",
    title:
      "Trustworthy AI for Early Dementia Detection: Robust Feature Masking and Clinical Interpretability",
    year: 2025,
    conference: "IEEE/ACM CHASE 2025",
    citations: 0,
    abstract:
      "This work presents a trustworthy AI approach for early dementia detection, focusing on robust feature masking techniques and clinical interpretability to ensure reliable and transparent diagnostic support systems.",
    link: "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=b___QQ8AAAAJ&citation_for_view=b___QQ8AAAAJ:Tyk-4Ss8FVUC",
  },
  {
    slug: "teaching-assistant-pseudo-labels-2025",
    title:
      'Adding a teaching "assistant": improving the quality of pseudo-labels for semi-supervised object detection',
    year: 2025,
    conference: "Revista Tecnología en Marcha",
    citations: 0,
    abstract:
      "This paper introduces a novel approach to semi-supervised object detection by incorporating a teaching assistant mechanism to improve the quality of pseudo-labels, enhancing overall model performance and reliability.",
    link: "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=b___QQ8AAAAJ&citation_for_view=b___QQ8AAAAJ:UeHWp8X0CEIC",
  },
  {
    slug: "koopman-transition-2024",
    title:
      "Koopman-Based Transition Detection in Satellite Imagery: Unveiling Construction Phase Dynamics Through Material Histogram Analysis",
    year: 2024,
    conference: "IEEE IGARSS 2024",
    citations: 0,
    abstract:
      "We reformulate construction phase classification as a transition detection problem and introduce a Koopman-Based Transition Detection (KTD) method that applies Koopman operator theory to analyze the nonlinear dynamics of material histograms in a linear framework. KTD employs a sliding window with Dynamic Mode Decomposition (DMD) on time-series material histograms and detects transition points by analyzing eigenvalue movement. Compared to CNN-based methods, KTD demonstrates enhanced accuracy and reduced temporal error.",
    link: "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=b___QQ8AAAAJ&sortby=pubdate&authuser=3&citation_for_view=b___QQ8AAAAJ:qjMakFHDy7sC",
  },
  {
    slug: "multiscale-rs-finetuning-2024",
    title:
      "Advancing Multi-Scale Remote Sensing Analysis Through Self-Supervised Learning Fine-Tuning Strategies",
    year: 2024,
    conference: "IEEE IGARSS 2024",
    citations: 0,
    abstract:
      "This research focuses on improving the fine-tuning process of self-supervised learning models for remote sensing, particularly the Cross-Scale Masked Auto-Encoder (MAE). We tackle the challenges of intricate, multi-source imagery and present advancements in adapting the Cross-Scale MAE for diverse remote sensing environments.",
    link: "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=b___QQ8AAAAJ&sortby=pubdate&authuser=3&citation_for_view=b___QQ8AAAAJ:2osOgNQ5qMEC",
  },
  {
    slug: "occasionally-secure-2024",
    title: "Ocassionally Secure: A Comparative Analysis of Code Generation Assistants",
    year: 2024,
    conference: "arXiv preprint",
    citations: 14,
    abstract:
      "We conduct a comparative analysis of four advanced LLMs (GPT-3.5, GPT-4, Bard, Gemini) across 9 tasks to assess code generation capabilities. We focus on identifying conditions under which LLMs can be effectively and safely deployed for code generation, with emphasis on security awareness via two distinct developer personas. We collected 61 code outputs and analyzed them across functionality, security, performance, complexity, and reliability.",
    link: "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=b___QQ8AAAAJ&sortby=pubdate&authuser=1&citation_for_view=b___QQ8AAAAJ:9yKSN-GCB0IC",
    arxiv: "https://arxiv.org/abs/2402.00689",
  },
  {
    slug: "cross-scale-mae-2023",
    title: "Cross-Scale MAE: A Tale of Multiscale Exploitation in Remote Sensing",
    year: 2023,
    conference: "NeurIPS 2023",
    citations: 54,
    abstract:
      "We present Cross-Scale MAE, a self-supervised model built on the Masked Auto-Encoder (MAE) framework for remote sensing image understanding. Cross-Scale MAE employs scale augmentation and enforces cross-scale consistency through both contrastive and generative losses to ensure consistent and meaningful representations for downstream tasks. Experimental evaluations demonstrate superior performance compared to standard MAE and other state-of-the-art remote sensing MAE methods.",
    link: "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=b___QQ8AAAAJ&sortby=pubdate&authuser=1&citation_for_view=b___QQ8AAAAJ:d1gkVwhDpl0C",
    code: "https://github.com/aicip/Cross-Scale-MAE",
  },
  {
    slug: "mcl-lc-aerial-segmentation-2023",
    title:
      "Semantic segmentation in aerial imagery using multi-level contrastive learning with local consistency",
    year: 2023,
    conference: "IEEE WACV 2023",
    citations: 31,
    abstract:
      "We exploit self-supervised contrastive learning for semantic segmentation in aerial imagery. In addition to feature-level CL, we add another level of contrastive learning at the semantic level, taking advantage of segmentation output. We embed local mutual information in the semantic-level CL to enforce local consistency, enhancing representation power and generalization. The proposed multi-level contrastive learning with local consistency (mCL-LC) shows superior performance and better generalization, especially under domain shift.",
    link: "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=b___QQ8AAAAJ&sortby=pubdate&authuser=1&citation_for_view=b___QQ8AAAAJ:u-x6o8ySG0sC",
  },
  {
    slug: "hybrid-girvan-newman-2019",
    title: "A distributed hybrid community detection methodology for social networks",
    year: 2019,
    conference: "Algorithms (MDPI) 2019",
    citations: 3,
    abstract:
      "We combine network topology properties (loose similarity and local edge betweenness, an alternative to Girvan-Newman's edge betweenness) with intrinsic user content information to introduce a novel and highly distributed hybrid community detection methodology. The proposed approach is tested on real social graphs and compared to classic divisive community detection algorithms, proving exceptionally scalable, highly efficient, and accurate in revealing the subjacent network hierarchy.",
    link: "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=b___QQ8AAAAJ&sortby=pubdate&authuser=1&citation_for_view=b___QQ8AAAAJ:u5HHmVD_uO8C",
  },
];

// Tier-1 venues get a special highlight
const TIER1_KEYWORDS = ["NeurIPS", "WACV", "ECCV", "CVPR", "ICCV", "ICML", "ICLR"];

export function isTier1(conference: string): boolean {
  return TIER1_KEYWORDS.some((kw) => conference.includes(kw));
}
