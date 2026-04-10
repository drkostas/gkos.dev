# Explore Mode — Full Dialog Scripts

> Every NPC's exact dialog lines. Ready to paste into npcs.ts / interiors.ts.
> Lines are broken to fit the ~30-char Pokemon dialog box width.
> `→ Yes/No` indicates a choice prompt. `♪` indicates a sound cue.

---

## GYM TRAINERS (PhD Papers)

### Trainer 1: mCL-LC — pos (3,19) gym interior
```
speakerName: "RESEARCHER ANNA"

"I study AERIAL IMAGERY!"
""
"My research uses CONTRASTIVE"
"LEARNING at multiple levels to"
"SEGMENT satellite photos."
""
"Published at WACV 2023!"
""
"Want to add this paper"
"to your collection?"
→ YES: "♪ Paper 'mCL-LC' added to PAPERS!"
→ NO: "Come back when you're ready."
```

### Trainer 2: Cross-Scale MAE — pos (1,16) gym interior
```
speakerName: "RESEARCHER BLAKE"

"MASKED AUTOENCODERS are amazing..."
"But what if they could work at"
"MULTIPLE SCALES at once?"
""
"That's what Cross-Scale MAE does!"
"Accepted at NEURIPS 2023!"
""
"Want the paper?"
→ YES: "♪ Paper 'Cross-Scale MAE' added to PAPERS!"
→ NO: "Your loss! ...For now."
```

### Trainer 3: Multi-Scale RS Fine-Tuning — pos (1,13) gym interior
```
speakerName: "RESEARCHER CHEN"

"SELF-SUPERVISED models are great..."
"But FINE-TUNING them for REMOTE"
"SENSING is surprisingly tricky!"
""
"I found the best strategies."
"Published at IGARSS 2024!"
""
"Interested in the paper?"
→ YES: "♪ Paper 'Multi-Scale RS' added to PAPERS!"
→ NO: "Maybe after more training."
```

### Trainer 4: Trustworthy AI for Dementia — pos (2,9) gym interior
```
speakerName: "RESEARCHER DIANA"

"AI can detect DEMENTIA early..."
"But can we TRUST it?"
""
"My research focuses on making"
"AI TRANSPARENT and RELIABLE"
"for clinical diagnosis."
""
"IEEE CHASE 2025!"
""
"Want to read about it?"
→ YES: "♪ Paper 'Trustworthy AI' added to PAPERS!"
→ NO: "Trust the process!"
```

### Trainer 5: MEDiC — pos (5,6) gym interior
```
speakerName: "RESEARCHER EMMA"

"CLIP is incredibly powerful..."
"But too BIG for hospitals!"
""
"MEDiC DISTILLS CLIP's knowledge"
"into tiny models that work"
"on medical imaging!"
""
"ArXiv 2026 — hot off the press!"
""
"Want the preprint?"
→ YES: "♪ Paper 'MEDiC' added to PAPERS!"
→ NO: "The preprint isn't going anywhere."
```

### Trainer 6: ExPLoRe — pos (4,4) gym interior
```
speakerName: "RESEARCHER FRANK"

"REMOTE SENSING images are huge..."
"Normal models can't see the"
"BIG PICTURE."
""
"ExPLoRe captures LONG-RANGE"
"dependencies that others miss!"
""
"Under review at ECCV 2026!"
""
"Want an early look?"
→ YES: "♪ Paper 'ExPLoRe' added to PAPERS!"
→ NO: "It'll be public soon anyway!"
```

### Gym Leader KOSTAS — pos (5,2) gym interior

**Dialog is DYNAMIC based on state. See design doc §8.**

Base dialog (first visit, no badges yet):
```
speakerName: "LEADER KOSTAS"

"So you made it through."
""
"I'm KOSTAS. I built this world"
"from my PhD research."
""
"6 papers. 5 venues."
"From WACV to NeurIPS to ECCV."
""
"You've read them all."
""
"Take the GYM BADGE."
→ "♪ You received GYM BADGE!"
""
"And this — my DISSERTATION."
"Everything I've learned in one"
"document."
→ "♪ You received DISSERTATION.PDF!"
""
"But your journey isn't over."
"There's more to discover"
"out there."
```

