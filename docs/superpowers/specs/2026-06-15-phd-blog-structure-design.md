# PhD-lessons blog post: structural design

Design spec for the blog post tentatively titled around "what the PhD gave me." Replaces the earlier draft at `src/content/blog/what-the-phd-gave-me.mdx` (which is `draft: true` and was written before the proper brainstorming pass).

## Context

The post is a reflective career essay covering nine lessons the user picked up during five and a half years of a PhD in machine learning (January 2021 to May 2026). It's the third post on the site after `hello-world.mdx` and `how-i-got-here.mdx`, so it has to slot into the existing voice without clashing.

## Voice contract

All prose follows the rules already established in memory and in `~/.claude/CLAUDE.md` § "Voice — Generated Artifacts". Most-violated rules to be vigilant about during drafting:

- No em-dashes or semicolons mid-sentence. Use commas, periods, colons, parentheses, or restructure.
- No AI vocabulary (delve / pivotal / testament / landscape / vibrant / underscore / foster / showcase / leverage / etc.).
- No "serves as / stands as / marks / represents" — use plain is/are.
- No vanity metrics (no "X papers", "Y followers", "Z citations" naming counts).
- No self-attack labels (no "snob", "lame", "stupid", "naive") in final prose, even if the user typed them while brainstorming.
- No literary devices: no "Dear past-self" letters, no field-notes / research-log conceits, no scene-setting novelistic openings.
- No second-person ("you'll learn") as a framing device — first-person throughout.
- No rule-of-three forcing if only two things fit.
- Modesty markers ("a few", "mostly", "I figured I'd", "Which is fine", "I'd say") spread naturally through the prose.
- Mixed sentence rhythm: one short punchy sentence then one longer, varied. Not staccato. Not run-on.
- Sentence case in headings, not Title Case.

Reference posts: `src/content/blog/hello-world.mdx` and `src/content/blog/how-i-got-here.mdx`. New post should sit naturally next to them.

## Structure

Eight H2 sections, mixed labels and questions (3 questions, 5 labels, same ratio as hello-world):

1. **Why I'm writing this** (label, opener section)
2. **How do you figure out what to work on?** (question, L1)
3. **What I got wrong about applied research** (label, L3)
4. **How do you read a saturated field?** (question, flagship, L4 + L5)
5. **How to escape incremental improvements** (label, L6)
6. **What I do when I'm stuck** (label, L7 + L8)
7. **Why does open code matter so much?** (question, L2 + L9)
8. **Where I am now** (label, closer)

## Section-by-section content

### Section 1: Why I'm writing this

Opens with Opener B (chosen during brainstorm):

> I finished my PhD in May, and now that I've had a few weeks to decompress I keep getting the same question from friends and former colleagues: what did five and a half years of it actually teach you? I've noticed I keep giving the same handful of answers, so I figured I'd write them down. None of this is about the technical content of my research. That's in the papers. This is the rest.

### Section 2: How do you figure out what to work on? (Lesson 1)

> I came into the PhD not knowing what I wanted to work on. My qualifying exam was on object detection and tracking, and I had assumed that was the area I'd stay in. What actually happened is that I spent the first year saying yes to whatever my labmates were doing. I helped a senior student run experiments. I asked questions in their meetings. I joined a team that entered a remote sensing competition. We didn't do well, but to compete we had to understand the Vision Transformer in detail, and that detail ended up being the seed of a paper we published the next year. By the time I knew I liked masked image modeling I'd already been working on it for months without calling it that. Looking back, the worrying I did at the start about choosing the right area was wasted. The choice made itself once I was reading the right things. Which is fine.

### Section 3: What I got wrong about applied research (Lesson 3)

> I had a vague sense coming in that foundational research was where the real ideas lived, that applied work was just turning the crank on existing methods, and that I'd learn the most by doing things myself. The last assumption turned out to be partly right. The other two were backwards. Foundational papers in ML almost always have five to ten authors and enough compute to run hundreds of experiments. Trying to do one alone, with one real collaborator and a modest cluster, isn't a realistic project. Applied work is harder than I expected, not easier. SOTA models that look fine on standard benchmarks tend to break on real datasets, and the research that matters is in understanding why. The medical imaging paper I'm proudest of came from exactly that gap, between what the benchmark numbers said and what was actually happening on the data we cared about.

