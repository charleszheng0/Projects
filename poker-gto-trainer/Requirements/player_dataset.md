Realistic synthetic opponent data ranging from intermediate to pro. 
{
"preflop": {
"UTG": { "fold": 0.78, "call": 0.13, "raise": 0.09 },
"UTG+1": { "fold": 0.75, "call": 0.14, "raise": 0.11 },
"MP": { "fold": 0.71, "call": 0.18, "raise": 0.11 },
"LJ": { "fold": 0.69, "call": 0.19, "raise": 0.12 },
"HJ": { "fold": 0.66, "call": 0.20, "raise": 0.14 },
"CO": { "fold": 0.60, "call": 0.23, "raise": 0.17 },
"BTN": { "fold": 0.55, "call": 0.26, "raise": 0.19 },
"SB": { "fold": 0.70, "call": 0.20, "raise": 0.10 },
"BB": { "fold": 0.52, "call": 0.38, "raise": 0.10 }
},

"postflop": {
"flop": {
"0-0.3": { "fold": 0.72, "call": 0.17, "bet": 0.07, "raise": 0.04 },
"0.3-0.5": { "fold": 0.46, "call": 0.33, "bet": 0.17, "raise": 0.04 },
"0.5-0.7": { "fold": 0.13, "call": 0.34, "bet": 0.41, "raise": 0.12 },
"0.7-1.0": { "fold": 0.02, "call": 0.07, "bet": 0.68, "raise": 0.23 }
},
"turn": {
"0-0.3": { "fold": 0.78, "call": 0.12, "bet": 0.06, "raise": 0.04 },
"0.3-0.5": { "fold": 0.52, "call": 0.28, "bet": 0.16, "raise": 0.04 },
"0.5-0.7": { "fold": 0.19, "call": 0.32, "bet": 0.36, "raise": 0.13 },
"0.7-1.0": { "fold": 0.04, "call": 0.09, "bet": 0.63, "raise": 0.24 }
},
"river": {
"0-0.3": { "fold": 0.83, "call": 0.10, "bet": 0.04, "raise": 0.03 },
"0.3-0.5": { "fold": 0.55, "call": 0.27, "bet": 0.14, "raise": 0.04 },
"0.5-0.7": { "fold": 0.24, "call": 0.30, "bet": 0.33, "raise": 0.13 },
"0.7-1.0": { "fold": 0.03, "call": 0.08, "bet": 0.54, "raise": 0.35 }
}
},

"betSizing": {
"valueBet": [0.5, 0.67, 0.75, 1.0, 1.25],
"bluffBet": [0.25, 0.33, 0.5, 1.1]
}
}
Below is a complete, multi‑profile dataset containing 8 realistic poker opponent types, each with full:

• Preflop frequencies
• Postflop frequencies by hand‑strength range
• Bet sizing tendencies

All follow your exact JSON requirements.
No special formatting, fully copy‑paste ready.

Profiles included:

