# Project overview:
We are building a poker training web application. First, we'll start with a player being dealt random preflop hands at a random number of people at the poker table, between 2-9. They must be able to choose between folding, betting, raising, calling with simple buttons, and this will be the user input. Based on the Game Theory Optimal approach, they will be given feedback with a feedback box in the bottom of the screen that tells them whether or not that was the right move and what to do for next time. 

#Feature requirements: 
Use Next.js, Shadcn, and Zustand for state management. 
Match the playing card visual style of the provided documents. 


Relevant documentation: 
@table_example1.png is the clubgg poker style that you should draw inspiration from. 
Current file structure:
poker-gto-trainer/
│
├── .next/                          # Next.js build output (auto-generated)
│   └── types/
│
├── app/                           # Next.js App Router directory
│   ├── api/                       # API routes
│   │   ├── hands/
│   │   │   ├── deal/
│   │   │   │   └── route.ts       # GET /api/hands/deal - Deal random hand
│   │   │   └── save/
│   │   │       └── route.ts       # POST /api/hands/save - Save hand history
│   │   └── sync-user/
│   │       └── route.ts           # POST /api/sync-user - Sync Clerk user to Supabase
│   │
│   ├── game/
│   │   └── page.tsx               # Protected game page (/game)
│   │
│   ├── sign-in/
│   │   └── [[...sign-in]]/
│   │       └── page.tsx           # Clerk sign-in page (/sign-in)
│   │
│   ├── sign-up/
│   │   └── [[...sign-up]]/
│   │       └── page.tsx           # Clerk sign-up page (/sign-up)
│   │
│   ├── favicon.ico                 # Site favicon
│   ├── globals.css                 # Global styles
│   ├── layout.tsx                  # Root layout (with ClerkProvider)
│   └── page.tsx                    # Home page (/)
│
├── components/                     # React components
│   └── ui/                         # shadcn/ui components (auto-generated)
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── badge.tsx
│       └── ...                     # Other shadcn components
│
├── lib/                            # Utility functions and configs
│   ├── supabase.ts                 # Supabase client configuration
│   ├── gto.ts                      # GTO lookup functions
│   └── gto-ranges.json             # GTO preflop range data
│
├── public/                         # Static assets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
│
├── Requirements/                   # Project documentation
│   └── frontend_instructions.md
│
├── node_modules/                   # Dependencies (auto-generated)
│
├── .env.local                      # Environment variables (create this, not in git)
├── .gitignore                      # Git ignore rules
├── eslint.config.mjs               # ESLint configuration
├── external_apis.md                # External APIs documentation
├── next-env.d.ts                   # Next.js TypeScript definitions
├── next.config.ts                  # Next.js configuration
├── package.json                    # npm dependencies and scripts
├── package-lock.json               # Locked dependency versions
├── postcss.config.mjs             # PostCSS configuration
├── README.md                       # Project readme
└── tsconfig.json                   # TypeScript configuration
New components should be placed in the components/ folder. Pages should be placed in the app/ folder. 

# Now for additional information: 
Part 1: Important Features Your Poker Trainer Web App Should Include

(These are high-value, incremental features that go beyond simply letting a user play to the river.)

A. Core Gameplay and Feedback

Real-Time Decision Feedback

Show the optimal GTO decision vs user choice at each action (fold/call/bet/raise).

Provide EV loss/gain or score for each decision. This is foundational to tools like LearnWPT. 
WPT GTO Trainer

Hand History Review

After a hand completes, provide a turn-by-turn analysis of key decisions and what the model (or solver) recommends at each point.

Range Visualization

Display recommended hand ranges for different positions (e.g., BTN vs BB 25bb).

Include range shading and equity metrics for clarity.

Game State Simulator

Users should be able to step through hands to see how different choices affect outcomes.

Session Tracking & Scoring

Track users’ performance over time with KPIs e.g., mistakes per 100 hands, EV loss totals, win rate changes.

B. Data and Model Features

Solver Integration

Integrate a GTO solver backend (or simplified solver) to generate “correct EV” decisions for trainer feedback.

Hand History Dataset Import

Allow users to upload their own hand histories (e.g., from PokerStars/Hand2Note) and get analysis.

Opponent Simulation

