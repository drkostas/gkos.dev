# Portfolio-v2 — Workbench + Inspirations Pick-List

**Date:** 2026-04-15
**Status:** DRAFT — Kostas to review, annotate, decide

---

## How to use this file

1. For each skill, mark **one** of:
   - `[x] KEEP` — include in v1 Workbench
   - `[x] CUT` — don't include
   - `[x] MAYBE` — we'll decide together later
2. For each KEEP, either pick ONE candidate anecdote (mark with `★`) or write your own story under `→ MY STORY:`
3. Add notes anywhere inline — I'll read all of them
4. Ping me when done; I'll draft final copy and update `src/data/workbench.ts` + `src/data/inspirations.ts`

### Tags used below
- `(v2)` — already in current v2 workbench.ts
- `(NEW)` — not in v2; mined from old vscode-portfolio / project data
- `(solo)` — only one real project behind it in the old data — consider cutting
- `(duplicate-role)` — overlaps heavily with another entry; maybe pick one

---

## WORKBENCH

### ML & Research

#### PyTorch `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - Cross-Scale MAE (NeurIPS) — primary training framework for the whole paper
  - MEDiC — CLIP distillation pipeline
  - MaskDistill-PyTorch — first open reproduction with public weights
  - 3D Semantic Segmentation on medical images
- → MY STORY: _____

#### TensorFlow `(NEW)` `(solo-ish)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Old-portfolio users: COVID-19 Vaccination Prediction (LSTMs), Instagram Likes Prediction (CNN)
- Possible framing: "Used it before fully migrating to PyTorch — kept it for TF-specific research."
- → MY STORY: _____

#### HuggingFace `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - MEDiC — published model + card at huggingface.co/drkostas
  - MaskDistill-PyTorch — weights release
  - BERT-based QA (Rinehart novels) — Transformers + SpaCy
- → MY STORY: _____

#### Transformers (HF library) `(NEW)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE  (possibly `(duplicate-role)` with HuggingFace entry)
- Anecdote candidates:
  - BERT QA project — first serious use
  - Every downstream fine-tune since
- → MY STORY: _____

#### CUDA `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - Cross-Scale MAE training sprint — multi-GPU setup
  - MEDiC distillation — the OOMs that taught you CUDA memory management
- → MY STORY: _____

#### Jupyter `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - "Every paper in my Scholar page started as a .ipynb"
  - Specific experiment where a notebook caught a bug before training
- → MY STORY: _____

#### Weights & Biases `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - Cross-Scale MAE — hyperparameter sweeps across scales
  - MEDiC — checkpoint tracking during distillation
  - A specific moment the run-comparison view caught a regression
- → MY STORY: _____

#### NumPy `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - Vanilla Numpy CNN — the "I want to understand what PyTorch hides" project
  - Vanilla Numpy Neural Network — same spirit
  - (strong character-building anecdote available here)
- → MY STORY: _____

#### Pandas `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - Accident Severity Prediction — heavy EDA + feature engineering
  - Performance Technologies (data engineer era) — production pipelines
- → MY STORY: _____

#### scikit-learn `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - Accident Severity (Logistic Regression, K-Means baselines)
  - "Still the first baseline I run before reaching for deep learning"
- → MY STORY: _____

#### SpaCy `(NEW)` `(solo)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Only old-portfolio user: BERT QA on Rinehart novels
- → MY STORY: _____

#### OpenCV `(NEW)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Old-portfolio users: Instagram Likes Prediction, 3D Semantic Segmentation
- → MY STORY: _____

#### XGBoost `(NEW)` `(solo)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Only old-portfolio user: Accident Severity Prediction
- → MY STORY: _____

---

### Backend

#### Python `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - 7 PyPI packages (Garmin Auth, High SQL, Cloud File Manager, YAML Wrapper, Color Logger, Email Sender, Benchmark Tools)
  - "Every research paper + every backend I ship"
- → MY STORY: _____

#### FastAPI `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - FleetSmart.ai backend — the VC-pitch 2-week sprint
  - XpensAI serverless APIs
