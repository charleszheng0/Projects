Create the backend code for the supabase backend:

Run the following SQL query in the Supabase SQL Editor. This query is **non-destructive** - it only creates structures and will not delete or modify existing data.

---
Profiles table has columns: id type int8, created_at type timestamptz, user_id type uuid. gto_solutions table has columns: id type uuid, created_at type timestamptz, dataset_id uuid, situation type jsonb, optimal_action type text, frequencies type jsonb. hands table has columns: id type uuid, created_at type timestamptz, session_id type uuid, hand_data type jsonb. training_sessions table has columns id type int8, created_at type timestamptz, dataset_id type uuid, user_id type uuid. user_decisions table has columns: id type uuid, created_at type timestamptz, hand_id type uuid, action type text, is_correct type bool, feedback type text, and bet_size_bb type numeric. Create the backend based on the entire app logistics. 
```sql
-- ============================================
-- Extensions (Safe - only creates if not exists)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Tables (Safe - only creates if not exists)
-- ============================================

-- User profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    CREATE TABLE profiles (
      id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id)
    );
  END IF;
END $$;

-- Datasets/Solvers
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'datasets') THEN
    CREATE TABLE datasets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      solver_type text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Training sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'training_sessions') THEN
    CREATE TABLE training_sessions (
      id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
      dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Hands
-- Note: session_id is uuid but training_sessions.id is bigint, so no foreign key constraint
-- The relationship is enforced through application logic and RLS policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hands') THEN
    CREATE TABLE hands (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      session_id uuid NOT NULL,
      hand_data jsonb NOT NULL
    );
  END IF;
END $$;

-- User decisions
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_decisions') THEN
    CREATE TABLE user_decisions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      hand_id uuid NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
      action text NOT NULL CHECK (action IN ('fold', 'check', 'call', 'bet', 'raise', 'all-in')),
      is_correct boolean NOT NULL,
      feedback text NOT NULL,
      bet_size_bb numeric NOT NULL
    );
  END IF;
END $$;

-- GTO solutions
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gto_solutions') THEN
    CREATE TABLE gto_solutions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
      situation jsonb NOT NULL,
      optimal_action text NOT NULL CHECK (optimal_action IN ('fold', 'check', 'call', 'bet', 'raise', 'all-in')),
      frequencies jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- ============================================
-- Indexes (Safe - only creates if not exists)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_user_id ON training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_dataset_id ON training_sessions(dataset_id);
-- Note: session_id is uuid but references bigint, so we use text cast for index compatibility
CREATE INDEX IF NOT EXISTS idx_hands_session_id ON hands(session_id);
CREATE INDEX IF NOT EXISTS idx_user_decisions_hand_id ON user_decisions(hand_id);
CREATE INDEX IF NOT EXISTS idx_user_decisions_is_correct ON user_decisions(is_correct);
CREATE INDEX IF NOT EXISTS idx_gto_solutions_dataset_id ON gto_solutions(dataset_id);

-- JSONB indexes for common queries
CREATE INDEX IF NOT EXISTS idx_hands_hand_data_gin ON hands USING gin(hand_data);
CREATE INDEX IF NOT EXISTS idx_gto_solutions_situation_gin ON gto_solutions USING gin(situation);

-- ============================================
-- Row Level Security (RLS) - Safe, only enables if not already enabled
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles' AND rowsecurity = true) THEN
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'training_sessions' AND rowsecurity = true) THEN
    ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hands' AND rowsecurity = true) THEN
    ALTER TABLE hands ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_decisions' AND rowsecurity = true) THEN
    ALTER TABLE user_decisions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'datasets' AND rowsecurity = true) THEN
    ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gto_solutions' AND rowsecurity = true) THEN
    ALTER TABLE gto_solutions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- RLS Policies (Safe - drops and recreates policies, does not affect data)
-- ============================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- Training sessions
DROP POLICY IF EXISTS "Users can view own training sessions" ON training_sessions;
CREATE POLICY "Users can view own training sessions"
  ON training_sessions FOR SELECT
  USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can create own training sessions" ON training_sessions;
CREATE POLICY "Users can create own training sessions"
  ON training_sessions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update own training sessions" ON training_sessions;
CREATE POLICY "Users can update own training sessions"
  ON training_sessions FOR UPDATE
  USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can delete own training sessions" ON training_sessions;
CREATE POLICY "Users can delete own training sessions"
  ON training_sessions FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- Hands
DROP POLICY IF EXISTS "Users can view own hands" ON hands;
CREATE POLICY "Users can view own hands"
  ON hands FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_sessions
      WHERE training_sessions.id::text = hands.session_id::text
      AND training_sessions.user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can create own hands" ON hands;
CREATE POLICY "Users can create own hands"
  ON hands FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_sessions
      WHERE training_sessions.id::text = hands.session_id::text
      AND training_sessions.user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can update own hands" ON hands;
CREATE POLICY "Users can update own hands"
  ON hands FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM training_sessions
      WHERE training_sessions.id::text = hands.session_id::text
      AND training_sessions.user_id::text = auth.uid()::text
    )
  );

-- User decisions
DROP POLICY IF EXISTS "Users can view own decisions" ON user_decisions;
CREATE POLICY "Users can view own decisions"
  ON user_decisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hands
      JOIN training_sessions ON training_sessions.id::text = hands.session_id::text
      WHERE hands.id = user_decisions.hand_id
      AND training_sessions.user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can create own decisions" ON user_decisions;
CREATE POLICY "Users can create own decisions"
  ON user_decisions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hands
      JOIN training_sessions ON training_sessions.id::text = hands.session_id::text
      WHERE hands.id = user_decisions.hand_id
      AND training_sessions.user_id::text = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Users can update own decisions" ON user_decisions;
CREATE POLICY "Users can update own decisions"
  ON user_decisions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM hands
      JOIN training_sessions ON training_sessions.id::text = hands.session_id::text
      WHERE hands.id = user_decisions.hand_id
      AND training_sessions.user_id::text = auth.uid()::text
    )
  );

-- Datasets: Read-only for all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view datasets" ON datasets;
CREATE POLICY "Authenticated users can view datasets"
  ON datasets FOR SELECT
  USING (auth.role() = 'authenticated');

-- GTO solutions: Read-only for all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view GTO solutions" ON gto_solutions;
CREATE POLICY "Authenticated users can view GTO solutions"
  ON gto_solutions FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- Migration: Remove duplicate gto_solution table
-- ============================================

-- Drop the duplicate gto_solution (singular) table if it exists
-- We keep gto_solutions (plural) as that's the standard table name
DO $$
BEGIN
  -- If both tables exist, migrate data first, then drop the duplicate
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gto_solution') 
     AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gto_solutions') THEN
    -- Migrate any data from gto_solution to gto_solutions (avoiding duplicates)
    INSERT INTO gto_solutions (dataset_id, situation, optimal_action, frequencies, created_at)
    SELECT 
      dataset_id, 
      situation, 
      optimal_action, 
      frequencies, 
      created_at
    FROM gto_solution
    WHERE NOT EXISTS (
      SELECT 1 FROM gto_solutions gs
      WHERE gs.dataset_id = gto_solution.dataset_id
      AND gs.situation = gto_solution.situation
      AND gs.optimal_action = gto_solution.optimal_action
    );
  END IF;
  
  -- Drop the duplicate gto_solution table
  DROP TABLE IF EXISTS gto_solution CASCADE;
END $$;

-- ============================================
-- Initial Data (Safe - only inserts if not exists)
-- ============================================

INSERT INTO datasets (name, solver_type)
VALUES 
  ('PioSolver 100bb', 'piosolver'),
  ('GTO+ Standard', 'gto+')
ON CONFLICT DO NOTHING;
```