Badge claim dialog (when player has completed a milestone):
```
"Back again?"
""
"I see you [MILESTONE DESCRIPTION]."
""
"Take this."
→ "♪ You received [BADGE NAME]!"
""
[KOSTAS-SPECIFIC COMMENT PER BADGE]
```

Nothing new dialog:
```
"Good to see you."
"Nothing new to report."
""
"Keep coming back."
"Every 5 new discoveries unlock"
"a RESEARCH LOG entry."
""
"The earlier you start, the more"
"of my story you'll uncover."
```

New content detected dialog:
```
"Hey. Things changed since"
"your last visit."
""
"[N] new PROJECTS appeared."
"[N] new BLOG POSTS are out."
""
"Go find them."
"Your [BADGE] dropped to SILVER."
"Bring it back to GOLD."
```

All 7 non-champion badges earned:
```
"..."
""
"You did it."
"Every badge. Every paper."
"Every project. Every blog."
"Every skill."
""
"I don't give this to anyone."
""
→ "♪ You received KOSTAS's NUMBER!"
""
"If you ever want to talk ML,"
"or have an opportunity..."
"Call me. I mean it."
```

### Gym Guide — pos (7,20) gym interior
```
speakerName: "GYM GUIDE"

"Hey! This GYM holds KOSTAS's"
"PhD research!"
""
"Talk to each TRAINER to collect"
"their papers."
""
"When you've got all 6, the"
"LEADER will be impressed!"
```

---

## ROUTE PAPER TRAINERS (Non-PhD)

### Hybrid Girvan-Newman — Route 117 (25,58)
```
speakerName: "VETERAN GEORGE"

"I've been here since 2019..."
""
"Back then I studied COMMUNITY"
"DETECTION in social networks."
""
"Combining topology with user"
"content... it was revolutionary!"
""
"It's KOSTAS's oldest paper."
"Want to read the classic?"
→ YES: "♪ Paper 'Hybrid Girvan-Newman' added to PAPERS!"
→ NO: "History repeats itself, you know."
```

### Occasionally Secure — Route 118 (97,57)
```
speakerName: "HACKER YUKI"

"I tested GPT-3.5, GPT-4, Bard,"
"and Gemini..."
""
"Can LLMs write SECURE code?"
""
"The answer is... OCCASIONALLY."
""
"61 code outputs analyzed across"
"9 tasks. Scary results."
""
"Want the security analysis?"
→ YES: "♪ Paper 'Occasionally Secure' added to PAPERS!"
→ NO: "Your code might not be secure either..."
```

### Teaching Assistant Pseudo-Labels — Route 111 (62,40)
```
speakerName: "TUTOR MARCUS"

"SEMI-SUPERVISED DETECTION is hard."
""
"The pseudo-labels are noisy..."
"So I added a TEACHING ASSISTANT"
"to clean them up!"
""
"Better labels, better models!"
""
"Want to learn the technique?"
→ YES: "♪ Paper 'Teaching Assistant' added to PAPERS!"
→ NO: "Class dismissed... for now."
```

### Koopman Transition Detection — Route 110 (62,82)
```
speakerName: "ENGINEER SARAH"

"CONSTRUCTION SITES change over time."
""
"I use KOOPMAN OPERATOR theory"
"to detect TRANSITION POINTS"
"in satellite imagery!"
""
"IGARSS 2024 — material histograms"
"tell the whole story."
""
"Interested?"
→ YES: "♪ Paper 'Koopman Transition' added to PAPERS!"
→ NO: "The transitions keep happening anyway."
```

---

## MAUVILLE CITY NPCs

