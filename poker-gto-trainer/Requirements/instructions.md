IMPLEMENTATION PROMPT — Leak-Weighted GTO + Inline “Why This Bet”

You are a senior poker-theory engineer and UI-focused frontend architect.

Build a Human-Leak–Aware GTO Mode for a poker solver–based web app. The UI must be clean, professional, and fast to scan. Do not build a training toy. Do not hide the logic behind navigation.

PRIMARY GOALS (NON-NEGOTIABLE)
1) Opponent archetype selection.
2) Leak-weighted EV recomputation.
3) Show pure GTO vs max-exploit line and EV delta.
4) Inline “Why This Bet Exists” tooltip for every action.
5) One-screen interaction with zero navigation friction.
6) No solver jargon in the UI.

CORE UX PRINCIPLES
- Single-screen interaction. No side panels, no page transitions, no modal stacks.
- Information appears exactly where attention already is.
- Readable in < 1 second. Reasoning in < 3 seconds.
- Professional, minimal, typography-driven layout.

TOP BAR (COMPACT)
Show context in a single row:
- Situation summary (stack depth, positions, board).
- Opponent archetype selector (text only, compact).
- Mode toggle (GTO vs Exploit) on right.

ARCHETYPE OPTIONS (TEXT ONLY)
- Solver-Like Reg (default)
- Over-Folds (esp. river)
- Station / Calls Too Much
- Scared Money
- Over-Aggressive / Over-Bluffs

ACTION VIEW (PRIMARY TABLE)
Render a clean vertical list (not cards, not floating buttons):
Action | Frequency | EV | Info
Bet 33% | Often | +1.12 | ℹ️
Bet 66% | Sometimes | +1.28 | ℹ️
Check | Rare | +0.94 | ℹ️

Rules:
- Entire row is clickable.
- No decimals by default (toggleable).
- In exploit mode, highlight EV delta subtly.
- When EV delta is small: “GTO is sufficient here.”

INLINE “WHY THIS BET” TOOLTIP (MANDATORY)
Interaction:
- Hover (desktop) or tap-hold (mobile) on ℹ️.
- Tooltip appears adjacent to the row.
- No overlay blocking other UI. No page jump.

Content format (strict):
Why Bet 66%
Targets
• One-pair hands
• Weak top pair
Folds Out
• Missed draws
• Low-equity bluff-catchers
Continues
• Strong top pair+
• Nut draws

Exploit note (only if exploit mode active):
Exploit Note
• Over-folders release bluff-catchers too often
• Larger sizing increases fold EV

Rules:
- Bullet points only.
- No solver jargon.
- No frequencies.
- No EV numbers.
- One-line bullets max.

LEAK-WEIGHTED LOGIC (MODEL/BACKEND)
Inputs per node:
- GTO strategy: frequencies, EV per action, range distributions.
- Alternative lines: different sizings, bluffs, thin value.

Archetype adjustments:
- Modify fold frequency by sizing and street.
- Modify call frequency by hand class cluster.
- Modify bluff-catch thresholds.

Computation:
- Keep GTO baseline fixed.
- EV_exploit(action) = Σ(adjusted outcomes × payoff)
- EV_delta = EV_exploit − EV_GTO

DATA MODEL REQUIREMENTS
For each action, precompute:
- Targeted hand clusters
- Folding hand clusters
- Continuing hand clusters

Use range grouping, not individual combos.
Tooltip content must update when:
- Board changes
- Opponent archetype changes
- Mode toggles

VISUAL & UX CONSTRAINTS (STRICT)
- One screen only.
- No modals.
- No solver trees.
- No range matrices by default.
- Neutral gray-based palette.
- Max two accent colors.
- No gradients, no poker-themed colors.
- Tooltips appear in ≤ 100ms, disappear instantly on mouse leave.
- Every action has hover state and disabled reason when applicable.

OUTPUT REQUIRED FROM YOU (AI)
- Architecture overview.
- React-style component breakdown.
- Tooltip data schema.
- Leak-weighting logic pseudocode.
- Example tooltip content for two actions.
- Explanation: how inline “Why This Bet” reduces cognitive load.
- Before vs after UI structure comparison.
- Screen layout diagram (text OK).
- UI ruleset (what never appears by default).

SUCCESS CRITERIA
- User understands recommendation in < 1 second.
- User understands reasoning in < 3 seconds.
- User never feels lost or overwhelmed.
IMPLEMENTATION PROMPT — FEATURE 1
Leak-Weighted GTO + Tactical Explanation Layer