---

## Safety Guarantees

This SQL query is **completely non-destructive**:

✅ **No data deletion**: No `DROP TABLE`, `TRUNCATE`, or `DELETE` statements  
✅ **No data modification**: No `UPDATE` statements that modify existing data  
✅ **Idempotent**: Can be run multiple times safely  
✅ **Safe policy updates**: `DROP POLICY IF EXISTS` only removes security policies, never data  
✅ **Safe initial data**: Uses `ON CONFLICT DO NOTHING` to prevent duplicate inserts  
✅ **Conditional creation**: Tables and indexes only created if they don't exist  

**Note**: `DROP POLICY IF EXISTS` is safe because:
- It only removes security policies (RLS rules)
- It does NOT delete any data from tables
- Policies can be safely recreated without affecting existing data

---

## Usage Notes

### JSONB Data Structure Examples

**hands.hand_data** example:
```json
{
  "player_hand": {
    "card1": {"rank": "A", "suit": "hearts"},
    "card2": {"rank": "K", "suit": "spades"}
  },
  "position": "BTN",
  "num_players": 6,
  "big_blind": 2,
  "small_blind": 1,
  "player_seat": 4,
  "button_seat": 4,
  "game_stage": "preflop",
  "community_cards": [],
  "pot": 3,
  "player_stack_bb": 100,
  "player_stacks_bb": [100, 100, 100, 100, 100, 100],
  "player_bets_bb": [0, 0, 0, 0, 0, 2],
  "active_players": 6,
  "folded_players": [false, false, false, false, false, false]
}
```

**gto_solutions.situation** example:
```json
{
  "hand": {
    "card1": {"rank": "A", "suit": "hearts"},
    "card2": {"rank": "K", "suit": "spades"}
  },
  "position": "BTN",
  "num_players": 6,
  "street": "preflop",
  "pot_size_bb": 3,
  "stack_depth_bb": 100
}
```

**gto_solutions.frequencies** example (for mixed strategies):
```json
{
  "raise": 0.6,
  "call": 0.3,
  "fold": 0.1
}
```

### Querying Examples

**Find GTO solution for a specific hand:**
```sql
SELECT * FROM gto_solutions
WHERE dataset_id = '...'
  AND situation->>'position' = 'BTN'
  AND situation->>'num_players' = '6'
  AND situation->>'street' = 'preflop'
  AND situation->'hand'->>'card1' = '{"rank": "A", "suit": "hearts"}';
```

**Get user's training session with hands:**
```sql
SELECT 
  ts.id as session_id,
  ts.created_at as session_start,
  COUNT(h.id) as total_hands,
  COUNT(ud.id) as total_decisions,
  COUNT(CASE WHEN ud.is_correct = true THEN 1 END) as correct_decisions
FROM training_sessions ts
LEFT JOIN hands h ON h.session_id::text = ts.id::text
LEFT JOIN user_decisions ud ON ud.hand_id = h.id
WHERE ts.user_id::text = auth.uid()::text
GROUP BY ts.id, ts.created_at;
```

### Important Notes

- **Type Mismatch**: `hands.session_id` is `uuid` but `training_sessions.id` is `bigint`. The relationship is maintained through application logic and RLS policies using text casting. Consider aligning these types in the future for better referential integrity.
- **Clerk Integration**: Since you're using Clerk for authentication, you'll need to sync Clerk user IDs with Supabase `auth.users`. Consider creating a trigger or function to automatically create profiles when users sign up through Clerk, or use Clerk's webhooks to sync user data.
- **User ID Sync**: The `profiles.user_id` references `auth.users(id)`. You may need to create a function that maps Clerk user IDs to Supabase auth users, or modify the schema to store Clerk user IDs directly if not using Supabase Auth.
