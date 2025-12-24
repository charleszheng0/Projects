# External APIs & Tools Used in Poker GTO Trainer

## Zustand
**What it does:** State management library for React/Next.js
**Why we use it:** Manages game state (current hand, cards, position, user actions) across components without prop drilling
**Example:** Stores the current hand, position, and user's selected action so multiple components can access it

---

## Replicate
**What it does:** Platform for running machine learning models (optional for future ML features)
**Why we use it:** Could be used later to run ML models for improved GTO recommendations or poker AI features
**Example:** If you want to add ML-based strategy recommendations beyond basic GTO charts

---

## Clerk
**What it does:** Authentication service (sign-up, sign-in, user management)
**Why we use it:** Handles all user authentication - no need to build login system from scratch
**Example:** Users sign up/sign in, Clerk manages their accounts, sessions, and security

---

## Supabase
**What it does:** Backend-as-a-Service (database + API)
**Why we use it:** Stores user data, hand history, and statistics permanently in a PostgreSQL database
**Example:** Saves each hand a user plays, their statistics, and progress - persists even after browser closes

---

## Shadcn
**What it does:** UI component library (buttons, cards, forms, etc.)
**Why we use it:** Provides beautiful, ready-made UI components that you copy into your project
**Example:** Pre-built Button, Card, Input components for the poker table interface