### Woman (68,56) — Blog NPC #1
```
speakerName: "BLOGGER LISA"

"Have you read KOSTAS's latest"
"blog post?"
""
"It's about [BLOG TITLE]."
"[BLOG BRIEF DESCRIPTION]."
""
"Want me to save it?"
→ YES: "♪ Blog '[TITLE]' added to BLOG POSTS!"
→ NO: "I'll be here if you change your mind."

[After giving blog:]
"Oh, by the way..."
"I saw something shiny near the"
"FLOWERS on Route 117."
"Might be worth checking out!"
```

### Fat Man (63,57) — Flavor + hint
```
speakerName: "TRAVELER"

"KOSTAS came all the way from"
"GREECE to study ML in America!"
""
"Halkida to Tennessee..."
"That's further than Route 117!"
""
"Speaking of routes..."
"Try pressing A on empty ground"
"sometimes. You might find"
"something HIDDEN!"
```

### Rich Boy (74,60) — Flavor
```
speakerName: "RICH BOY"

"8,300 followers on GitHub!"
"That's more fans than most"
"GYM LEADERS have!"
""
"Have you checked the TALL GRASS"
"on the routes? Wild PROJECTS"
"are hiding out there!"
```

### Maniac (64,61) — Flavor + hint
```
speakerName: "MANIAC"

"I'm digging for RARE EMBEDDINGS!"
""
"Someone told me there's a"
"HIDDEN ITEM buried somewhere"
"in this city..."
""
"Try walking around and pressing A"
"on empty tiles near the center!"
```

### School Kid (67,64) — Blog NPC #2
```
speakerName: "STUDENT ALEX"

"KOSTAS promised a blog about"
"[BLOG TITLE]!"
""
"[BLOG BRIEF DESCRIPTION]."
""
"Want me to add it to your BAG?"
→ YES: "♪ Blog '[TITLE]' added to BLOG POSTS!"
→ NO: "Can't wait to read it myself!"

[After giving blog:]
"The MART keeper tracks your STEPS."
"Walk enough and you earn SKILLS!"
```

### Boy (79,66) — Flavor
```
speakerName: "BOY"

"The GYM is SO COOL!"
""
"There are RESEARCHERS inside"
"who will tell you about their"
"papers!"
""
"Talk to ALL of them before"
"you reach the LEADER!"
```

### Spotify Guy (57,57) — Live Spotify data
```
speakerName: "DJ BEAT"

[If track playing:]
"♪ Yo! KOSTAS is vibing to:"
""
"[TRACK NAME]"
"by [ARTIST]"
""
"Good taste, right?"
""
"Come back later to see what"
"he's listening to next!"

[If nothing playing:]
"♪ Silence right now..."
"KOSTAS must be in deep focus."
"Coding sessions = no music."
""
"Come back later!"
```

---

## POKéMON CENTER NPCs

### Nurse Joy (7,2)
First visit:
```
speakerName: "NURSE JOY"

"Welcome to the POKéMON CENTER!"
"Let me check your team..."
"..."
"Your POKéMON are in perfect health!"
""
"Since you're new, some tips:"
""
"ARROWS to move."
"A / ENTER / SPACE to interact."
"ESC / M to open the MENU."
"SHIFT to run!"
""
"Talk to everyone — they might"
"give you BLOG POSTS or items!"
```

Subsequent visits (rotating):
```
[1] "All healthy! Have you checked
     the TALL GRASS south of town?"

[2] "Perfect health! Don't forget
     the GYM — KOSTAS gives BADGES!"

[3] "All good! The PC in the corner
     has your SKILL STORAGE."

[4] "Healthy team! The MART keeper
     tracks your STEPS for TMs!"

[5] "Looking good! Someone hid items
     near the western FLOWERS..."
```

### Strava Nerd (11,4)
```
speakerName: "FITNESS NERD"

[Active this week:]
"KOSTAS never stops training!"
"This week:"
"  [Activity 1]"
"  [Activity 2]"  
"  [Activity 3]"
""
"YTD: [X]km across [N] runs!"

[Quiet this week:]
"KOSTAS hasn't trained this week."
"Must be in CRUNCH MODE on a paper!"

[Long break:]
"No workouts for a whole month!"
"Probably writing his DISSERTATION."
```