### Section 4: How do you read a saturated field? (Flow A — flagship, Lessons 4 + 5)

Three paragraphs: reflex, method, meta-skill.

> The thing I had to unlearn early on was the instinct to solve every technical problem from first principles. I'd been writing code for years before the PhD, so my default move was: look at the problem, think hard, build the solution. That works for most engineering. In ML research, especially in a saturated field, it doesn't. Almost every niche problem has a paper attached to it. When you don't have an exact match, there's usually one for an adjacent space. You might want a vision model for dental scans and find one for CT instead. The job stops being about figuring it out alone. It starts being about reading enough to know what's already been figured out, and learning to tell good research from bad.
>
> For me that meant building a map. When I started working on masked image modeling I went through every paper that cited MAE and BEiT. First pass was abstract and results table only. I kept a list with paper names, venues, datasets, experiments, and reported numbers. The common datasets surfaced quickly: ImageNet for linear probe and finetune, ADE20K for semseg, COCO for detection. For the strongest results I sketched the architectures on a whiteboard and took photos so I could put them side by side. The differences started clustering: RGB-based, codebook-based, EMA self-distillation, teacher-based like CLIP. I read the ablations to see what part of each model was actually doing the work. By the end of it I had a real mental model of what had been tried, what had worked, and where there might be room to add something.
>
> The protocol is the point, but the underlying skill is what the PhD trains. It's about learning to read papers based on results rather than author names or citation counts. Once you have that, you've earned the right to theorize about improvements. Before that, you're guessing.

### Section 5: How to escape incremental improvements (Option 2 split, Lesson 6)

Two paragraphs.

> Once I had the map I hit the next wall. Every idea I had was just a combination of two existing papers. That's incrementalism, and in a saturated field it's what every other PhD student is also trying. I'd already gone deep in my subfield. The next move turned out to be sideways: spending time on NLP papers, on object detection. Different problem shapes, different design constraints, different architectural moves.
>
> After a while the ideas that started showing up had a different flavor. They started looking like: this trick from a totally different field would fix the component I knew was naive. The mechanism is straightforward in hindsight. You start from a baseline, you understand which components are weak or simplistic, then you look for any field that's solved a structurally similar problem. The intuition for improvement comes from the gap between what's clearly not working here and what you've seen work somewhere else.

### Section 6: What I do when I'm stuck (Flow A, Lessons 7 + 8)

Two paragraphs: the social tool first, then the strategic decision with the ExPLoRe story.

> When you hit a roadblock, the temptation is to assume it's a dead end and walk away. Most of the time it isn't. Most of the time the way out is to talk through it. I made a habit, especially when I was stuck, of building slides for whatever I had tried and walking my labmates and advisor through the bad results in detail. Sometimes someone in the room handed me a new direction. Sometimes their idea was wrong and I spent a minute explaining why, and the explanation itself was the thing that unstuck me. The parts I was most tempted to skip over were always the parts where I'd made a bad decision and was defensive about it. Those were the parts I most needed to show. Bad decisions happen, especially in the first year. Hiding them is what keeps you stuck.
>
> The harder version of this is knowing when to back off from a bad idea even after you've spent a long time on it. I've done that with a paper that's now in review. For most of the first year of that project I was trying to combine three losses on top of an existing MIM backbone: distillation, reconstruction, and global CLS alignment. I tried attention-based masking strategies. I ablated every component. I tuned the weights by hand. I used GradNorm to auto-adjust them. Nothing was moving. The numbers stayed flat for months. What I'd been ignoring was the training data itself. The three losses were competing, not just globally but at the patch level. Different regions of the image needed different losses at different points in training. Once I saw that, I stopped trying to combine the losses better and changed the question. What if the model decided which patches got which loss? I built a mixture-of-experts router that did per-patch loss weighting, with each expert specializing into what one of the losses was actually good for. That ended up being the contribution. The lesson is a habit. When something stops working, the data is talking to you. Read it carefully. The pivot you'd never come up with from theory comes from staring at the metrics for an hour.

### Section 7: Why does open code matter so much? (Flow A, Lessons 2 + 9)

Two paragraphs: the MaskDistill year (anonymized), then the producer-side resolution.

