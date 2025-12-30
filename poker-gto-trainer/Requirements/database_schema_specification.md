# Database Schema Specification
## Poker GTO Trainer - Supabase Backend

This document provides detailed specifications for all database tables, including columns, relationships, constraints, indexes, and security policies.

---

## Schema: `public`

All tables are created in the `public` schema (default Supabase schema).

---

## Table Specifications

### 1. `profiles`

**Purpose**: Stores user profile information linked to Supabase Auth users. Acts as the primary user record for the application.

**Columns**:
| Column Name | Data Type | Constraints | Default | Description |
|------------|-----------|-------------|---------|-------------|
| `id` | `uuid` | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique profile identifier |
| `user_id` | `uuid` | NOT NULL, UNIQUE, FOREIGN KEY | - | References `auth.users(id)` - Supabase Auth user ID |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Profile creation timestamp |

**Foreign Keys**:
- `user_id` → `auth.users(id)` ON DELETE CASCADE

**Unique Constraints**:
- `user_id` (one profile per user)

**Indexes**:
- `idx_profiles_user_id` on `user_id` (for fast lookups by auth user)

**RLS Policies**:
- **SELECT**: Users can view their own profile (`auth.uid() = user_id`)
- **INSERT**: Users can create their own profile (`auth.uid() = user_id`)
- **UPDATE**: Users can update their own profile (`auth.uid() = user_id`)

**Relationships**:
- One-to-Many: `profiles` → `training_sessions` (one user has many sessions)

**Notes**:
- This table bridges Clerk authentication (if used) with Supabase Auth
- Consider adding additional profile fields (username, avatar_url, etc.) as needed

---

### 2. `datasets`

**Purpose**: Stores available GTO solver datasets (e.g., PioSolver, GTO+). These are reference data that all users can access.

**Columns**:
| Column Name | Data Type | Constraints | Default | Description |
|------------|-----------|-------------|---------|-------------|
| `id` | `uuid` | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique dataset identifier |
| `name` | `text` | NOT NULL | - | Human-readable dataset name (e.g., "PioSolver 100bb") |
| `solver_type` | `text` | NOT NULL | - | Solver type identifier (e.g., "piosolver", "gto+") |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Dataset creation timestamp |

**Indexes**:
- None (small reference table, full table scans acceptable)

**RLS Policies**:
- **SELECT**: All authenticated users can view datasets (`auth.role() = 'authenticated'`)
- **INSERT/UPDATE/DELETE**: Admin-only (no policy = admin only via service role)

**Relationships**:
- One-to-Many: `datasets` → `training_sessions` (one dataset used in many sessions)
- One-to-Many: `datasets` → `gto_solutions` (one dataset has many solutions)

**Initial Data**:
```sql
INSERT INTO datasets (name, solver_type) VALUES
  ('PioSolver 100bb', 'piosolver'),
  ('GTO+ Standard', 'gto+');
```

---

### 3. `training_sessions`

**Purpose**: Represents a single training session where a user practices poker decisions. Each session belongs to a user and uses a specific dataset.

**Columns**:
| Column Name | Data Type | Constraints | Default | Description |
|------------|-----------|-------------|---------|-------------|
| `id` | `uuid` | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique session identifier |
| `user_id` | `uuid` | NOT NULL, FOREIGN KEY | - | References `profiles(user_id)` - Owner of the session |
| `dataset_id` | `uuid` | NOT NULL, FOREIGN KEY | - | References `datasets(id)` - Dataset used for this session |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Session start timestamp |

**Foreign Keys**:
- `user_id` → `profiles(user_id)` ON DELETE CASCADE
- `dataset_id` → `datasets(id)` ON DELETE SET NULL