- → MY STORY: _____

#### Pydantic `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - FleetSmart API contracts
  - PyPI packages' config models
- → MY STORY: _____

#### PostgreSQL `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - FleetSmart — primary production DB
  - XpensAI — receipt data
  - Amazon production workloads
- → MY STORY: _____

#### Supabase `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - ShiftMD — shipped a multi-tenant backend in a weekend
- → MY STORY: _____

#### Redis `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - Rate limiting in FleetSmart
  - Amazon production caching
- → MY STORY: _____

#### Poetry `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - Packaging workflow for all 7 PyPI packages
- → MY STORY: _____

#### MySQL `(NEW)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE  (possibly `(duplicate-role)` with PostgreSQL)
- Old-portfolio users: High SQL (PyPI), Hybrid Girvan Newman (paper), YouTube Comment Bot, Job App Bot
- → MY STORY: _____

#### MongoDB `(NEW)` `(solo-ish)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Old-portfolio listing only (Techstack.js). Any real project?
- → MY STORY: _____

#### Firebase `(NEW)` `(solo-ish)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Old-portfolio listing only. Any real project?
- → MY STORY: _____

#### Node.js `(NEW)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE  (possibly `(duplicate-role)` with Next.js / TypeScript)
- Old-portfolio listed. Any standalone Node service vs. embedded in Next.js?
- → MY STORY: _____

#### OR-Tools `(NEW)` `(solo)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Only old-portfolio user: ShiftMD (constraint programming for schedules)
- Strong story potential — one of the few tools uniquely tied to a product.
- → MY STORY: _____

#### Apache Spark `(NEW)` `(solo)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Only real user: Hybrid Girvan Newman paper
- Also: BerkeleyX course (kept for cert page, not here)
- → MY STORY: _____

#### Java `(NEW)` `(solo)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Only old-portfolio user: Quantum Mechanics Quiz App (Android)
- Candidate cut.
- → MY STORY: _____

#### C++ `(NEW)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Old-portfolio Techstack only. Any real project?
- → MY STORY: _____

---

### Frontend

#### TypeScript `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - FleetSmart (maps, dashboards)
  - ShiftMD, XpensAI, Soma
  - "Every line of frontend in the last 3 years"
- → MY STORY: _____

#### Next.js `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - FleetSmart live-tracking screen (server + client component split)
  - ShiftMD scheduling UI
  - XpensAI, Soma
- → MY STORY: _____

#### React `(v2)` `(duplicate-role)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE  (overlaps heavily with Next.js; keep if you want both)
- Anecdote candidates:
  - This portfolio's islands (Phaser wrapper, SpeakingBento, etc.)
  - Pre-Next.js side projects
- → MY STORY: _____

#### Astro `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - This very site — rebuilt from the VS Code-themed Next.js version
  - "Static-by-default matched my blog-forward vision"
- → MY STORY: _____

#### Tailwind CSS `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - FleetSmart design system
  - This portfolio's grid system
  - "Last time I wrote a stylesheet from scratch: ____"
- → MY STORY: _____

#### Framer Motion `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - Animations on this portfolio (hover, scroll reveals, profile picture)
  - FleetSmart onboarding flow?
- → MY STORY: _____

#### shadcn/ui `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - FleetSmart / ShiftMD / XpensAI UI primitives
  - Own-the-code philosophy fits how you like to ship
- → MY STORY: _____

#### JavaScript `(NEW)` `(duplicate-role)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE  (probably cut in favor of TypeScript)
- → MY STORY: _____

#### p5.js `(NEW)` `(solo)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Only old-portfolio user: 2D Shooter Game
- Candidate cut unless you want a "fun" entry.
- → MY STORY: _____

---

### Cloud & Infra

#### AWS `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - Amazon day job (S3, Lambda, ECS, RDS)
  - XpensAI serverless backend
  - YouTube Comment Bot, Job App Bot (RDS)
- → MY STORY: _____

#### GCP `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - FleetSmart — Cloud Run + Cloud Storage + Cloud SQL
- → MY STORY: _____