You are a senior poker-theory engineer and product-focused frontend architect.

Your task is to implement Leak-Weighted GTO Mode with a beginner-friendly, modern UI, designed for real poker players (not solver experts).

The goal is to bridge pure GTO → real-world exploit, with simple visualizations and minimal cognitive load.

CORE USER FLOW (NON-NEGOTIABLE)
Step 1: Opponent Selection (Top of Screen)

User selects one opponent archetype from a small, human-readable list:

🟦 Solver-Like Reg (near GTO)

🟨 Over-Folds River

🟥 Station / Calls Too Much

🟩 Scared Money

🟪 Aggro / Over-Bluffs

UX rules

Icons + plain English

No jargon

One click selection

Default = Solver-Like Reg

Step 2: Action View (Primary Screen)

User sees ONE clear recommendation card, not a solver tree.

Recommended Action
Bet 66% Pot — Often

EV vs Solver Reg: +0.00
EV vs Over-Folder: +0.38 bb


Below the card:

Toggle:

◉ Pure GTO

◉ Exploit-Max

LEAK-WEIGHTED LOGIC (BACKEND REQUIREMENTS)
Solver Outputs Required

For each node:

Base GTO strategy

Alternative strategies (larger bets, more bluffs, thinner value)

Leak Modeling

Opponent archetypes modify:

Call frequencies

Fold frequencies

Bluff catch thresholds

Example:

Over-Folder:

Increase fold % on turn/river

Decrease bluff-catching region

Re-calculate EV for:

GTO line

Exploit line

Compute:

EV Delta = EV_exploit − EV_GTO

UI PRESENTATION (CRITICAL)
🔹 Comparison Strip (Visual, Not Numeric Heavy)
Mode	Action	EV
GTO	Bet 66%	+1.12
Exploit	Bet 75%	+1.50

Highlight EV Delta visually:

Green glow = meaningful gain

Gray = marginal

No decimals by default.
Advanced toggle shows raw numbers.

“WHY THIS BET EXISTS” LAYER (MANDATORY)

Each betting option has an ℹ️ icon.

On hover / tap, show a small, clean tooltip panel:

Example Tooltip Content

Why Bet 66%?

Pressures one-pair hands

Forces folds from weak top pair

Builds pot with strong value hands

Against This Opponent

Over-folders release too many bluff-catchers

Larger sizing increases fold EV

No solver jargon.
No frequency tables.
Natural language only.

RANGE EXPLANATION (OPTIONAL, COLLAPSED BY DEFAULT)

Expandable section:

“Hands that like this bet”

Show:

Value group

Bluffs

Marginal hands

Use group labels, not grids.

DESIGN CONSTRAINTS (STRICT)

❌ No solver trees on default view
❌ No 13×13 range matrices unless expanded
❌ No decimal spam
❌ No jargon without hover explanation

✅ Large buttons
✅ Clear hierarchy
✅ White space
✅ Mobile-friendly tap targets

BEGINNER-SAFE FAILS

If exploit EV gain < threshold:

Show label: “GTO is good enough here”

If exploit strategy is fragile:

Warn: “High EV but sensitive to mistakes”

OUTPUT REQUIREMENTS FROM YOU (THE AI)

UI component breakdown (React-style)

State flow diagram

Leak-weighting logic pseudocode

Example tooltip copy

Explanation of how this improves real-world decision-making

Do not over-engineer.
Do not expose solver internals by default.
Optimize for clarity, speed, and confidence.

WHY THIS PROMPT WORKS

Forces one clear mental model

Makes exploitative play visible and measurable

Keeps beginners safe while rewarding advanced users

Differentiates immediately from GTO Wizard / Pio viewers

Next steps (when you’re ready)

I can:

Turn this into exact React components

Design the Bet Comparison UI visually

Write the prompt for Feature #2 (Bet-Size Elasticity)

Help you decide what NOT to ship in v1

Say which one you want next.

it doesnt have to be a beginner friendly ui, just make sure its simple to read and very clean to navigate. 🧠 “Why This Bet” Inline

Each bet has:

ℹ️ icon

On hover:

What it targets

What it folds out

What continues

No side panel. No page jump. I also really want this feature

Got it. Not “beginnerified” — just clean, legible, professional.
Below is a tight, implementation-ready prompt focused on Leak-Weighted GTO + the inline “Why This Bet” system, with a modern, minimal UI that a serious poker player would respect.