**Indexes**:
- `idx_training_sessions_user_id` on `user_id` (for querying user's sessions)
- `idx_training_sessions_dataset_id` on `dataset_id` (for filtering by dataset)

**RLS Policies**:
- **SELECT**: Users can view their own sessions (`auth.uid() = user_id`)
- **INSERT**: Users can create their own sessions (`auth.uid() = user_id`)
- **UPDATE**: Users can update their own sessions (`auth.uid() = user_id`)
- **DELETE**: Users can delete their own sessions (`auth.uid() = user_id`)

**Relationships**:
- Many-to-One: `training_sessions` → `profiles` (many sessions belong to one user)
- Many-to-One: `training_sessions` → `datasets` (many sessions use one dataset)
- One-to-Many: `training_sessions` → `hands` (one session contains many hands)

**Notes**:
- Consider adding `ended_at` timestamp for session duration tracking
- Consider adding `session_stats` jsonb column for aggregated statistics

---

### 4. `hands`

**Purpose**: Stores individual poker hand scenarios presented to users during training. Contains complete game state information in JSONB format.

**Columns**:
| Column Name | Data Type | Constraints | Default | Description |
|------------|-----------|-------------|---------|-------------|
| `id` | `uuid` | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique hand identifier |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Hand creation timestamp |
| `session_id` | `uuid` | NOT NULL, FOREIGN KEY | - | References `training_sessions(id)` - Session this hand belongs to |
| `hand_data` | `jsonb` | NOT NULL | - | Complete hand state (see JSONB structure below) |

**Foreign Keys**:
- `session_id` → `training_sessions(id)` ON DELETE CASCADE

**Indexes**:
- `idx_hands_session_id` on `session_id` (for querying hands in a session)
- `idx_hands_hand_data_gin` on `hand_data` USING GIN (for JSONB queries on hand data)

**RLS Policies**:
- **SELECT**: Users can view hands from their own sessions (via session ownership check)
- **INSERT**: Users can create hands in their own sessions (via session ownership check)
- **UPDATE**: Users can update hands in their own sessions (via session ownership check)

**Relationships**:
- Many-to-One: `hands` → `training_sessions` (many hands belong to one session)
- One-to-Many: `hands` → `user_decisions` (one hand can have multiple decisions if multi-street)

**JSONB Structure** (`hand_data`):
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

**Common JSONB Queries**:
```sql
-- Find hands by position
SELECT * FROM hands WHERE hand_data->>'position' = 'BTN';

-- Find hands by number of players
SELECT * FROM hands WHERE (hand_data->>'num_players')::int = 6;

-- Find hands by game stage
SELECT * FROM hands WHERE hand_data->>'game_stage' = 'preflop';
```

---

### 5. `user_decisions`

**Purpose**: Stores user decisions made during training, including the action taken, whether it was correct, feedback, and bet sizing.

**Columns**:
| Column Name | Data Type | Constraints | Default | Description |
|------------|-----------|-------------|---------|-------------|
| `id` | `uuid` | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique decision identifier |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Decision timestamp |
| `hand_id` | `uuid` | NOT NULL, FOREIGN KEY | - | References `hands(id)` - Hand this decision relates to |
| `action` | `text` | NOT NULL, CHECK constraint | - | Action taken: 'fold', 'check', 'call', 'bet', 'raise', 'all-in' |
| `is_correct` | `boolean` | NOT NULL | - | Whether the decision was correct according to GTO |
| `feedback` | `text` | NOT NULL | - | Feedback text explaining the decision |
| `bet_size_bb` | `numeric` | NOT NULL | - | Bet size in big blinds (0 for fold/check/call) |

**Foreign Keys**:
- `hand_id` → `hands(id)` ON DELETE CASCADE

**Check Constraints**:
- `action` must be one of: 'fold', 'check', 'call', 'bet', 'raise', 'all-in'

**Indexes**:
- `idx_user_decisions_hand_id` on `hand_id` (for querying decisions by hand)
- `idx_user_decisions_is_correct` on `is_correct` (for filtering correct/incorrect decisions)

**RLS Policies**:
- **SELECT**: Users can view decisions from their own hands (via hand → session → user ownership)
- **INSERT**: Users can create decisions for their own hands (via hand → session → user ownership)
- **UPDATE**: Users can update decisions for their own hands (via hand → session → user ownership)

**Relationships**:
- Many-to-One: `user_decisions` → `hands` (many decisions can belong to one hand if multi-street)

**Notes**:
- One hand can have multiple decisions if the hand goes to multiple streets (preflop → flop → turn → river)
- Consider adding `street` column if you need to track which street the decision was made on
- Consider adding `ev_loss` numeric column to track expected value loss for incorrect decisions

---

### 6. `gto_solutions`

**Purpose**: Stores precomputed GTO solutions for various poker situations. These are reference data that all authenticated users can query to get optimal actions.

**Columns**:
| Column Name | Data Type | Constraints | Default | Description |
|------------|-----------|-------------|---------|-------------|
| `id` | `uuid` | PRIMARY KEY, NOT NULL | `gen_random_uuid()` | Unique solution identifier |
| `dataset_id` | `uuid` | NOT NULL, FOREIGN KEY | - | References `datasets(id)` - Dataset this solution belongs to |
| `situation` | `jsonb` | NOT NULL | - | Situation description (see JSONB structure below) |
| `optimal_action` | `text` | NOT NULL, CHECK constraint | - | Optimal action: 'fold', 'check', 'call', 'bet', 'raise', 'all-in' |
| `frequencies` | `jsonb` | NULL | - | Mixed strategy frequencies (if applicable) |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Solution creation timestamp |

**Foreign Keys**:
- `dataset_id` → `datasets(id)` ON DELETE CASCADE

**Check Constraints**:
- `optimal_action` must be one of: 'fold', 'check', 'call', 'bet', 'raise', 'all-in'

**Indexes**:
- `idx_gto_solutions_dataset_id` on `dataset_id` (for filtering by dataset)
- `idx_gto_solutions_situation_gin` on `situation` USING GIN (for JSONB queries on situation)

**RLS Policies**:
- **SELECT**: All authenticated users can view GTO solutions (`auth.role() = 'authenticated'`)
- **INSERT/UPDATE/DELETE**: Admin-only (no policy = admin only via service role)

**Relationships**:
- Many-to-One: `gto_solutions` → `datasets` (many solutions belong to one dataset)

**JSONB Structure** (`situation`):
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

**JSONB Structure** (`frequencies` - for mixed strategies):
```json
{
  "raise": 0.6,
  "call": 0.3,
  "fold": 0.1
}
```

**Common JSONB Queries**:
```sql
-- Find solution for specific hand and position
SELECT * FROM gto_solutions
WHERE dataset_id = '...'
  AND situation->>'position' = 'BTN'
  AND situation->>'num_players' = '6'
  AND situation->>'street' = 'preflop'
  AND situation->'hand'->>'card1' = '{"rank": "A", "suit": "hearts"}';
```

---

## Entity Relationship Diagram (ERD)

```
profiles (1) ──< (many) training_sessions (1) ──< (many) hands (1) ──< (many) user_decisions
    │                                                                
    │                                                                
datasets (1) ──< (many) training_sessions
    │
    │
datasets (1) ──< (many) gto_solutions
```

---

## Complete SQL Implementation

### Idempotent Behavior

All CREATE statements use `IF NOT EXISTS` where applicable. For tables, use:

```sql
CREATE TABLE IF NOT EXISTS table_name (...);
```

However, note that Supabase/PostgreSQL doesn't support `CREATE TABLE IF NOT EXISTS` with all constraints inline. For production, consider using migrations or wrapping in DO blocks.

### Recommended Approach

1. **First Run**: Use the provided SQL as-is
2. **Subsequent Runs**: Use migration files or check for table existence before creating

### Example Idempotent Pattern

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    CREATE TABLE profiles (...);
  END IF;
END $$;
```

---

## Triggers and Functions

### Recommended Triggers

1. **Auto-create profile on user signup**:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

2. **Update session stats on decision insert** (optional):
```sql
-- Could create a materialized view or trigger to update aggregated stats
```

### Helper Functions

**Get user's training statistics**:
```sql
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id uuid)
RETURNS TABLE (
  total_sessions bigint,
  total_hands bigint,
  total_decisions bigint,
  correct_decisions bigint,
  accuracy numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT ts.id)::bigint as total_sessions,
    COUNT(DISTINCT h.id)::bigint as total_hands,
    COUNT(ud.id)::bigint as total_decisions,
    COUNT(CASE WHEN ud.is_correct = true THEN 1 END)::bigint as correct_decisions,
    CASE 
      WHEN COUNT(ud.id) > 0 
      THEN ROUND(100.0 * COUNT(CASE WHEN ud.is_correct = true THEN 1 END) / COUNT(ud.id), 2)
      ELSE 0
    END as accuracy
  FROM training_sessions ts
  LEFT JOIN hands h ON h.session_id = ts.id
  LEFT JOIN user_decisions ud ON ud.hand_id = h.id
  WHERE ts.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Realtime Considerations