Tight‑Aggressive (TAG)
Loose‑Aggressive (LAG)
Nit / Ultra‑Tight
Whale / Maniac
Passive Calling Station
Balanced Online Reg / GTO‑ish
Live Intermediate Casino Player
High Roller Professional Solver‑Hybrid
MASTER MULTI‑PROFILE OPPONENT DATASET
{
"profiles": {

"TAG": {
"preflop": {
"UTG": { "fold": 0.82, "call": 0.09, "raise": 0.09 },
"MP": { "fold": 0.76, "call": 0.13, "raise": 0.11 },
"CO": { "fold": 0.63, "call": 0.18, "raise": 0.19 },
"BTN": { "fold": 0.55, "call": 0.25, "raise": 0.20 },
"SB": { "fold": 0.72, "call": 0.16, "raise": 0.12 },
"BB": { "fold": 0.50, "call": 0.40, "raise": 0.10 }
},
"postflop": {
"flop": {
"0-0.3": { "fold": 0.75, "call": 0.17, "bet": 0.06, "raise": 0.02 },
"0.3-0.5": { "fold": 0.42, "call": 0.37, "bet": 0.17, "raise": 0.04 },
"0.5-0.7": { "fold": 0.12, "call": 0.35, "bet": 0.41, "raise": 0.12 },
"0.7-1.0": { "fold": 0.03, "call": 0.10, "bet": 0.60, "raise": 0.27 }
},
"turn": {
"0-0.3": { "fold": 0.78, "call": 0.15, "bet": 0.05, "raise": 0.02 },
"0.3-0.5": { "fold": 0.50, "call": 0.33, "bet": 0.13, "raise": 0.04 },
"0.5-0.7": { "fold": 0.17, "call": 0.34, "bet": 0.37, "raise": 0.12 },
"0.7-1.0": { "fold": 0.05, "call": 0.12, "bet": 0.56, "raise": 0.27 }
},
"river": {
"0-0.3": { "fold": 0.84, "call": 0.12, "bet": 0.03, "raise": 0.01 },
"0.3-0.5": { "fold": 0.57, "call": 0.31, "bet": 0.10, "raise": 0.02 },
"0.5-0.7": { "fold": 0.26, "call": 0.33, "bet": 0.30, "raise": 0.11 },
"0.7-1.0": { "fold": 0.04, "call": 0.14, "bet": 0.52, "raise": 0.30 }
}
},
"betSizing": {
"valueBet": [0.5, 0.67, 0.75, 1.0],
"bluffBet": [0.33, 0.5]
}
},


"LAG": {
"preflop": {
"UTG": { "fold": 0.70, "call": 0.17, "raise": 0.13 },
"MP": { "fold": 0.63, "call": 0.22, "raise": 0.15 },
"CO": { "fold": 0.50, "call": 0.27, "raise": 0.23 },
"BTN": { "fold": 0.43, "call": 0.30, "raise": 0.27 },
"SB": { "fold": 0.60, "call": 0.23, "raise": 0.17 },
"BB": { "fold": 0.40, "call": 0.48, "raise": 0.12 }
},
"postflop": {
"flop": {
"0-0.3": { "fold": 0.67, "call": 0.20, "bet": 0.09, "raise": 0.04 },
"0.3-0.5": { "fold": 0.34, "call": 0.35, "bet": 0.23, "raise": 0.08 },
"0.5-0.7": { "fold": 0.10, "call": 0.32, "bet": 0.43, "raise": 0.15 },
"0.7-1.0": { "fold": 0.02, "call": 0.07, "bet": 0.63, "raise": 0.28 }
},
"turn": {
"0-0.3": { "fold": 0.72, "call": 0.18, "bet": 0.08, "raise": 0.02 },
"0.3-0.5": { "fold": 0.41, "call": 0.33, "bet": 0.20, "raise": 0.06 },
"0.5-0.7": { "fold": 0.14, "call": 0.30, "bet": 0.40, "raise": 0.16 },
"0.7-1.0": { "fold": 0.03, "call": 0.09, "bet": 0.55, "raise": 0.33 }
},
"river": {
"0-0.3": { "fold": 0.80, "call": 0.13, "bet": 0.05, "raise": 0.02 },
"0.3-0.5": { "fold": 0.52, "call": 0.29, "bet": 0.15, "raise": 0.04 },
"0.5-0.7": { "fold": 0.23, "call": 0.30, "bet": 0.32, "raise": 0.15 },
"0.7-1.0": { "fold": 0.03, "call": 0.12, "bet": 0.50, "raise": 0.35 }
}
},
"betSizing": {
"valueBet": [0.5, 0.75, 1.0, 1.5],
"bluffBet": [0.33, 0.5, 0.9]
}
},


"NIT": {
"preflop": {
"UTG": { "fold": 0.90, "call": 0.06, "raise": 0.04 },
"MP": { "fold": 0.85, "call": 0.09, "raise": 0.06 },
"CO": { "fold": 0.78, "call": 0.13, "raise": 0.09 },
"BTN": { "fold": 0.70, "call": 0.18, "raise": 0.12 },
"SB": { "fold": 0.82, "call": 0.13, "raise": 0.05 },
"BB": { "fold": 0.58, "call": 0.38, "raise": 0.04 }
},
"postflop": {
"flop": {
"0-0.3": { "fold": 0.88, "call": 0.10, "bet": 0.01, "raise": 0.01 },
"0.3-0.5": { "fold": 0.65, "call": 0.29, "bet": 0.05, "raise": 0.01 },
"0.5-0.7": { "fold": 0.30, "call": 0.50, "bet": 0.15, "raise": 0.05 },
"0.7-1.0": { "fold": 0.05, "call": 0.15, "bet": 0.60, "raise": 0.20 }
},
"turn": {
"0-0.3": { "fold": 0.92, "call": 0.07, "bet": 0.01, "raise": 0.00 },
"0.3-0.5": { "fold": 0.70, "call": 0.26, "bet": 0.03, "raise": 0.01 },
"0.5-0.7": { "fold": 0.35, "call": 0.48, "bet": 0.12, "raise": 0.05 },
"0.7-1.0": { "fold": 0.08, "call": 0.20, "bet": 0.50, "raise": 0.22 }
},
"river": {
"0-0.3": { "fold": 0.95, "call": 0.05, "bet": 0.00, "raise": 0.00 },
"0.3-0.5": { "fold": 0.74, "call": 0.23, "bet": 0.02, "raise": 0.01 },
"0.5-0.7": { "fold": 0.40, "call": 0.45, "bet": 0.10, "raise": 0.05 },
"0.7-1.0": { "fold": 0.12, "call": 0.18, "bet": 0.45, "raise": 0.25 }
}
},
"betSizing": {
"valueBet": [0.5, 0.67],
"bluffBet": [0.25]
}
},


"MANIAC": {
"preflop": {
"UTG": { "fold": 0.50, "call": 0.25, "raise": 0.25 },
"MP": { "fold": 0.45, "call": 0.25, "raise": 0.30 },
"CO": { "fold": 0.38, "call": 0.27, "raise": 0.35 },
"BTN": { "fold": 0.35, "call": 0.28, "raise": 0.37 },
"SB": { "fold": 0.50, "call": 0.30, "raise": 0.20 },
"BB": { "fold": 0.36, "call": 0.45, "raise": 0.19 }
},
"postflop": {
"flop": {
"0-0.3": { "fold": 0.58, "call": 0.19, "bet": 0.15, "raise": 0.08 },
"0.3-0.5": { "fold": 0.25, "call": 0.28, "bet": 0.30, "raise": 0.17 },
"0.5-0.7": { "fold": 0.07, "call": 0.22, "bet": 0.45, "raise": 0.26 },
"0.7-1.0": { "fold": 0.02, "call": 0.08, "bet": 0.48, "raise": 0.42 }
},
"turn": {
"0-0.3": { "fold": 0.62, "call": 0.18, "bet": 0.14, "raise": 0.06 },
"0.3-0.5": { "fold": 0.28, "call": 0.30, "bet": 0.25, "raise": 0.17 },
"0.5-0.7": { "fold": 0.10, "call": 0.22, "bet": 0.40, "raise": 0.28 },
"0.7-1.0": { "fold": 0.02, "call": 0.09, "bet": 0.45, "raise": 0.44 }
},
"river": {
"0-0.3": { "fold": 0.66, "call": 0.22, "bet": 0.07, "raise": 0.05 },
"0.3-0.5": { "fold": 0.30, "call": 0.32, "bet": 0.25, "raise": 0.13 },
"0.5-0.7": { "fold": 0.12, "call": 0.26, "bet": 0.34, "raise": 0.28 },
"0.7-1.0": { "fold": 0.03, "call": 0.10, "bet": 0.38, "raise": 0.49 }
}
},
"betSizing": {
"valueBet": [0.75, 1.0, 1.5, 2.0],
"bluffBet": [0.5, 1.0, 2.5]
}
},


"CALLING_STATION": {
"preflop": {
"UTG": { "fold": 0.65, "call": 0.28, "raise": 0.07 },
"MP": { "fold": 0.60, "call": 0.32, "raise": 0.08 },
"CO": { "fold": 0.55, "call": 0.37, "raise": 0.08 },
"BTN": { "fold": 0.50, "call": 0.40, "raise": 0.10 },
"SB": { "fold": 0.65, "call": 0.30, "raise": 0.05 },
"BB": { "fold": 0.45, "call": 0.50, "raise": 0.05 }
},
"postflop": {
"flop": {
"0-0.3": { "fold": 0.55, "call": 0.40, "bet": 0.03, "raise": 0.02 },
"0.3-0.5": { "fold": 0.23, "call": 0.63, "bet": 0.10, "raise": 0.04 },
"0.5-0.7": { "fold": 0.15, "call": 0.58, "bet": 0.22, "raise": 0.05 },
"0.7-1.0": { "fold": 0.08, "call": 0.50, "bet": 0.22, "raise": 0.20 }
},
"turn": {
"0-0.3": { "fold": 0.60, "call": 0.36, "bet": 0.02, "raise": 0.02 },
"0.3-0.5": { "fold": 0.30, "call": 0.55, "bet": 0.10, "raise": 0.05 },
"0.5-0.7": { "fold": 0.17, "call": 0.56, "bet": 0.20, "raise": 0.07 },
"0.7-1.0": { "fold": 0.10, "call": 0.42, "bet": 0.25, "raise": 0.23 }
},
"river": {
"0-0.3": { "fold": 0.65, "call": 0.32, "bet": 0.02, "raise": 0.01 },
"0.3-0.5": { "fold": 0.35, "call": 0.53, "bet": 0.08, "raise": 0.04 },
"0.5-0.7": { "fold": 0.20, "call": 0.54, "bet": 0.18, "raise": 0.08 },
"0.7-1.0": { "fold": 0.12, "call": 0.40, "bet": 0.22, "raise": 0.26 }
}
},
"betSizing": {
"valueBet": [0.33, 0.5],
"bluffBet": [0.25]
}
},


"ONLINE_REG": {
"preflop": {
"UTG": { "fold": 0.80, "call": 0.10, "raise": 0.10 },
"MP": { "fold": 0.74, "call": 0.14, "raise": 0.12 },
"CO": { "fold": 0.62, "call": 0.20, "raise": 0.18 },
"BTN": { "fold": 0.50, "call": 0.26, "raise": 0.24 },
"SB": { "fold": 0.68, "call": 0.20, "raise": 0.12 },
"BB": { "fold": 0.47, "call": 0.43, "raise": 0.10 }
},
"postflop": {
"flop": {
"0-0.3": { "fold": 0.70, "call": 0.20, "bet": 0.07, "raise": 0.03 },
"0.3-0.5": { "fold": 0.40, "call": 0.36, "bet": 0.19, "raise": 0.05 },
"0.5-0.7": { "fold": 0.12, "call": 0.34, "bet": 0.41, "raise": 0.13 },
"0.7-1.0": { "fold": 0.03, "call": 0.10, "bet": 0.55, "raise": 0.32 }
},
"turn": {
"0-0.3": { "fold": 0.77, "call": 0.17, "bet": 0.05, "raise": 0.01 },
"0.3-0.5": { "fold": 0.46, "call": 0.38, "bet": 0.13, "raise": 0.03 },
"0.5-0.7": { "fold": 0.16, "call": 0.34, "bet": 0.37, "raise": 0.13 },
"0.7-1.0": { "fold": 0.06, "call": 0.12, "bet": 0.50, "raise": 0.32 }
},
"river": {
"0-0.3": { "fold": 0.82, "call": 0.14, "bet": 0.03, "raise": 0.01 },
"0.3-0.5": { "fold": 0.52, "call": 0.35, "bet": 0.10, "raise": 0.03 },
"0.5-0.7": { "fold": 0.22, "call": 0.34, "bet": 0.30, "raise": 0.14 },
"0.7-1.0": { "fold": 0.07, "call": 0.09, "bet": 0.47, "raise": 0.37 }
}
},
"betSizing": {
"valueBet": [0.5, 0.67, 0.75, 1.0],
"bluffBet": [0.33, 0.5, 1.1]
}
},


"LIVE_CASINO_INTERMEDIATE": {
"preflop": {
"UTG": { "fold": 0.75, "call": 0.17, "raise": 0.08 },
"MP": { "fold": 0.68, "call": 0.22, "raise": 0.10 },
"CO": { "fold": 0.58, "call": 0.28, "raise": 0.14 },
"BTN": { "fold": 0.52, "call": 0.30, "raise": 0.18 },
"SB": { "fold": 0.65, "call": 0.25, "raise": 0.10 },
"BB": { "fold": 0.50, "call": 0.40, "raise": 0.10 }
},
"postflop": {
"flop": {
"0-0.3": { "fold": 0.70, "call": 0.22, "bet": 0.06, "raise": 0.02 },
"0.3-0.5": { "fold": 0.38, "call": 0.42, "bet": 0.16, "raise": 0.04 },
"0.5-0.7": { "fold": 0.15, "call": 0.38, "bet": 0.37, "raise": 0.10 },
"0.7-1.0": { "fold": 0.03, "call": 0.15, "bet": 0.60, "raise": 0.22 }
},
"turn": {
"0-0.3": { "fold": 0.75, "call": 0.20, "bet": 0.03, "raise": 0.02 },
"0.3-0.5": { "fold": 0.44, "call": 0.40, "bet": 0.12, "raise": 0.04 },
"0.5-0.7": { "fold": 0.19, "call": 0.39, "bet": 0.33, "raise": 0.09 },
"0.7-1.0": { "fold": 0.05, "call": 0.16, "bet": 0.50, "raise": 0.29 }
},
"river": {
"0-0.3": { "fold": 0.80, "call": 0.17, "bet": 0.02, "raise": 0.01 },
"0.3-0.5": { "fold": 0.50, "call": 0.40, "bet": 0.08, "raise": 0.02 },
"0.5-0.7": { "fold": 0.26, "call": 0.42, "bet": 0.24, "raise": 0.08 },
"0.7-1.0": { "fold": 0.06, "call": 0.15, "bet": 0.45, "raise": 0.34 }
}
},
"betSizing": {
"valueBet": [0.5, 0.75],
"bluffBet": [0.33]
}
},


"HIGH_ROLLER_PRO": {
"preflop": {
"UTG": { "fold": 0.78, "call": 0.13, "raise": 0.09 },
"MP": { "fold": 0.72, "call": 0.17, "raise": 0.11 },
"CO": { "fold": 0.60, "call": 0.23, "raise": 0.17 },
"BTN": { "fold": 0.52, "call": 0.25, "raise": 0.23 },
"SB": { "fold": 0.68, "call": 0.20, "raise": 0.12 },
"BB": { "fold": 0.48, "call": 0.42, "raise": 0.10 }
},
"postflop": {
"flop": {
"0-0.3": { "fold": 0.73, "call": 0.18, "bet": 0.06, "raise": 0.03 },
"0.3-0.5": { "fold": 0.41, "call": 0.36, "bet": 0.19, "raise": 0.04 },
"0.5-0.7": { "fold": 0.10, "call": 0.34, "bet": 0.40, "raise": 0.16 },
"0.7-1.0": { "fold": 0.02, "call": 0.09, "bet": 0.52, "raise": 0.37 }
},
"turn": {
"0-0.3": { "fold": 0.77, "call": 0.18, "bet": 0.04, "raise": 0.01 },
"0.3-0.5": { "fold": 0.45, "call": 0.38, "bet": 0.14, "raise": 0.03 },
"0.5-0.7": { "fold": 0.14, "call": 0.33, "bet": 0.38, "raise": 0.15 },
"0.7-1.0": { "fold": 0.05, "call": 0.12, "bet": 0.48, "raise": 0.35 }
},
"river": {
"0-0.3": { "fold": 0.82, "call": 0.14, "bet": 0.03, "raise": 0.01 },
"0.3-0.5": { "fold": 0.50, "call": 0.35, "bet": 0.12, "raise": 0.03 },
"0.5-0.7": { "fold": 0.22, "call": 0.33, "bet": 0.31, "raise": 0.14 },
"0.7-1.0": { "fold": 0.05, "call": 0.10, "bet": 0.43, "raise": 0.42 }
}
},
"betSizing": {
"valueBet": [0.5, 0.67, 0.75, 1.0, 1.5],
"bluffBet": [0.33, 0.5, 1.2]
}
}
}
}
Ignore the differences between live poker and online poker profiles. Take note of the Tight aggressive(TAG), loose-aggressive(LAG), Nit/Ultra-tight, whale, calling station, balanced player, etc. At the end of a hand's results, put these categories into the analysis. Provide what you should do against a player like them and whether the play was incorrect or correct. 