### Youngster (2,7)
```
speakerName: "YOUNGSTER"

"Have you checked the POKéDEX?"
""
"Walk through GRASS on the routes"
"to find wild PROJECTS!"
""
"Each one tells you about"
"something KOSTAS built!"
```

---

## POKéMART NPCs

### Clerk (1,3)
```
speakerName: "CLERK"

"Welcome to the POKéMART!"
""
"We stock the finest PyPI packages!"
""
"yaml-config-wrapper... 580/mo"
"termcolor-logger...... 420/mo"
"cloud-filemanager..... 310/mo"
"high-sql.............. 290/mo"
"bench-utils........... 180/mo"
"pyemail-sender........ 150/mo"
"garmin-auth........... 120/mo"
""
"Downloads per month — that's"
"our currency around here!"
```

### Step Tracker (5,5)
```
speakerName: "STEP COUNTER"

"I count every step trainers take!"
""
"You've walked [N] steps!"
""
[Lists milestones with ✓/▶/✗ status]
""
"Keep walking!"
```

### Developer (2,6)
```
speakerName: "DEVELOPER"

"I just deployed to the CLOUD!"
""
"KOSTAS has a Cloud-DevOps"
"toolkit that makes it easy."
""
"High availability, auto-scaling..."
"The works!"
""
"Check out Route 118 for some"
"DEPLOYMENT-themed PROJECTS!"
```

---

## DAY CARE MAN — Route 117 (37,54)

```
speakerName: "DAY CARE MAN"

"Welcome to the PROJECT DAY CARE!"
""
"We train PROJECTS day and night!"
"KOSTAS has been busy too —"
""
"He made [N] commits this week!"
"Most active: [REPO NAME]"
""
"Fun fact: [TOTAL] contributions"
"this year!"
""
"That's like walking from MAUVILLE"
"to EVER GRANDE CITY... twice!"
```

---

## OVERWORLD POKEMON (sample dialog)

### Snorlax (68,9) — Route 111
```
speakerName: "???"

"A huge SNORLAX is blocking"
"the path!"
"..."
"Zzz... Zzz..."
""
"It's dreaming about the next"
"NEURIPS deadline."
"You can't wake it up."

→ "♪ SNORLAX registered in POKéDEX!"
```

### Generic overworld Pokemon template
```
[Pokemon cry SFX]

"A wild [SPECIES] is here!"
""
"[Project description line 1]"
"[Project description line 2]"

→ "♪ [SPECIES] registered in POKéDEX!"
```

---

## MAGMA VS AQUA (ML Scaling Debate)

### Aqua Grunts (left side, facing right)
```
Row 57: "MORE DATA is the answer! Expand the TRAINING SET like expanding the sea!"
Row 58: "We believe in DATA AUGMENTATION! Every crop, every flip, every rotation!"
Row 59: "Our leader studies DATASET DISTILLATION! Compress the ocean into a drop!"
Row 60: "You can't train without DATA! It's the foundation of everything!"
Row 61: "Heh... you think BIGGER MODELS can replace BIGGER DATASETS?"
```

### Magma Grunts (right side, facing left)
```
Row 57: "BIGGER MODELS are the answer! Scale the PARAMETERS like expanding the land!"
Row 58: "We believe in ARCHITECTURE SEARCH! The right structure beats more data!"
Row 59: "MAXIE will awaken FOUNDATION MODELS! GPT proved scale is all you need!"
Row 60: "More PARAMETERS means more CAPACITY! That's basic ML theory!"
Row 61: "We won't lose to you DATA-HOARDING fools! Quality over quantity!"
```

### Poochyena (between the grunts)
```
All: "Grrr...!" or "Bark bark!" or "Rrruff!"
→ Each registers as a Pokedex entry on first interaction
```

---

## SIGNS (key ones rewritten)

### Mauville City Sign (69,55)
```
"MAUVILLE CITY"
"Where ML meets adventure!"
```

