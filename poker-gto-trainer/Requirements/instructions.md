# Poker GTO Training Bot - Development Instructions

## What We're Building

A poker training website where users:
1. Sign in (with Clerk - free)
2. Get dealt random preflop hands
3. Choose actions (fold, bet, raise, call)
4. Get GTO feedback on their decisions
5. Track progress over time

**Tech Stack:** Next.js + Clerk + Supabase + shadcn/ui

**Everything is FREE** - All services have generous free tiers that are more than enough for this project.

---

## Quick Setup

### Prerequisites
- Node.js 18+ ([download free](https://nodejs.org/))
- Git ([download free](https://git-scm.com/))
- VS Code ([download free](https://code.visualstudio.com/))

### Initial Setup

**Option 1: Using npx (Recommended)**

```bash
# 1. Create Next.js app
npx create-next-app@latest poker-gto-trainer --typescript --tailwind --app --yes
cd poker-gto-trainer
```

**If you get an error, try:**

```bash
# Clear npm cache
npm cache clean --force

# Try again
npx create-next-app@latest poker-gto-trainer --typescript --tailwind --app --yes
```

**Option 2: Manual Setup (If npx fails)**

```bash
# 1. Create folder
mkdir poker-gto-trainer
cd poker-gto-trainer

# 2. Initialize npm project
npm init -y

# 3. Install Next.js and dependencies
npm install next@latest react@latest react-dom@latest typescript @types/react @types/node @types/react-dom tailwindcss postcss autoprefixer

# 4. Create tsconfig.json
npx tsc --init

# 5. Create next.config.js
echo "module.exports = {}" > next.config.js

# 6. Create app folder structure
mkdir app
mkdir app\api
mkdir lib
mkdir components
```

**Continue with setup:**

```bash
# 2. Install dependencies
npm install @clerk/nextjs @supabase/supabase-js

# 3. Initialize shadcn/ui
npx shadcn-ui@latest init
# Choose: TypeScript, Tailwind, Default style, App directory

# 4. Start dev server
npm run dev
```

Visit `http://localhost:3000` - you should see the Next.js welcome page.

**Common Issues:**

- **"Something went wrong"**: Clear npm cache with `npm cache clean --force` and try again
- **Network errors**: Check your internet connection, try again later
- **Permission errors**: Run terminal as administrator (Windows) or use `sudo` (Mac/Linux)
- **Node version**: Make sure you have Node.js 18+ (`node --version`)

---

## Step 1: Set Up Clerk (Authentication) - FREE

1. Go to [clerk.com](https://clerk.com) → Sign up (free account)
2. Create new application → Choose "Email" authentication
3. Copy your keys from the dashboard
4. Create `.env.local` in your project root:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

5. Update `app/layout.tsx`:

```typescript
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

6. Create sign-in page: `app/sign-in/[[...sign-in]]/page.tsx`

```typescript
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn />
    </div>
  )
}
```

7. Create sign-up page: `app/sign-up/[[...sign-up]]/page.tsx`

```typescript
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp />
    </div>
  )
}
```

**Test:** Visit `/sign-in` - you should see Clerk's sign-in page (free, beautiful, pre-built).

---

## Why Do We Need a Database? (Important!)

**The Problem:** When a user plays a hand, we need to **save** that data somewhere. If we don't:
- ❌ User's progress disappears when they refresh the page
- ❌ User's hand history is lost when they close the browser
- ❌ User's statistics reset every time they visit
- ❌ Different users can't have separate data

**The Solution:** A **database** stores data permanently (like a spreadsheet in the cloud).

**Think of it like this:**
- **Without database**: Like writing on paper - it disappears when you refresh
- **With database**: Like saving to Google Sheets - it's permanent and accessible

**What Supabase is:**
- Supabase = A free database service (like Google Sheets, but for apps)
- You create "tables" (like spreadsheet columns) to organize data
- You use JavaScript code to save/load data (not SQL in your app code!)

**The SQL queries you see:**
- You run them **once** in Supabase's dashboard to create the table structure
- After that, you use **JavaScript** to interact with the database
- Think of SQL as "setting up the spreadsheet columns" - you do it once, then use JavaScript to add/read rows

**What we're storing:**
- Each user's hand history (what cards they got, what they did)
- Each user's statistics (how many hands, how many correct, etc.)
- User profile info (email, username)

**You only write SQL once** - to create the tables. After that, everything is JavaScript!

**Simple Example:**

**Without Database (Bad):**
```javascript
// User plays a hand
let handHistory = []  // Stored in browser memory
handHistory.push({ cards: ['A♠', 'K♥'], action: 'raise' })

// User refreshes page → handHistory = [] (data lost!)
```

**With Database (Good):**
```javascript
// User plays a hand
await supabase.from('hand_history').insert({
  cards: ['A♠', 'K♥'],
  action: 'raise'
})

// User refreshes page → Data is still there!
// You can load it back: await supabase.from('hand_history').select()
```

**The SQL you write once** = Creating the "spreadsheet structure"  
**The JavaScript you write** = Adding/reading data from that spreadsheet

---

## Step 2: Set Up Supabase (Database) - FREE

1. Go to [supabase.com](https://supabase.com) → Sign up (free account)
2. Create new project (free tier is plenty)
3. Copy your project URL and anon key from Settings → API
4. Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

5. Create `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

6. In Supabase Dashboard → SQL Editor, run this **once** to create the tables:

```sql
-- This creates the "spreadsheet columns" - you only do this once!

-- Table 1: Store user info (links Clerk users to our database)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_user_id TEXT UNIQUE NOT NULL,
    email TEXT,
    username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: Store each hand a user plays
CREATE TABLE hand_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    cards TEXT[] NOT NULL,
    position TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    gto_recommendation TEXT,
    is_correct BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: Store user statistics (total hands, accuracy, etc.)
CREATE TABLE user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
    total_hands INTEGER DEFAULT 0,
    correct_actions INTEGER DEFAULT 0,
    gto_compliance DECIMAL(5,2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**What this does:** Creates 3 "tables" (like 3 spreadsheets) to store:
1. User profiles
2. Hand history (every hand played)
3. User statistics

**After this, you never write SQL again!** You'll use JavaScript code (shown in Step 7) to save/load data.

---

## Step 3: Create Protected Game Page

Create `app/game/page.tsx`:

```typescript
import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

export default async function GamePage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold">Poker GTO Trainer</h1>
      {/* Game components go here */}
    </div>
  )
}
```

---

## Step 4: Hand Dealing API Route

Create `app/api/hands/deal/route.ts`:

```typescript
import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'

const suits = ['♠', '♥', '♦', '♣']
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
const positions = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB']

export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Deal 2 random cards
  const card1 = ranks[Math.floor(Math.random() * ranks.length)] + 
                suits[Math.floor(Math.random() * suits.length)]
  const card2 = ranks[Math.floor(Math.random() * ranks.length)] + 
                suits[Math.floor(Math.random() * suits.length)]
  const position = positions[Math.floor(Math.random() * positions.length)]
  
  return NextResponse.json({
    cards: [card1, card2],
    position
  })
}
```

---

## Step 5: GTO Data

1. Search online for "free GTO preflop charts"
2. Create `lib/gto-ranges.json`:

```json
{
  "opening_ranges": {
    "UTG": "22+, A2s+, K9s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s, AJo+, KQo",
    "MP": "22+, A2s+, K2s+, Q9s+, J9s+, T9s, 98s, 87s, 76s, 65s, 54s, A2o+, K9o+, Q9o+, J9o+",
    "CO": "22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q2o+, J5o+, T6o+, 96o+, 86o+, 75o+, 64o+, 54o",
    "BTN": "22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q2o+, J5o+, T6o+, 96o+, 86o+, 75o+, 64o+, 54o",
    "SB": "22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q2o+, J5o+, T6o+, 96o+, 86o+, 75o+, 64o+, 54o",
    "BB": "22+, A2s+, K2s+, Q2s+, J2s+, T2s+, 92s+, 82s+, 72s+, 62s+, 52s+, 42s+, 32s, A2o+, K2o+, Q2o+, J5o+, T6o+, 96o+, 86o+, 75o+, 64o+, 54o"
  }
}
```

3. Create `lib/gto.ts`:

```typescript
import gtoRanges from './gto-ranges.json'

