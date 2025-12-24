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