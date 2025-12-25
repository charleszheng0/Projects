# Machine Learning Dataset Collection System

This system automatically collects poker training data in a machine learning-friendly format. Every decision you make during gameplay is recorded with full context.

## How It Works

### Automatic Data Collection

Data is **automatically collected** as you play:

1. **Every action you take** is recorded with:
   - Your hand (cards)
   - Position (UTG, MP, CO, BTN, SB, BB)
   - Game stage (preflop, flop, turn, river)
   - Community cards (if postflop)
   - Pot size and current bet
   - Your action (fold, call, bet, raise, check)
   - Bet size (if applicable)
   - GTO feedback (was it correct? optimal actions?)
   - Hand strength and other ML features

2. **Data is stored locally** in your browser's localStorage
3. **No server required** - everything runs client-side

### Accessing Your Dataset

Navigate to `/dataset` in your app to:
- View all collected records
- See statistics (accuracy, by position, by stage)
- Export data (JSON or CSV)
- Import data from files
- Clear records

## Data Structure

Each record contains:

```typescript
{
  id: string;                    // Unique record ID
  timestamp: number;             // When the action occurred
  handId: string;                 // Groups all actions from same hand
  
  // Hand context
  playerHand: Hand;              // Your cards
  playerPosition: Position;       // Your position
  numPlayers: number;             // Table size
  gameStage: GameStage;           // preflop/flop/turn/river
  communityCards: Card[];         // Board cards (if postflop)
  
  // Betting context
  pot: number;                    // Pot size in BB
  currentBet: number;             // Bet to call in BB
  playerStackBB: number;          // Your stack
  
  // Your action
  playerAction: Action;           // What you did
  betSizeBB?: number;             // Bet size (if bet/raise)
  
  // GTO analysis
  optimalActions: Action[];       // What GTO says is optimal
  isCorrect: boolean;             // Was your action correct?
  feedback: string;               // GTO explanation
  
  // ML features
  features?: {
    handStrength: number;         // 0-1 hand strength
    positionValue: number;        // Position value
    potOdds?: number;             // Pot odds if facing bet
    stackToPotRatio: number;      // SPR
    isInPosition: boolean;         // IP/OOP
  };
}
```

## Manual Data Entry

### Option 1: Programmatic Entry

You can manually add records using the dataset API:

```typescript
import { getDataset } from "@/lib/hand-history";

const dataset = getDataset();

dataset.addRecord({
  handId: "hand-123",
  playerHand: {
    card1: { rank: "A", suit: "spades" },
    card2: { rank: "K", suit: "spades" }
  },
  playerPosition: "BTN",
  numPlayers: 6,
  playerSeat: 5,
  gameStage: "preflop",
  communityCards: [],
  pot: 1.5,
  currentBet: 2,
  playerStackBB: 100,
  actionToFace: "call",
  playerAction: "raise",
  betSizeBB: 5,
  optimalActions: ["raise", "call"],
  isCorrect: true,
  feedback: "Strong hand, raising is optimal",
  activePlayers: 6,
  foldedPlayers: [false, false, false, false, false, false],
});
```

### Option 2: Import from JSON

1. Create a JSON file with an array of records
2. Go to `/dataset` page
3. Click "Import JSON Data"
4. Select your file

Example JSON:

```json
[
  {
    "handId": "hand-123",
    "playerHand": {
      "card1": { "rank": "A", "suit": "spades" },
      "card2": { "rank": "K", "suit": "spades" }
    },
    "playerPosition": "BTN",
    "numPlayers": 6,
    "playerSeat": 5,
    "gameStage": "preflop",
    "communityCards": [],
    "pot": 1.5,
    "currentBet": 2,
    "playerStackBB": 100,
    "actionToFace": "call",
    "playerAction": "raise",
    "betSizeBB": 5,
    "optimalActions": ["raise", "call"],
    "isCorrect": true,
    "feedback": "Strong hand, raising is optimal",
    "activePlayers": 6,
    "foldedPlayers": [false, false, false, false, false, false]
  }
]
```