#### Azure `(NEW)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Old-portfolio users: XpensAI (mentioned in tags)
- → MY STORY: _____

#### Docker `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - Reproducible training envs for Cross-Scale MAE / MEDiC
  - Udemy cert (Docker + K8s, 2019) — if you want the origin story
  - All production deployments
- → MY STORY: _____

#### Kubernetes `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - Scaling inference services at Amazon
  - Udemy cert (2019) — early-career origin
- → MY STORY: _____

#### Cloudflare `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - Edge layer in front of FleetSmart / ShiftMD?
  - DNS + CDN for gkos.dev itself?
- → MY STORY: _____

#### Vercel `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - This portfolio + previous vscode-portfolio version
  - FleetSmart / ShiftMD / XpensAI / Soma deployments
- → MY STORY: _____

#### GitHub Actions `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - CI across your 59 repos
  - Release workflows for PyPI packages
- → MY STORY: _____

#### CircleCI `(v2)` `(duplicate-role)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE  (overlaps with GitHub Actions — pick one or tell their distinct story)
- Anecdote candidates:
  - The 7 PyPI packages were originally on CircleCI — origin story
- → MY STORY: _____

#### Heroku `(NEW)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Old-portfolio users: YouTube Comment Bot, Job Application Bot
- Possibly nostalgia-cut; unless you still use it.
- → MY STORY: _____

---

### Tools

#### VS Code `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - "My previous portfolio was themed as a VS Code window — that's how much time I spend here."
  - Daily driver for research + production
- → MY STORY: _____

#### Cursor `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE  (honest take: do you actually use this daily?)
- Anecdote candidates:
  - When you reach for AI-pair-programmer mode
  - This portfolio was built partially in Cursor?
- → MY STORY: _____

#### Git `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE  (very generic — consider cutting unless you have a specific take)
- Anecdote candidates:
  - 59 repos, 8,300 followers
  - One specific rebase horror story
- → MY STORY: _____

#### Obsidian `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - Where paper notes live before they become papers
  - PhD-scale knowledge graph
- → MY STORY: _____

#### Linear `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE
- Anecdote candidates:
  - FleetSmart / ShiftMD / XpensAI project management
  - "Opposite of Jira" philosophical take
- → MY STORY: _____

#### Figma `(v2)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE  (honest take: do you actually design much, or would Penpot replace this?)
- Anecdote candidates:
  - Pre-build wireframes for FleetSmart
  - Quick feature mockups
- → MY STORY: _____

#### Postman `(NEW)`
- [ ] KEEP  [ ] CUT  [ ] MAYBE  (or cut for Bruno / HTTPie / curl?)
- Old-portfolio Toolstack. Any favorite use?
- → MY STORY: _____

---

### Candidates I'm NOT including (filtered out as non-tools)

These appeared in old-portfolio project tags but aren't frameworks/tools — they're **research domains, model names, or techniques**. They belong in project descriptions or paper abstracts, not Workbench. Flag any you disagree with:

- Domains: Computer Vision, NLP, LLMs, Self-Supervised, MIM, Medical Imaging, Community Detection, Reinforcement Learning, Multivariate Time Series
- Model names: BERT, CLIP, GPT-4o, SegFormer
- Algorithms: CNN, LSTM, K-Means, Logistic Regression, Markov Decision Process, Bayesian Optimization, Value Iteration
- Generic concepts: Serverless, authentication, automation, benchmarking, configuration, OAuth
- One-off hobbyist tags: Minecraft, Parliament, SwitchBot, Strava, Garmin, Instagram, YouTube, Gmail, Dropbox, Spotify, Android, Raspberry Pi
- Already-a-project-not-a-tool: GraphFrames (Hybrid GN only), Sankey-Diagram (Cross the Floor only)

→ NOTES: _____

---

## INSPIRATIONS

### Papers (existing: 5 entries)

Current 5 are solid picks. For each, the **current description is generic** and needs your anecdote.

