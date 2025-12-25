# Opponent Statistics System

This system allows you to customize opponent behavior using real poker statistics data.

## How It Works

The opponent simulation now uses realistic probabilities based on:
- **Position** (UTG, MP, CO, BTN, SB, BB) - tighter players in early position
- **Hand Strength** - weak hands fold more often, strong hands bet/raise
- **Betting Context** - facing a bet increases fold probability
- **Street** (flop, turn, river) - players get tighter as streets progress

## Default Statistics

The default statistics (`DEFAULT_OPPONENT_STATS`) are based on typical online poker behavior:
- **Preflop**: 60-80% of hands fold depending on position
- **Postflop**: Weak hands (0-0.3 strength) fold 85-98% of the time
- **River**: Very tight - most weak hands fold

## Loading Your Own Data

### Step 1: Create a JSON File

Create a file following the format in `opponent-stats-example.json`:

```json
{
  "preflop": {
    "UTG": { "fold": 0.80, "call": 0.10, "raise": 0.10 },
    "MP": { "fold": 0.70, "call": 0.20, "raise": 0.10 },
    ...
  },
  "postflop": {
    "flop": {
      "0-0.3": { "fold": 0.90, "call": 0.08, "bet": 0.02, "raise": 0.0 },
      "0.3-0.5": { "fold": 0.70, "call": 0.25, "bet": 0.04, "raise": 0.01 },
      ...
    },
    ...
  },
  "betSizing": {
    "valueBet": [0.5, 0.67, 0.75, 1.0],
    "bluffBet": [0.33, 0.5]
  }
}
```

### Step 2: Load the Data

You can load custom statistics in two ways:

#### Option A: Load from JSON String (Programmatic)

```typescript
import { useGameStore } from "@/store/game-store";

const jsonData = `{
  "preflop": {
    "UTG": { "fold": 0.85, "call": 0.08, "raise": 0.07 }
  }
}`;

useGameStore.getState().loadOpponentStats(jsonData);
```

#### Option B: Create a Component/API to Load from File

You could create a settings component that allows users to upload a JSON file:

```typescript
// In a component
const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const jsonData = e.target?.result as string;
      useGameStore.getState().loadOpponentStats(jsonData);
    };
    reader.readAsText(file);
  }
};
```

## Data Format Details

### Preflop Probabilities

For each position, provide probabilities that sum to 1.0:
- `fold`: Probability of folding
- `call`: Probability of calling
- `raise`: Probability of raising

Example:
```json
"UTG": { "fold": 0.80, "call": 0.10, "raise": 0.10 }
```

### Postflop Probabilities

For each street (flop, turn, river) and hand strength range:
- `fold`: Probability of folding
- `call`: Probability of calling (when facing a bet) or checking (when not)
- `bet`: Probability of betting (when not facing a bet)
- `raise`: Probability of raising (when facing a bet)

Hand strength ranges:
- `"0-0.3"`: Very weak hands (high card, bottom pair)
- `"0.3-0.5"`: Weak hands (bottom pair, weak draws)
- `"0.5-0.7"`: Medium hands (middle pair, decent draws)
- `"0.7-1.0"`: Strong hands (top pair+, two pair+, trips+)

Example:
```json
"flop": {
  "0-0.3": { "fold": 0.90, "call": 0.08, "bet": 0.02, "raise": 0.0 }
}
```

### Bet Sizing

- `valueBet`: Array of pot multipliers for value betting (e.g., [0.5, 0.67, 1.0] means 50% pot, 67% pot, or pot-sized bet)
- `bluffBet`: Array of pot multipliers for bluffing (typically smaller, e.g., [0.33, 0.5])

## Real Data Sources

You can gather real poker statistics from:
1. **Poker tracking software** (PokerTracker, Hold'em Manager) - export hand histories
2. **Online poker databases** - aggregate statistics by position and hand strength
3. **GTO solvers** - use solver outputs for optimal frequencies
4. **Your own hand histories** - analyze your own play or opponents

## Tips for Realistic Data

1. **Preflop**: Early positions should fold 70-85% of hands
2. **Postflop**: Weak hands should fold 80-95% of the time, especially on later streets
3. **River**: Very tight - weak hands fold 90-98% of the time
4. **Bet Sizing**: Value bets are typically 50-100% pot, bluffs are 33-50% pot
5. **Position Matters**: Later positions (BTN, CO) are more aggressive than early positions (UTG, MP)

## Example: Making Opponents More Aggressive

```json
{
  "preflop": {
    "UTG": { "fold": 0.60, "call": 0.20, "raise": 0.20 }
  },
  "postflop": {
    "flop": {
      "0-0.3": { "fold": 0.70, "call": 0.20, "bet": 0.10, "raise": 0.0 }
    }
  }
}
```

## Example: Making Opponents Tighter

```json
{
  "preflop": {
    "UTG": { "fold": 0.90, "call": 0.05, "raise": 0.05 }
  },
  "postflop": {
    "flop": {
      "0-0.3": { "fold": 0.95, "call": 0.04, "bet": 0.01, "raise": 0.0 }
    }
  }
}
```