## Exporting Data

### Export Formats

1. **JSON** - Full data with all fields (best for importing back)
2. **CSV** - Simplified format for ML tools (Python pandas, Excel, etc.)

### Export Methods

1. **Via UI**: Go to `/dataset`, select format, click "Generate Export", then "Download File"
2. **Via Code**:
   ```typescript
   const dataset = getDataset();
   const json = dataset.exportToJSON();
   const csv = dataset.exportToCSV();
   ```

## Using Data for Machine Learning

### CSV Format (for ML)

The CSV export includes:
- `id`, `timestamp`, `handId`
- `playerHand` (formatted as "As Ks")
- `playerPosition`, `numPlayers`, `gameStage`
- `pot`, `currentBet`, `playerAction`, `betSizeBB`
- `isCorrect` (1 or 0)
- `optimalActions` (pipe-separated)
- `activePlayers`

### Example ML Usage (Python)

```python
import pandas as pd

# Load CSV
df = pd.read_csv('poker-dataset.csv')

# Filter by stage
preflop_data = df[df['gameStage'] == 'preflop']

# Calculate accuracy
accuracy = df['isCorrect'].mean()

# Group by position
by_position = df.groupby('playerPosition')['isCorrect'].mean()
```

### Feature Engineering

The dataset includes derived features:
- `handStrength`: 0-1 score of hand strength
- `positionValue`: Position value (higher = better)
- `potOdds`: Pot odds when facing a bet
- `stackToPotRatio`: SPR
- `isInPosition`: Boolean for position

You can add more features by extending the `features` object in the record.

## Data Management

### Viewing Records

Go to `/dataset` to see:
- Recent records (last 20)
- Statistics dashboard
- Filter/search capabilities

### Clearing Data

```typescript
const dataset = getDataset();
dataset.clear(); // Removes all records
```

### Filtering Records

```typescript
const dataset = getDataset();

// Get all preflop records
const preflop = dataset.getRecords({ gameStage: "preflop" });

// Get incorrect actions
const mistakes = dataset.getRecords({ isCorrect: false });

// Get records from specific hand
const handRecords = dataset.getRecords({ handId: "hand-123" });

// Get records from date range
const recent = dataset.getRecords({
  dateFrom: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
});
```

## Storage

- **Location**: Browser localStorage
- **Key**: `poker-gto-dataset`
- **Limit**: ~5-10MB (typically 10,000-50,000 records)
- **Persistence**: Data persists across sessions
- **Privacy**: All data stays in your browser

## Tips

1. **Regular Exports**: Export your data periodically to avoid losing it
2. **Backup**: Keep JSON exports as backups
3. **Analysis**: Use CSV exports for analysis in Python/R/Excel
4. **Filtering**: Use filters to analyze specific scenarios (e.g., "all BTN raises")
5. **Features**: The `features` object is perfect for ML - add more derived features as needed

## Example: Building a Custom Model

```python
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

# Load data
df = pd.read_csv('poker-dataset.csv')

# Create features
X = df[['pot', 'currentBet', 'playerStackBB', 'numPlayers']]
y = df['isCorrect']

# Train model
model = RandomForestClassifier()
model.fit(X, y)

# Predict
predictions = model.predict(X)
```

## API Reference

See `lib/hand-history.ts` for full API documentation:

- `getDataset()` - Get dataset instance
- `dataset.addRecord()` - Add a record
- `dataset.updateRecord()` - Update a record
- `dataset.getAllRecords()` - Get all records
- `dataset.getRecords(filter)` - Get filtered records
- `dataset.getStatistics()` - Get statistics
- `dataset.exportToJSON()` - Export as JSON
- `dataset.exportToCSV()` - Export as CSV
- `dataset.importFromJSON()` - Import from JSON
- `dataset.clear()` - Clear all records
- `dataset.deleteRecords(filter)` - Delete filtered records