No fluff. No onboarding hand-holding. Just clarity.

IMPLEMENTATION PROMPT — Leak-Weighted GTO + Inline “Why This Bet”

You are a senior poker-theory engineer and UI-focused frontend architect.

Implement Leak-Weighted GTO Mode with a minimal, clean, professional UI, optimized for fast comprehension and zero navigation friction.

The interface should feel closer to Bloomberg / Linear / Stripe than a training app.

CORE UX PRINCIPLES (STRICT)

Single-screen interaction

No side panels

No page transitions

No modal explosions

Information appears exactly where attention already is

Everything readable in < 1 second

LAYOUT STRUCTURE (ONE SCREEN)
Top Bar

Situation info (stack depth, position, board)

Opponent archetype selector (compact dropdown)

Solver-Like

Over-Folds

Station

Scared

Over-Aggro

No icons. Text only. Subtle.

Action Table (Primary Focus)

A clean vertical list, not buttons floating everywhere.

Action	Freq	EV	
Bet 33%	Often	+1.12	ℹ️
Bet 66%	Sometimes	+1.18	ℹ️
Check	Rare	+0.97	ℹ️

Entire row clickable

No sliders

No decimals by default (toggleable)

EV delta highlighted if exploit mode on

LEAK-WEIGHTED MODE
Toggle (Top Right)

◉ GTO

◉ Exploit

When Exploit is active:

Frequencies + EV recomputed

Subtle label appears:

“Adjusted for opponent tendencies”

No dramatic UI change.

🧠 INLINE “WHY THIS BET” (MANDATORY FEATURE)
Interaction

Hover (desktop) or tap-hold (mobile) on ℹ️

Tooltip appears adjacent to the action row

No overlay blocking other UI

Tooltip Content (Strict Format)
Why Bet 66%

Targets
• One-pair hands
• Weak top pair

Folds Out
• Missed draws
• Low equity bluff-catchers

Continues
• Strong top pair+
• Nut draws


Rules

Bullet points only

No solver jargon

No frequencies

No EV numbers

No sentences longer than one line

Exploit Context (If Applicable)

If Leak-Weighted mode is active, append:

Exploit Note
• Over-folders release too many bluff-catchers
• Larger sizing increases fold EV


This appears inside the same tooltip, not elsewhere.

LOGIC REQUIREMENTS (BACKEND / MODEL)

For each action:

Precompute:

Targeted hand classes

Folded hand classes

Continuing hand classes

Use range clustering, not exact combos

When opponent archetype changes:

Adjust cluster weights

Recompute EV

Update tooltip text dynamically

VISUAL DESIGN CONSTRAINTS

Font: Inter / Geist / SF Pro

Light or dark neutral theme

No gradients

No poker-themed colors

Max 2 accent colors

Tooltip:

Soft shadow

Rounded corners

Appears in ≤ 100ms

Disappears instantly on mouse leave

WHAT NOT TO DO

❌ No side explanation panel
❌ No clicking into another page
❌ No solver trees on hover
❌ No range matrices in tooltips
❌ No animation that delays information

OUTPUT EXPECTED FROM YOU

Component structure (React-style)

Tooltip data schema

Leak-weighting logic pseudocode

Example tooltip content for 2 actions

Explanation of how inline explanations reduce cognitive load

Optimize for:

speed

precision

professional clarity

WHY THIS FEATURE IS A KILLER

Teaches intent, not memorization

Keeps users in flow

Makes exploit logic legible without “training mode”

No competitor executes this cleanly

If you want next:

Feature #2 prompt (Bet-Size Elasticity, done cleanly)

Design system tokens (spacing, typography, color)

Data model for hand-class clustering

MASTER AI PROMPT — Human-Leak–Aware GTO + “Why This Bet Exists”

You are a senior poker-theory engineer and a product-focused frontend architect.

Your task is to design and implement a Human-Leak–Aware GTO Mode for a poker solver–based web app.

This feature must clearly show how pure GTO differs from exploitative play against real humans, using simple, clean visualizations and inline tactical explanations.

Do not build a training toy. Build a professional, modern poker tool.

FEATURE GOALS (NON-NEGOTIABLE)

Allow the user to select an opponent archetype

Re-weight solver EVs based on population mistakes

Show:

Pure GTO line

Max-exploit line

EV delta between them

Provide an inline “Why This Bet Exists” explanation on hover

Keep everything on one screen