### Gym Sign (61,55)
```
"MAUVILLE GYM"
"Leader: KOSTAS"
"Specialty: COMPUTER VISION"
```

### Day Care Sign (39,55)
```
"PROJECT DAY CARE"
"Leave your models with us!"
"Commits tracked in real time."
```

### Game Corner (61,62)
```
"GAME CORNER"
"CLOSED FOR RENOVATION"
"Coming soon: HYPERPARAMETER TUNING!"
```

### Bike Shop (83,55)
```
"RYDEL'S PIPELINES"
"Fast deployment rigs"
"OPENING SOON"
```

### Blog Tower (79,53)
```
"MAUVILLE BROADCAST TOWER"
"Currently off-air."
"New BLOGGERS arriving soon!"
```

### Route Signs
```
Route 117 west:  "ROUTE 117 — West to Verdanturf (Closed)"
Route 117 east:  "ROUTE 117 — East to Mauville City"
Route 118 west:  "ROUTE 118 — West to Mauville City"  
Route 118 east:  "ROUTE 118 — East to Route 119 (Closed)"
Route 110 north: "ROUTE 110 — North to Mauville City"
Route 110 south: "ROUTE 110 — South to Slateport (Closed)"
Route 111 south: "ROUTE 111 — South to Mauville City"
Route 111 north: "ROUTE 111 — North to Route 112 (Closed)"
```

---

## PROFESSOR OAK INTRO (first load only)

```
[Black screen, fade in]

"Hello there!"
"Welcome to the world of"
"MACHINE LEARNING!"
""
"My name is OAK."
"People call me the"
"ML PROFESSOR."
""
"This world is inhabited by"
"creatures called PROJECTS."
""
"For some people, PROJECTS"
"are tools."
"Others use them for research."
""
"But first, tell me about"
"yourself."
""
"What is your name?"
→ [Text input]
""
"Right! So your name is"
"[NAME]!"
""
"Are you a boy?"
"Or are you a girl?"
→ BOY / GIRL
""
"[NAME]!"
""
"Your very own ML adventure"
"is about to unfold!"
""
"A world of dreams and"
"discoveries with PROJECTS"
"awaits!"
""
"Let's go!"

[Fade to black → spawn in Mauville]
```

---

## RESEARCH LOG ENTRIES

```
#1 (5 discoveries):
"Why I left Greece for a PhD"
"I grew up in Halkida. Small town."
"Everyone said stay, get a safe job."
"But I couldn't stop thinking about"
"neural networks. So I got on a"
"plane to Tennessee."

#2 (10 discoveries):
"The NeurIPS rejection"
"My first submission was desk-rejected."
"Reviews were brutal. Almost quit."
"Rewrote everything from scratch."
"Cross-Scale MAE was born from that."

#3 (15 discoveries):
"Building FleetSmart at 2 AM"
"Dissertation by day, maritime AI"
"startup by night. My advisor thought"
"I was crazy. 40 enterprise vessels"
"later... maybe I was."

#4 (20 discoveries):
"The day MaskDistill hit 1000 stars"
"Woke up to 200 GitHub notifications."
"Someone shared it on Hacker News."
"Open source isn't just code."
"It's community."

#5 (25 discoveries):
"Why I open-source everything"
"Every paper, tool, package."
"Because someone in Greece right now"
"is where I was 8 years ago."
"They need this."

#6 (30 discoveries):
"Defending the PhD"
"April 2026. Five years of work."
"Ten papers. One dissertation."
"Dr. Qi said 'you're ready.'"
"Turns out she was right."

#7 (35 discoveries):
"The Amazon interview"
"Applied Scientist L5."
"They asked me to design an ML system"
"from scratch. I drew the architecture"
"of FleetSmart on the whiteboard."
"Got the offer that afternoon."

#8 (40 discoveries):
"What's next"
"I keep building. Keep publishing."
"Keep open-sourcing."
"The game never ends."
"It just gets more interesting."
```