> In my second year I picked a SOTA paper to build on. It came from a respected industry lab that usually released code with their papers. They hadn't released this one. The unofficial implementation I found didn't work, so I started rebuilding from the previous paper's released code, line by line. After many failed attempts where I thought I was close, it took me about a year to get the finetuning numbers to match what they had reported. I was eventually able to publish a paper on top of it. Was that year worth it? Probably not. I could have picked a different baseline, something I could actually verify even if it wasn't the SOTA, and saved myself most of the time. The downstream semseg numbers never quite matched what they had published. My own semseg numbers were also weaker than I'd hoped, on an architecture similar to theirs, and I couldn't say anything to reviewers about it because I couldn't prove anything. I know that codebase inside out. I have my suspicions. The lesson stuck: a paper without open code is a paper you can't argue with. Treat the numbers as an upper bound, and weight a baseline by whether you can verify it. Reputation isn't a substitute for reproducibility, even from labs that usually release everything.
>
> After that year, my own work shifted. I started treating GitHub like the long version of my CV. I kept repos private while papers were in review, then made them open the day each paper landed. I uploaded weights to HuggingFace. I built small demos when I could. I kept the code reproducible enough that I'd be willing to walk a reviewer through any line. The selfish reasons are real. Clean code makes your follow-up papers easier and your own re-runs less painful six months later. The cited reasons are also real. Between two papers with the same citation count, the one with open weights gets used more, and getting used matters as much as getting cited. Industry recruiters will look at the same GitHub and see a track record of clean reproducible work. But the underlying reason is the bigger one. After a year of wishing somebody else's code was open, the least I could do was return the favor. Make it easy for others the way you wanted it to be easy for you.

### Section 8: Where I am now

> I defended in April. I graduated in May. This past week I joined an Amazon Robotics team in Berlin, working on robotics with LLMs. Most of what I learned in the PhD I figured out the slow way, by getting things wrong in public and then walking my labmates through what I'd done. Writing this post is part of doing the same thing out loud. If any of this resonates or rubs you the wrong way, leave a comment below. I'm curious what other people's version of the list looks like, especially from engineers who never went through grad school. The lessons might be very different. They might also be the same.

## Lesson-to-section map

| Section | Lessons | Notes |
|---|---|---|
| 1 | none | Opener, ~80 words |
| 2 | L1 (didn't need a topic, needed exposure) | ViT competition, MIM discovery, qualifying-exam pivot |
| 3 | L3 (applied vs foundational reframe) | MEDiC referenced as "medical imaging paper" |
| 4 | L4 (reflex), L5 (mapping protocol) | Flagship section, three paragraphs |
| 5 | L6 (cross-domain reading) | Standalone, two paragraphs |
| 6 | L7 (talk through dead ends), L8 (data-driven pivot) | ExPLoRe story carries L8 |
| 7 | L2 (consumer side), L9 (producer side) | MaskDistill year anonymized; bookend section |
| 8 | none | Closer, current state + soft CTA |

## Anonymization rules during drafting

- Don't name MaskDistill or Microsoft Research in Section 7. Use "a SOTA paper from a respected industry lab that usually released code."
- Don't name WACV, NeurIPS, ECCV, IGARSS, CHASE explicitly. Use "a paper we published" / "a paper that's now in review" / "a top conference."
- Don't name MEDiC by name; use "the medical imaging paper I'm proudest of."
- Don't name AR Veritas / AFT&R or L5 in the closer. Use "an Amazon Robotics team in Berlin."

## Frontmatter

```yaml
---
title: "What the PhD gave me"
publishedAt: 2026-06-15T12:00:00
summary: "Five and a half years of research, nine things I'd tell the version of me who started in 2021. None of it is about the technical content. That's in the papers. This is the rest."
categories: ["career", "personal", "ml"]
draft: true
---
```

Title kept tentative; user may want to flip after seeing the full draft. Slug: `what-the-phd-gave-me` (matches existing draft file). `draft: true` until user approves the rendered post.

## What's next

1. User reviews this spec, requests changes if any.
2. Draft the post at `src/content/blog/what-the-phd-gave-me.mdx`, replacing the current draft entirely. Use the prose blocks above as the body, plus a hook paragraph above the first H2 if needed.
3. Spec self-review on the drafted MDX against the voice contract.
4. User reviews the rendered post locally (`npm run dev`, visit `/blog/what-the-phd-gave-me` while in dev where drafts render).
5. Flip `draft: true` to `draft: false` when shipping.