Let users practice against AI opponents with different styles (tight, aggressive, exploitative).

Adaptive Difficulty

Trainer can increase complexity as user improves (more bluff spots, deeper ranges, etc.).

Hand Context Awareness

Trainer should consider positional information, stack size, pot odds, and bet sizing dynamics when evaluating decisions.

C. Long-Term Training and Model Evolution

Self-Play Training Records

Optionally record self-play games where your model plays against itself to generate training data for improvement.

Upload Pro/Expert Data

Upload pro-level hand histories and use supervised learning to train model to imitate expert decisions.

Progressive Model Training

Allow users to choose between current play, solver play, or mixed training models.

Part 2: How to Train Your Poker AI Model (From “Dumb” to Strong AI)

Based on the Harvey Mudd PokerBot example and modern poker AI approaches, here’s a methodology you can follow: 
Harvey Mudd College

Step 1: Define the Game and Engine

Choose a game environment (Texas Hold’em NL, heads-up or multi-player).

Use an existing poker simulation environment (e.g., RLCard, PokerRL, or a custom engine). 
GitHub
+1

You’ll need:

Game state representation (board cards, hole cards, stacks).

Action space (fold/call/raise amounts).

Reward structure (final chip outcome).

Step 2: Generate Baseline Data

You may not find free professional hand histories, so:

Create a “dumb AI” baseline to automatically play many hands.

Simple rule-based baseline allows you to generate millions of training hands. 
Harvey Mudd College

Evaluate hand outcomes (e.g., win probability, pot equity using Monte Carlo evaluations).

This dataset can be used to:

Train supervised models to imitate naive baseline behavior.

Pretrain models before more advanced training.

Step 3: Supervised Learning Pretraining (Optional but Helpful)

Train a model to predict correct move given state features:

Input = game state, stack sizes, history of actions.

Output = suggested action (fold/call/bet) or action probabilities.

This accelerates early training and reduces random exploration.

Step 4: Reinforcement Learning / Self-Play Training

This is the key step for strategic improvement:

Algorithm Options:

Deep CFR / Monte Carlo CFR (standard for poker AI).

Learns approximate Nash equilibrium strategy using regret minimization over game tree. 
PyPI

Deep Q-Learning / NFSP / RL methods

Self-play where the model updates policy using rewards from outcomes. 
GitHub

Core Training Loop:

Self-play matches

Model plays against itself or a pool of strategies.

Reward assignment

Reward = chips won/lost at showdown or end of hand.

Update policy

Use learning algorithm (CFR, DQN, policy gradient, etc.).

Repeat over many episodes

Continue until strategies converge or performance stabilizes.

Note: Early experiments often trained a neural network to imitate a baseline AI first, then moved to RL. 
Harvey Mudd College

Step 5: Evaluation and Improvement

Evaluate trained models against:

Random bots

Rule-based bots

Solver’s GTO baseline

Use metrics like win rate, exploitability, or EV loss compared to solver.

Part 3: What You Might Be Missing If Your App Is “Initial Only”

A minimal app that lets users play to the river is helpful, but it lacks key training infrastructure:

Missing Features Checklist

Solver feedback and EV tracking

Hand history import/analysis

Range visualizer and equity graphs

Automated opponent behavior variation

Adaptive training difficulty

Model training pipeline (either supervised or RL)

Part 4: Practical Tooling & Libraries You Can Use
Purpose	Tools / Libraries
Simulation environment	RLCard, PokerRL
Solver integration	Custom CFR solvers, existing poker solvers
Reinforcement learning	Deep CFR implementations, DQN
Dataset generation	Rule-based bots for synthetic data
Monitoring training	TensorBoard, training metrics

Part 1: Important Features Your Poker Trainer Web App Should Include

(These are high-value, incremental features that go beyond simply letting a user play to the river.)

A. Core Gameplay and Feedback

Real-Time Decision Feedback

Show the optimal GTO decision vs user choice at each action (fold/call/bet/raise).

Provide EV loss/gain or score for each decision. This is foundational to tools like LearnWPT. 
WPT GTO Trainer

Hand History Review

After a hand completes, provide a turn-by-turn analysis of key decisions and what the model (or solver) recommends at each point.

Range Visualization

Display recommended hand ranges for different positions (e.g., BTN vs BB 25bb).