export function parseHand(cards: string[]): { rank: string; suit: string }[] {
  return cards.map(card => ({
    rank: card[0],
    suit: card[1]
  }))
}

export function isHandInRange(hand: string[], position: string): boolean {
  const range = gtoRanges.opening_ranges[position as keyof typeof gtoRanges.opening_ranges]
  if (!range) return false
  
  // Simple check - expand this logic based on range format
  // For now, return true for strong hands
  const ranks = hand.map(c => c[0])
  if (ranks[0] === ranks[1]) return true // Pairs
  if (ranks.includes('A') || ranks.includes('K')) return true // High cards
  
  return false
}

export function getGTORecommendation(hand: string[], position: string) {
  const inRange = isHandInRange(hand, position)
  
  if (inRange) {
    return { action: 'raise', confidence: 0.85 }
  } else {
    return { action: 'fold', confidence: 0.90 }
  }
}
```

---

## Step 6: Connect Clerk to Supabase

Create `app/api/sync-user/route.ts`:

```typescript
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get user from Clerk
  const clerkUser = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
    },
  }).then(res => res.json())
  
  // Create/update user in Supabase
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      clerk_user_id: userId,
      email: clerkUser.email_addresses[0]?.email_address,
      username: clerkUser.username || clerkUser.first_name,
    })
    .select()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ user: data[0] })
}
```

Call this API when user signs in (add to your game page or use Clerk webhooks).

---

## Step 7: Save Hand History (Using JavaScript, Not SQL!)

**This is where you actually use the database!** You'll use JavaScript code to save data - no SQL needed.

Create `app/api/hands/save/route.ts`:

```typescript
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const body = await request.json()
  const { cards, position, action_taken, gto_recommendation, is_correct } = body
  
  // Get Supabase user_id from Clerk user_id
  const { data: user } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()
  
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  
  // Save hand to database (using JavaScript, not SQL!)
  // This adds a new "row" to the hand_history "spreadsheet"
  const { data, error } = await supabase
    .from('hand_history')  // The table we created with SQL earlier
    .insert({              // Add a new row
      user_id: user.id,
      cards,
      position,
      action_taken,
      gto_recommendation,
      is_correct
    })
    .select()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  // Update user stats (using JavaScript, not SQL!)
  // This updates a row in the user_stats "spreadsheet"
  await supabase
    .from('user_stats')  // The table we created with SQL earlier
    .upsert({            // Update or create if doesn't exist
      user_id: user.id,
      total_hands: 1, // Increment this properly
      correct_actions: is_correct ? 1 : 0,
      gto_compliance: is_correct ? 100 : 0
    })
  
  return NextResponse.json({ hand: data[0] })
}
```

---

## Step 8: UI Components with shadcn/ui

Install components you need:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add slider
```

