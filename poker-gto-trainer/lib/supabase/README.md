# Supabase Backend Integration

This directory contains the Supabase client configuration and database utility functions for the Poker GTO Trainer application.

## Setup

1. **Environment Variables**: Add these to your `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Optional, for admin operations
   ```

2. **Database Schema**: Ensure you've run the SQL migration in Supabase SQL Editor (see `Requirements/backend_instructions.md`)

## Files

### `client.ts`
- Client-side Supabase client for use in React components
- Uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### `server.ts`
- Server-side Supabase clients
- `createServerClient()`: For API routes and server components (uses cookies for auth)
- `createAdminClient()`: For admin operations (uses service role key)

### `database.ts`
- Database utility functions for CRUD operations
- Functions for: profiles, training_sessions, hands, user_decisions, datasets, gto_solutions

### `auth-helpers.ts`
- Helper functions for Clerk user synchronization
- `getOrCreateProfile()`: Ensures user has a profile
- `syncClerkUser()`: Syncs Clerk user with Supabase

## API Routes

### `/api/sync-user` (POST)
- Syncs Clerk user with Supabase profile
- Call after user signs in

### `/api/sessions/create` (POST)
- Creates a new training session
- Body: `{ datasetId?: string }`
- Returns: `{ success: true, session: {...} }`

### `/api/sessions/list` (GET)
- Lists all training sessions for the current user
- Returns: `{ success: true, sessions: [...] }`

### `/api/hands/save` (POST)
- Saves a hand and optionally a decision
- Body: `{ sessionId: string, handData: {...}, decision?: {...} }`
- Returns: `{ success: true, handId: string }`

## Usage Examples

### Creating a Training Session
```typescript
const response = await fetch('/api/sessions/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ datasetId: 'uuid-here' }),
});
const { session } = await response.json();
```

### Saving a Hand
```typescript
const response = await fetch('/api/hands/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: session.id,
    handData: { /* hand data */ },
    decision: {
      action: 'raise',
      is_correct: true,
      feedback: 'Good decision',
      bet_size_bb: 3.5,
    },
  }),
});
```

### Using Database Functions Directly
```typescript
import { createTrainingSession, getHandsBySession } from '@/lib/supabase/database';

// In a server component or API route
const session = await createTrainingSession(userId, datasetId);
const hands = await getHandsBySession(session.id);
```

## Notes

- **Type Mismatch**: `hands.session_id` is `uuid` but `training_sessions.id` is `bigint`. The code handles this by converting to strings for comparisons.
- **Clerk Integration**: Users are synced automatically when they interact with the API. The `sync-user` endpoint can be called explicitly after sign-in.
- **RLS Policies**: All tables have Row Level Security enabled. Users can only access their own data.