Include range shading and equity metrics for clarity.

Game State Simulator

Users should be able to step through hands to see how different choices affect outcomes.

Session Tracking & Scoring

Track users’ performance over time with KPIs e.g., mistakes per 100 hands, EV loss totals, win rate changes.

B. Data and Model Features

Solver Integration

Integrate a GTO solver backend (or simplified solver) to generate “correct EV” decisions for trainer feedback.

Hand History Dataset Import

Allow users to upload their own hand histories (e.g., from PokerStars/Hand2Note) and get analysis.

Opponent Simulation

Let users practice against AI opponents with different styles (tight, aggressive, exploitative).

Adaptive Difficulty

Trainer can increase complexity as user improves (more bluff spots, deeper ranges, etc.).

Hand Context Awareness

Trainer should consider positional information, stack size, pot odds, and bet sizing dynamics when evaluating decisions.

C. Long-Term Training and Model Evolution

Self-Play Training Records

Optionally record self-play games where your model plays against itself to generate training data for improvement.

Upload Pro/Expert Data

Upload pro-level hand histories and use supervised learning to train model to imitate expert decisions.

Progressive Model Training

Allow users to choose between current play, solver play, or mixed training models.

Part 2: How to Train Your Poker AI Model (From “Dumb” to Strong AI)

Based on the Harvey Mudd PokerBot example and modern poker AI approaches, here’s a methodology you can follow: 
Harvey Mudd College

Step 1: Define the Game and Engine

Choose a game environment (Texas Hold’em NL, heads-up or multi-player).

Use an existing poker simulation environment (e.g., RLCard, PokerRL, or a custom engine). 
GitHub
+1

You’ll need:

Game state representation (board cards, hole cards, stacks).

Action space (fold/call/raise amounts).

Reward structure (final chip outcome).

Step 2: Generate Baseline Data

You may not find free professional hand histories, so:

Create a “dumb AI” baseline to automatically play many hands.

Simple rule-based baseline allows you to generate millions of training hands. 
Harvey Mudd College

Evaluate hand outcomes (e.g., win probability, pot equity using Monte Carlo evaluations).

This dataset can be used to:

Train supervised models to imitate naive baseline behavior.

Pretrain models before more advanced training.

Step 3: Supervised Learning Pretraining (Optional but Helpful)

Train a model to predict correct move given state features:

Input = game state, stack sizes, history of actions.

Output = suggested action (fold/call/bet) or action probabilities.

This accelerates early training and reduces random exploration.

Step 4: Reinforcement Learning / Self-Play Training

This is the key step for strategic improvement:

Algorithm Options:

Deep CFR / Monte Carlo CFR (standard for poker AI).

Learns approximate Nash equilibrium strategy using regret minimization over game tree. 
PyPI

Deep Q-Learning / NFSP / RL methods

Self-play where the model updates policy using rewards from outcomes. 
GitHub

Core Training Loop:

Self-play matches

Model plays against itself or a pool of strategies.

Reward assignment

Reward = chips won/lost at showdown or end of hand.

Update policy

Use learning algorithm (CFR, DQN, policy gradient, etc.).

Repeat over many episodes

Continue until strategies converge or performance stabilizes.

Note: Early experiments often trained a neural network to imitate a baseline AI first, then moved to RL. 
Harvey Mudd College

Step 5: Evaluation and Improvement

Evaluate trained models against:

Random bots

Rule-based bots

Solver’s GTO baseline

Use metrics like win rate, exploitability, or EV loss compared to solver.

Part 3: What You Might Be Missing If Your App Is “Initial Only”

A minimal app that lets users play to the river is helpful, but it lacks key training infrastructure:

Missing Features Checklist

Solver feedback and EV tracking

Hand history import/analysis

Range visualizer and equity graphs

Automated opponent behavior variation

Adaptive training difficulty

Model training pipeline (either supervised or RL)

Part 4: Practical Tooling & Libraries You Can Use
Purpose	Tools / Libraries
Simulation environment	RLCard, PokerRL
Solver integration	Custom CFR solvers, existing poker solvers
Reinforcement learning	Deep CFR implementations, DQN
Dataset generation	Rule-based bots for synthetic data
Monitoring training	TensorBoard, training metrics