If you want to enable Supabase Realtime for any tables:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE training_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE hands;
ALTER PUBLICATION supabase_realtime ADD TABLE user_decisions;
```

**Note**: Only enable realtime on tables that need live updates. Avoid enabling on large reference tables like `gto_solutions`.

---

## Performance Considerations

1. **JSONB Indexes**: GIN indexes on JSONB columns enable fast queries but increase storage. Monitor index size.
2. **Partitioning**: Consider partitioning `hands` and `user_decisions` by `created_at` if tables grow very large (>10M rows).
3. **Archival**: Consider archiving old training sessions to a separate table or S3.

---

## Security Notes

1. **RLS is enabled on all tables** - Always test policies with different user contexts
2. **Service Role**: Admin operations (inserting datasets, gto_solutions) should use service role key
3. **Clerk Integration**: If using Clerk, sync Clerk user IDs with `auth.users` via webhooks or triggers

---

## Migration Checklist

- [ ] Run SQL in Supabase SQL Editor
- [ ] Verify all tables created successfully
- [ ] Verify all indexes created
- [ ] Verify RLS policies work correctly (test with test user)
- [ ] Insert initial datasets
- [ ] Test foreign key constraints
- [ ] Test JSONB queries perform well
- [ ] Set up triggers (if using)
- [ ] Configure realtime (if needed)
- [ ] Set up Clerk webhook sync (if using Clerk)