Use these datasets to help improve the algorithm for how each player at the table behaves now, but do not follow to these percentages/numbers/bets completely straight line 100%, but rather use them as a good idea for how some archetypes of players behave. Also, in real life, no one plays 100% to a tee of a certain way.
Use the datasets and instructions in @poker-gto-trainer/Requirements/player_dataset.md to adjust and greaten the algorithm for how other players at the table behave in the game as well as how I should play for EV wise.

Uses the structure required by @poker-gto-trainer/Requirements/player_dataset.md
Improves opponent‑behavior modeling
Adds EV‑optimized strategy guidance for “your” player
Is formatted in a way Cursor understands (clear instructions, roles, rules, schema definitions)
Keeps everything code‑friendly (no special formatting beyond bullet points)
You can paste this directly into Cursor’s system prompt or a .cursor/rules file.

CURSOR‑OPTIMIZED MASTER PROMPT FOR POKER GTO TRAINER
System rules:
• You are the Poker Engine AI for the Poker GTO Trainer application.
• You must follow the dataset and format defined in @poker-gto-trainer/Requirements/player_dataset.md.
• All outputs must be deterministic, structured, and suitable for direct use in code.
• When generating opponents, balance realism, population tendencies, exploits, and GTO-inspired frequencies based on the dataset.
• Always output valid JSON when asked for player models.