Zero solver jargon in the UI

1️⃣ OPPONENT ARCHETYPE SELECTION

Implement a compact selector with these options:

Solver-Like Reg

Over-Folds (especially river)

Station / Calls Too Much

Scared Money

Over-Aggressive / Over-Bluffs

Rules

Single-select

Text only (no icons)

Default = Solver-Like Reg

Changing archetype recomputes EV immediately

2️⃣ LEAK-WEIGHTED EV MODEL
Base Inputs

GTO strategy outputs:

Frequencies

EV per action

Range distributions

Leak Adjustments

Each archetype modifies:

Fold frequencies

Call frequencies

Bluff-catch thresholds

Example:

Over-Folder:

Increase folds vs large bets

Reduce bluff-catch range

Recalculate:

EV_exploit(action) = Σ (adjusted outcomes × payoff)
EV_delta = EV_exploit − EV_GTO


Do not change the GTO baseline.
Exploit line must be computed relative to it.

3️⃣ ACTION DISPLAY (CORE UI)

Render actions in a clean vertical table:

Action	Frequency	EV	
Bet 33%	Often	+1.12	ℹ️
Bet 66%	Sometimes	+1.28	ℹ️
Check	Rare	+0.94	ℹ️

Rules

Entire row is clickable

EV delta highlighted when exploit mode active

No decimals by default (toggleable)

4️⃣ PURE GTO VS MAX-EXPLOIT COMPARISON

When exploit mode is active, visually show:

GTO line

Exploit-max line

EV delta

Example:

GTO: Bet 66% → +1.12
Exploit: Bet 75% → +1.47
ΔEV: +0.35


If EV delta is small:

“GTO is sufficient here”

5️⃣ 🧠 INLINE “WHY THIS BET EXISTS” (CRITICAL)

Each action has an ℹ️ icon.

Interaction

Hover (desktop) / tap-hold (mobile)

Tooltip appears next to the action

No side panels

No page transitions

Tooltip Content Structure (STRICT)
Why Bet 66%

Applies Pressure To
• One-pair hands
• Weak top pair

Folds Out
• Missed draws
• Low-equity bluff-catchers

Continues
• Strong top pair+
• Nut draws


If exploit mode is active, append:

Exploit Note
• Over-folders release bluff-catchers too often
• Larger sizing increases fold EV


Rules

Bullet points only

No frequencies

No solver terminology

No EV numbers

One-line bullets max

6️⃣ DATA MODEL REQUIREMENTS

For each action, precompute:

Targeted hand clusters

Folding hand clusters

Continuing hand clusters

Use range grouping, not individual combos.

Tooltip content must update dynamically when:

Board changes

Opponent archetype changes

7️⃣ VISUAL & UX CONSTRAINTS

One screen

No modals

No trees

No range matrices

Neutral color palette

Typography-driven hierarchy

Tooltips appear instantly (<100ms)

8️⃣ OUTPUT EXPECTED FROM YOU

Architecture overview

UI component breakdown

EV re-weighting pseudocode

Tooltip data schema

Example output for two opponent archetypes

Explanation of why this feature teaches better than raw GTO

DESIGN PHILOSOPHY

Existing GTO tools show what the solver does.
This feature shows what humans do wrong — and how to punish it.

Build accordingly.
TOOLTIPS OVER PANELS

All explanations must:

appear on hover

disappear instantly

never block other UI

stay spatially anchored

No sidebars.
No bottom drawers.
No pop-out windows.

RANGE & DATA VISUALIZATION RULES

Default:

Grouped hand classes

Natural language labels

Advanced toggle:

Full matrices

Frequencies

EV breakdowns

Never show both at once.

SPACING & READABILITY

Generous vertical spacing

No dense clusters

If unsure → remove 10% of UI elements

Whitespace = signal.

INTERACTION FEEDBACK

Every action must:

respond instantly

show hover state

show disabled reason

No silent failures. Ever.

THEMES & STYLE

Neutral palette (gray-based)

Light or dark, but not both at once

No poker clichés

No gradients

No flashy animations

OUTPUT REQUIRED FROM YOU

Before → After UI structure comparison

Screen layout diagram (textual is fine)

Component list with responsibility

UI ruleset (what never appears by default)

Explanation of how cognitive load is reduced

SUCCESS CRITERIA

A user should be able to:

understand the recommendation in < 1 second

understand the reasoning in < 3 seconds

never feel lost or overwhelmed