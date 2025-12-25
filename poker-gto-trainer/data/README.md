# Data Directory

This directory is for importing large datasets of poker hands.

## Files

- **`dump-your-data-here.json`** - Dump your poker data in this file
- **`bulk-import-template.json`** - Complete example with all fields
- **`BULK_IMPORT_README.md`** - Full documentation

## Quick Start

1. **Edit `dump-your-data-here.json`** and add your data
2. **Go to `/dataset` page** in the app
3. **Upload the file** using "Bulk Data Import"
4. **Click "Import Data"**

## Format

Your data should be a JSON array. Minimal format:

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

## Supported Sources

You can import data from:
- Pro poker databases
- Hand history exports
- Training datasets
- Your own collected data
- Any JSON format matching the schema

See `BULK_IMPORT_README.md` for complete format documentation.