Your tasks:

Improve and generate player models that follow the dataset rules.
Model realistic opponent behavior for all player types (recreational, reg, pro, maniac, nit, etc).
Simulate how each profile responds to different action states.
Output optimal EV-maximizing actions for the user-player based on opponent model, board texture, hand strength bucket, position, and pot size.
Explain strategy in simple terms, but also output machine-readable decisions.
When asked, generate training data: action frequencies, exploit adjustments, bet sizing distributions, and counter-strategies.
Core behavioral modeling rules (summarized from player_dataset.md):
• Every player profile must include preflop frequencies per position.
• Every street must have action frequencies by hand-strength bucket (0–0.3, 0.3–0.5, 0.5–0.7, 0.7–1.0).
• Player must have bet sizing tendencies separated into value and bluff buckets.
• The final dataset must match the schema exactly.
• All percentages must sum to 1.
• All behavior must be consistent across streets.

Opponent engine rules:
• Simulate each opponent independently.
• Consider dynamic factors: stack depth, pot odds, SPR, position, previous actions, and multiway adjustments.
• Use different logic per profile:

Loose players call and bluff too much.
Tight players fold too much.
Pros balance ranges and polarize bets.
Live players call too wide but rarely bluff large.
• Adjust behavior over time based on observed frequencies.
User-player EV logic:
• Compute EV for each possible action: fold, call, raise, bet, check.
• Use opponent tendencies to determine fold equity, calling range density, and raise frequency.
• On every request:

