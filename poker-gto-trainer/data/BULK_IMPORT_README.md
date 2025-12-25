# Bulk Data Import Guide

This guide explains how to import large datasets of poker hands from external sources (pro databases, hand histories, etc.).

## Quick Start

1. **Prepare your data** in JSON format (see format below)
2. **Go to `/dataset` page** in the app
3. **Use "Bulk Data Import"** section
4. **Upload your JSON file** or paste the data
5. **Click "Import Data"**

## Data Format

Your data should be a JSON array of hand records. Each record represents a decision point in a poker hand.

### Minimal Required Format

```json
[
  {
    "playerHand": "As Ks",
    "playerPosition": "BTN",
    "numPlayers": 6,
    "gameStage": "preflop",
    "pot": 1.5,
    "currentBet": 2,
    "playerAction": "raise",
    "betSizeBB": 5
  }
]
```

### Full Format with All Fields

```json
[
  {
    "handId": "hand-001",
    "timestamp": 1704067200000,
    "playerHand": "As Ks",
    "playerPosition": "BTN",
    "numPlayers": 6,
    "playerSeat": 5,
    "gameStage": "preflop",
    "communityCards": [],
    "pot": 1.5,
    "currentBet": 2,
    "playerStackBB": 100,
    "playerAction": "raise",
    "betSizeBB": 5,
    "optimalActions": ["raise", "call"],
    "isCorrect": true,
    "feedback": "Strong hand, raising is optimal",
    "actionToFace": "call",
    "activePlayers": 6,
    "foldedPlayers": [false, false, false, false, false, false],
    "features": {
      "handStrength": 0.85,
      "positionValue": 0.8,
      "potOdds": 0.4,
      "stackToPotRatio": 66.67,
      "isInPosition": true
    }
  }
]
```

## Field Reference

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `playerHand` | string or object | Player's hole cards | `"As Ks"` or `{"card1": {"rank": "A", "suit": "spades"}, "card2": {...}}` |
| `playerPosition` | string | Position at table | `"UTG"`, `"MP"`, `"CO"`, `"BTN"`, `"SB"`, `"BB"` |
| `numPlayers` | number | Number of players (2-9) | `6` |
| `gameStage` | string | Current street | `"preflop"`, `"flop"`, `"turn"`, `"river"` |
| `pot` | number | Pot size in big blinds | `1.5` |
| `currentBet` | number | Current bet to call in BB | `2` |
| `playerAction` | string | Action taken | `"fold"`, `"call"`, `"bet"`, `"raise"`, `"check"` |

### Optional Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `handId` | string | Unique hand identifier | Auto-generated |
| `timestamp` | number | Unix timestamp | Current time |
| `playerSeat` | number | Seat number (0-indexed) | `0` |
| `communityCards` | array | Board cards | `[]` |
| `playerStackBB` | number | Player stack in BB | `100` |
| `betSizeBB` | number | Bet size if bet/raise | `undefined` |
| `optimalActions` | array | Optimal actions | `[]` |
| `isCorrect` | boolean | Was action correct? | `true` |
| `feedback` | string | GTO feedback | `""` |
| `actionToFace` | string/null | Action facing | `null` |
| `activePlayers` | number | Players still in hand | `numPlayers` |
| `foldedPlayers` | array | Which players folded | `[false, ...]` |
| `features` | object | ML features | `undefined` |

## Hand Format

Hands can be specified in multiple formats:

### String Format (Recommended)
```json
"playerHand": "As Ks"  // Ace of spades, King of spades
"playerHand": "A Ks"    // Also works
"playerHand": "Ah Kh"   // Ace of hearts, King of hearts
```

**Suit abbreviations:**
- `s` = spades
- `h` = hearts
- `d` = diamonds
- `c` = clubs

### Object Format
```json
"playerHand": {
  "card1": { "rank": "A", "suit": "spades" },
  "card2": { "rank": "K", "suit": "spades" }
}
```

## Community Cards Format

### String Array (Recommended)
```json
"communityCards": ["As", "Ks", "Qh"]  // Flop
"communityCards": ["As", "Ks", "Qh", "Jc"]  // Turn
"communityCards": ["As", "Ks", "Qh", "Jc", "Td"]  // River
```