#### Masked Autoencoders Are Scalable Vision Learners (He et al., 2021) `(keep)`
- Current: "The MAE paper changed how I think about self-supervised pre-training. Cross-Scale MAE is a direct descendant."
- → YOUR ANECDOTE (where/when you first read it; what clicked): _____

#### CLIP (Radford et al., 2021) `(keep)`
- → YOUR ANECDOTE: _____

#### ViT (Dosovitskiy et al., 2020) `(keep)`
- → YOUR ANECDOTE: _____

#### SimCLR (Chen et al., 2020) `(keep)`
- → YOUR ANECDOTE: _____

#### Attention Is All You Need (Vaswani et al., 2017) `(keep)`
- → YOUR ANECDOTE: _____

#### Want to add more papers? Suggest below (5 max to fit bento):
- _____

---

### Books (existing: 5 entries — YOU PROVIDE)

Current placeholders (On Intelligence, Deep Learning textbook, DDIA, Pragmatic Programmer, Thinking Fast & Slow) read generic. Please provide:

- [ ] Keep current 5 as-is and just add your anecdote for each
- [ ] Replace some with different books — list below:

Your book list (title + author + 1 line why it mattered to you):

1. _____
2. _____
3. _____
4. _____
5. _____

---

### People (existing: 5 entries)

Current: Dr. Hairong Qi, Andrej Karpathy, Yann LeCun, Kaiming He, Jeremy Howard.

#### Dr. Hairong Qi `(keep)`
- → YOUR ANECDOTE (something specific she said/did/pushed back on): _____

#### Andrej Karpathy `(keep)`
- → YOUR ANECDOTE: _____

#### Yann LeCun `(keep)`
- → YOUR ANECDOTE: _____

#### Kaiming He `(keep)`
- → YOUR ANECDOTE: _____

#### Jeremy Howard `(keep / cut)`
- → YOUR ANECDOTE: _____

#### Want to swap anyone? Candidates to consider: Kostas Daniilidis, Ross Girshick, Alec Radford, specific UTK profs, a mentor from Amazon.
- _____

---

### Resources (existing: 5 entries)

Current: arXiv, Papers With Code, Yannic Kilcher, Two Minute Papers, Lex Fridman.

Decide per entry:

- [ ] arXiv — KEEP / CUT — anecdote: _____
- [ ] Papers With Code — KEEP / CUT — anecdote: _____
- [ ] Yannic Kilcher — KEEP / CUT — anecdote: _____
- [ ] Two Minute Papers — KEEP / CUT — anecdote: _____
- [ ] Lex Fridman — KEEP / CUT — anecdote: _____

Want to add? Candidates: Hugging Face blog, Eugene Yan blog, Lilian Weng blog, Sebastian Raschka, The Gradient, etc.

- _____

---

### Courses that shaped me (NEW category — from LinkedIn certifications)

Filtered to just the Andrew Ng courses per your instruction. Note: this requires a small code change — adding `course` to `INSPIRATION_CATEGORIES` in `src/data/inspirations.ts` and adding a corresponding bento widget.

#### Andrew Ng — Machine Learning (Stanford, Coursera, Nov 2020)
- → YOUR ANECDOTE (what clicked; were you in grad school yet? pre-UTK?): _____

#### Andrew Ng — Deep Learning Specialization (deeplearning.ai, Coursera, Oct–Nov 2020)
Includes the three courses you took:
- Neural Networks and Deep Learning (Oct 2020)
- Improving Deep Neural Networks (Nov 2020)
- Structuring Machine Learning Projects (Nov 2020)
- → YOUR ANECDOTE (combine into one entry OR keep as separate rows?): _____

---

## END-OF-FILE QUESTIONS FOR KOSTAS

1. Bento-widget version of Workbench on homepage — how many tools should surface there? (Currently 8 via ToolboxBento.) Want me to re-curate based on your KEEP picks?
2. Same for the Inspirations widgets — they currently surface **defaults** that may or may not reflect your final picks. Want me to re-wire them to read from your final `inspirations.ts`?
3. Anything above that feels wrong/missing before I start writing final copy?