Output recommended action.
Expected value of action.
Short explanation.
JSON with structured decision data.
Output format for decisions:
Always include the following when the user asks for analysis:
{
"recommendedAction": "call/fold/raise/bet/check",
"ev": number,
"confidence": number,
"reasoning": "short text explanation",
"frequencies": {
"fold": number,
"call": number,
"raise": number,
"betSizes": [values]
}
}

Player model output format:
Follow exactly the opponentStats schema:
{
"preflop": { ... },
"postflop": {
"flop": {...},
"turn": {...},
"river": {...}
},
"betSizing": { ... }
}

Additional instructions:
• Do not hallucinate missing fields.
• Ensure all frequencies sum to 1 within each category.
• Use realistic, population-based frequencies unless user specifies a style.
• Opponents should have consistent tendencies across streets.
• Apply behavioral rules from player_dataset.md when adjusting data.

Goal of AI:
• Generate lifelike poker opponents.
• Recommend EV-maximizing lines.
• Assist with strategy and training content.
• Provide outputs that can directly power the in-game simulation engine.

HOW TO MAKE THIS EVEN STRONGER IN CURSOR
Here are additional improvements you can add to the prompt:

Add Mode Switching
Allow:
• “data mode” → output only JSON
• “analysis mode” → output readable strategy
• “simulation mode” → simulate multi-player actions
• “training mode” → output drill-friendly situations
Inject dynamic learning
Tell Cursor:
• Track long-term tendencies of each opponent
• Adjust future simulations based on past actions
• Simulate exploits based on frequency deviations
Add cheat-prevention
Force:
• No impossible reads
• No hole-card knowledge unless provided
• No solver-level assumptions unless asked
Add error checking
Instruct:
• Validate all frequencies sum to 1
• Validate JSON structure matches dataset
• Describe what corrections were applied
Add versioning
Include:
• datasetVersion
• modelVersion
• generationMethod
Add simulation scenarios
Example:
• “Run a 100-hand simulation with 3 LAG, 2 NIT, 1 PRO opponents.”
• The model outputs full action logs + EV summary.
Add auto-explainer
Whenever user asks “why?”, Cursor provides:
• Population-based reasoning
• GTO-based reasoning
• Exploit-based reasoning
• Hand-strength explanation
• Bet size logic