Use them in your game page:

```typescript
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Example usage
<Card className="p-6">
  <h2>Your Cards</h2>
  <div className="flex gap-2">
    <Badge>{cards[0]}</Badge>
    <Badge>{cards[1]}</Badge>
  </div>
  <div className="flex gap-2 mt-4">
    <Button onClick={handleFold}>Fold</Button>
    <Button onClick={handleCall}>Call</Button>
    <Button onClick={handleBet}>Bet</Button>
  </div>
</Card>
```

---

## Step 9: Deployment (FREE)

### Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → Sign up (free)
3. Click "Add New Project" → Import your GitHub repo
4. Add environment variables (copy from `.env.local`)
5. Click "Deploy"

**That's it!** Your site is live at `your-app.vercel.app`

### Update Clerk Settings

1. In Clerk dashboard → Paths
2. Add your Vercel URL to allowed URLs

### Update Supabase (if needed)

1. In Supabase dashboard → Settings → API
2. Add Vercel URL to allowed origins (if using CORS)

---

## Development Checklist

- [ ] Next.js app created and running
- [ ] Clerk account created, keys added to `.env.local`
- [ ] ClerkProvider added to layout
- [ ] Sign-in/sign-up pages created
- [ ] Supabase project created, keys added
- [ ] Database tables created
- [ ] Protected game page created
- [ ] Hand dealing API route works
- [ ] GTO ranges added
- [ ] Hand history saves to Supabase
- [ ] UI built with shadcn/ui components
- [ ] Deployed to Vercel

---

## Free Tier Limits (More Than Enough)

**Clerk:**
- 10,000 monthly active users (free)
- Unlimited sign-ups
- All auth features included

**Supabase:**
- 500MB database (plenty for thousands of hands)
- 2GB bandwidth/month
- 50,000 monthly active users

**Vercel:**
- Unlimited deployments
- 100GB bandwidth/month
- Automatic HTTPS

**All free tiers are sufficient for this project!**

---

## Next Steps

1. Build the poker table UI (use CSS/Tailwind to create table layout)
2. Add card graphics (use images or SVG)
3. Implement GTO lookup logic (expand the range checking)
4. Add user stats dashboard
5. Polish UI and add animations
6. Add more scenarios (3-bet, 4-bet, etc.)

---

## Resources

- [Next.js Docs](https://nextjs.org/docs) - Free
- [Clerk Docs](https://clerk.com/docs) - Free
- [Supabase Docs](https://supabase.com/docs) - Free
- [shadcn/ui Components](https://ui.shadcn.com) - Free
- [Tailwind CSS Docs](https://tailwindcss.com/docs) - Free

**Everything you need is free and well-documented!**

---

## Notes

- Start with basic functionality, polish later
- Test each feature as you build it
- Use TypeScript for better code quality
- ML is optional - focus on core features first
- All services have free tiers that are more than enough