### Object Array
```json
"communityCards": [
  { "rank": "A", "suit": "spades" },
  { "rank": "K", "suit": "spades" },
  { "rank": "Q", "suit": "hearts" }
]
```

## Position Values

Accepted position strings (case-insensitive):
- `"UTG"` or `"utg"`
- `"UTG+1"` or `"UTG1"` or `"utg+1"`
- `"MP"` or `"mp"`
- `"CO"` or `"co"`
- `"BTN"` or `"button"` or `"btn"`
- `"SB"` or `"small blind"` or `"sb"`
- `"BB"` or `"big blind"` or `"bb"`

## Game Stage Values

Accepted stage strings (case-insensitive):
- `"preflop"`
- `"flop"`
- `"turn"`
- `"river"`

## Action Values

Accepted action strings (case-insensitive):
- `"fold"`
- `"call"`
- `"bet"`
- `"raise"`
- `"check"`

## Examples

### Example 1: Simple Preflop Raise
```json
{
  "playerHand": "As Ks",
  "playerPosition": "BTN",
  "numPlayers": 6,
  "gameStage": "preflop",
  "pot": 1.5,
  "currentBet": 2,
  "playerAction": "raise",
  "betSizeBB": 5
}
```

### Example 2: Flop Check
```json
{
  "playerHand": "Qh Jh",
  "playerPosition": "MP",
  "numPlayers": 9,
  "gameStage": "flop",
  "communityCards": ["As", "Ks", "Qc"],
  "pot": 15,
  "currentBet": 0,
  "playerAction": "check"
}
```

### Example 3: Facing a Bet (Call)
```json
{
  "playerHand": "9s 8s",
  "playerPosition": "BB",
  "numPlayers": 6,
  "gameStage": "flop",
  "communityCards": ["7s", "6h", "2c"],
  "pot": 10,
  "currentBet": 5,
  "playerAction": "call",
  "actionToFace": "bet"
}
```

## Converting from Other Formats

### From PokerTracker/Hand2Note

If you have hand histories in standard format, you'll need to parse them first. The format here is decision-focused, not hand-history focused.

### From CSV

If your data is in CSV, convert it to JSON first:

```python
import pandas as pd
import json

# Load CSV
df = pd.read_csv('your_data.csv')

# Convert to JSON array
records = df.to_dict('records')

# Save as JSON
with open('converted_data.json', 'w') as f:
    json.dump(records, f, indent=2)
```

### From Database Export

If exporting from a database:

```sql
-- Example SQL export
SELECT 
    hand_id as "handId",
    player_hand as "playerHand",
    position as "playerPosition",
    num_players as "numPlayers",
    stage as "gameStage",
    pot,
    current_bet as "currentBet",
    action as "playerAction"
FROM hands
```

Then convert to JSON format.

## Validation

Before importing, the system will:
1. ✅ Validate JSON syntax
2. ✅ Check required fields
3. ✅ Validate hand formats
4. ✅ Validate position/stage/action values
5. ⚠️ Warn about missing optional fields

## Import Process

1. **Validation**: Data is validated before import
2. **Conversion**: Each record is converted to internal format
3. **Import**: Records are added to the dataset
4. **Progress**: Progress is shown for large imports
5. **Results**: Summary shows success/failure counts

## Tips

1. **Start Small**: Test with a few records first
2. **Validate First**: Use the validation feature before importing
3. **Backup**: Export your existing data before bulk imports
4. **Format**: Use string format for hands/cards (easier to work with)
5. **Batch Size**: Large imports (10,000+ records) may take a minute
6. **Errors**: Failed records are skipped (with option to see errors)

## File Location

You can place your import files anywhere, but recommended locations:
- `data/` folder in the project root
- Any location accessible to your file system

## Template File

See `data/bulk-import-template.json` for a complete example with all fields.

## Support

If you have data in a different format, you can:
1. Write a conversion script (Python/Node.js)
2. Use the validation feature to check your format
3. Contact support for format conversion help

