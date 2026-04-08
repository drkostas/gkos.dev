# New Repo Setup Plan

## Pre-requisites
- [ ] Old repo has all current changes committed and pushed
- [ ] No pending PRs on the old repo

## Step 1: Create New Private Repo
```bash
cd ~/Insync/Gdrive/Projects/
gh repo create drkostas/portfolio-v2 --private --description "New portfolio + blog (Astro)" --clone
cd portfolio-v2
```

## Step 2: Initialize Astro
```bash
npm create astro@latest . -- --template minimal --typescript strict --install --git
```
Or use a blog starter:
```bash
npm create astro@latest . -- --template blog --typescript strict --install --git
```

## Step 3: Add CLAUDE.md
- Copy from `docs/plans/new-repo-claude-md-draft.md` in the old repo
- Adjust paths as needed

## Step 4: Copy Design Docs
```bash
mkdir -p docs/plans docs/research
cp -r ../drkostas.github.io/docs/plans/concepts/ docs/plans/concepts/
cp ../drkostas.github.io/docs/plans/2026-04-06-portfolio-redesign.md docs/plans/
cp ../drkostas.github.io/docs/plans/concepts/08b-pokemon-expanded.md docs/plans/
cp -r ../drkostas.github.io/docs/research/ docs/research/
```

## Step 5: Copy Data Files (as reference)
```bash
mkdir -p data/reference
cp ../drkostas.github.io/pages/api/ml-projects.json data/reference/
cp ../drkostas.github.io/pages/api/published-papers.json data/reference/
cp ../drkostas.github.io/pages/api/experience.json data/reference/
cp ../drkostas.github.io/pages/api/pypi-projects.json data/reference/
cp ../drkostas.github.io/pages/api/bots-projects.json data/reference/
cp ../drkostas.github.io/pages/api/misc-projects.json data/reference/
```
These will be converted to Astro Content Collections later.

## Step 6: Add .gitignore
Ensure these are gitignored:
```
node_modules/
dist/
.astro/
.env
.env.local
.references/
.playwright-mcp/
```

## Step 7: Initial Commit and Push
```bash
git add -A
git commit -m "Initial Astro scaffold with design docs and data reference"
git push -u origin main
```

## Step 8: Set Up Claude Code Memory for New Repo
Create memory files at:
`~/.claude/projects/-Users-gkos-Insync-Gdrive-Projects-portfolio-v2/memory/`

These should reference the old repo location and all design decisions.

## NOT YET (do later):
- ❌ Rename old repo (do when new site is ready to launch)
- ❌ Set up Vercel (do when ready for preview deployments)
- ❌ Transfer domain (do at launch)
- ❌ Update orchestrator (do after repo is created)

## Folder Structure After Setup
```
~/Insync/Gdrive/Projects/
  drkostas.github.io/          ← old repo (untouched, still live)
    .references/
      braydoncoyer.dev/        ← reference codebase
    docs/
      plans/                   ← design docs (originals)
      research/                ← portfolio research
    pages/api/                 ← data files (source of truth until migrated)
  portfolio-v2/                ← NEW repo
    CLAUDE.md                  ← comprehensive context for new sessions
    docs/
      plans/                   ← copied design docs
      research/                ← copied research
    data/
      reference/               ← copied data files
    src/                       ← Astro source
    astro.config.mjs
    tailwind.config.mjs
    package.json
```
