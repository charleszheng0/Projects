It’s a community-built “Beli for real‑life sidequests”
Web app name: queued (lowercase)
Main idea
A quest feed, not a to‑do app: users ask, “I have x minutes, what’s my sidequest?” and get a handful hyper-specific possibilities near me
Quests can be about money (finance), movement and wellbeing (health), eco‑actions (sustainability), or weird fun/social stuff (interactive media).
User-generated stuff
Anyone can create quests through in app configuration
Community rates and tags quests 
Personalization
When you tap “give me a quest,” you specify:
Time
Context: at home / in city / outdoors, solo vs with friends, energy level
personalization for what you like personally
Social aspects
Just like beli, you’ll have “want to go”, “have been”, shit like that
Rank system similar to beli
You earn basic xp, streaks, and badges across the four tracks, and see a feed of friends’ completed quests and their rankings.
Safety
To prevent illegal stuff, I need to personally approve it.
Users can report unsafe quests

Workflow: 
Tech stack: 
Next.js frontend
Tailwind css styling
Supabase backend
Vercel deployment

Skeleton: 
A prompter for what kind of things you enjoy personally as a quiz you can always take “What are you feeling like doing today?” or something
A local map that has places of all sidequests near you.  First do not populate it. I will populate it myself through a manual acceptance page.
The app will consist of these main pages:


1. One will be the map
2. Another will be Friends
3. Another will be profile, which will show my personality, my xp, and sidequests that are done and on the same page, sidequests that I should be looking forward to. 
4. The beli-like feature that will let you rate based on swiping y/n to other side quests that you've done or potentially haven't done. 
5. Another page for creating sidequests. This should be linked to the backend where I’ll be able to manually approve thorugh an email I receive
Here's some ideas: 
-geocaching
-go to partner dance events like swing dancing, ballroom dancing, polka, etc. (swing dancing is a side quest I got sucked into; there's a whole scene for this kind of stuff and a culture it's crazy)
-go to a public court trial
-volunteer 
-take classes at a community center
-perform music gigs (if you do music)
-go to music performances (open mics, liveshows, recitals, festivals, etc.)
-work at a haunted house
-go foraging (do it with someone experienced in this)
-entertain people at nursing homes 
-peace corps / americorps (this is more of a commitment and you have to be hired for this)
-au pair (also a commitment) 
-work / volunteer at your local soup kitchen
-enter a contest
-travel
-talk to strangers
-go into a building and wander around like it's a museum
-explore
Here's a detailed engineering prompt doc you can paste into a new Claude conversation:

queued — Feature Implementation Spec

Stack: Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase (Postgres + Auth + RLS), Resend (email). Mobile-first, card-based UI. Color palette: cream background #FEFCF3, green accents #16A34A, stone neutrals.

Existing files of note:

src/types/index.ts — Quest, UserProfile, QuestTrack types; TRACK_META, getRank()
src/lib/supabase.ts — anon client (client-side)
src/context/AuthContext.tsx — useAuth() hook, exposes user/session/signOut
src/app/api/quests/submit/route.ts — POST, inserts quest as pending, emails admin
src/app/api/quests/approve/route.ts — GET, updates quest status to approved/rejected
src/app/page.tsx — feed, fetches approved quests from Supabase
src/components/QuestCard.tsx — reusable card component
src/components/BottomNav.tsx — 5-tab nav: Quests, Map, Friends, Profile, Create
Supabase tables already created: profiles (id, username, avatar_url, bio, xp_total, xp_money, xp_health, xp_eco, xp_fun, streak_days), quests (id, title, description, track, time_minutes, location_type, energy_level, tags[], status, created_by, community_rating, rating_count), user_quests (id, user_id, quest_id, status [want/done/skipped], rating, note, completed_at)

Features to build:

1. Onboarding preference quiz (/onboarding)
After signup, before landing on the feed, show a 5-step swipeable quiz:

Step 1: Which tracks excite you? (multi-select: 💰 Finance, 🏃 Wellbeing, 🌱 Eco, 🎉 Fun & Social)
Step 2: How much free time do you usually have? (30 min / 1–2 hrs / half day)
Step 3: Where are you usually? (At home / In the city / Outdoors)
Step 4: Energy level right now? (Low key / Moderate / High energy)
Step 5: What's your vibe? (Solo / With friends / Either)
Save answers to a preferences column (jsonb) on the profiles table. Redirect to feed after. Only show onboarding once (check if preferences is null).

2. "Give me a quest" button — personalized quest generator
On the home feed (src/app/page.tsx), wire the "Give me a quest" CTA to POST /api/quests/recommend.

/api/quests/recommend route: fetch the user's preferences from their profile. Query Supabase for approved quests filtered by their preferred tracks, time range, and location type. Exclude quests the user has already done or skipped (from user_quests). Return one random quest from the result. Display it in a full-screen modal overlay with a large card, a "Let's do it" (mark as want) button, and a "Next" button (get another suggestion). If no quests match, show a friendly empty state.

3. Real-time map (/map) — replace SVG placeholder
Install and use react-leaflet and leaflet. Show an actual map centered on the user's current location (use browser navigator.geolocation). Plot approved quests as custom pins using their lat and lng columns. Pin color matches track (blue = money, green = health, emerald = eco, purple = fun). Tapping a pin opens a bottom sheet with the QuestCard. Add a floating "Use my location" button if geolocation was denied. For quests without lat/lng, do not plot them.

Also add an admin-only field to the quest submit form and approval flow to optionally attach a real address/lat/lng. Use the Nominatim API (free, no key needed) to geocode an address string to lat/lng on the server side when a quest is submitted.

4. Swipe/rating UI (/swipe) — Beli-style discovery
Replace the current placeholder swipe page. Show a stack of quest cards (approved quests the user hasn't interacted with yet). Three actions:

Swipe left / press ✕ → mark as skipped in user_quests
Press 🔖 → mark as want in user_quests
Swipe right / press ✓ → open a rating modal: 1–5 stars + optional text note, then mark as done with rating and note saved to user_quests; award XP (30 XP base + track XP)
After rating, update community_rating and rating_count on the quest row. Use CSS transforms for swipe animation. Show a "You're all caught up" screen when queue is empty. Implement with useReducer to manage the card stack locally.

5. Real auth — login and signup pages
/login: email + password form using supabase.auth.signInWithPassword. Redirect to / on success. Show error inline.
/signup: username + email + password. Call supabase.auth.signUp, then supabase.from('profiles').update({ username }) using the returned user id. After signup, redirect to /onboarding.
Protect /profile, /swipe, /create, /friends with a middleware check: if no session, redirect to /login.

6. Real user profile (/profile)
Replace all mock data. On mount, fetch the authenticated user's profile from profiles using useAuth(). Display real username, real XP totals, real rank (use existing getRank() function), real per-track XP bars. Fetch their completed quests from user_quests joined with quests where status = 'done'. Show their want list (status = 'want'). Avatar: show initials from username if no avatar_url. Add an "Edit profile" sheet to update bio and username.

7. Friends system (/friends)
New Supabase table:


CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES profiles(id),
  addressee_id uuid REFERENCES profiles(id),
  status text DEFAULT 'pending', -- pending | accepted
  created_at timestamptz DEFAULT now()
);
RLS: users can see their own friendships (requester or addressee).

/friends page has three tabs:

Leaderboard: fetch accepted friends, sort by xp_total, show rank badge, XP, and username
Activity feed: fetch user_quests for accepted friends (join to quests and profiles), show "[Username] completed [Quest title]" cards with their rating and note, ordered by completed_at desc
Add friends: search bar that queries profiles by username (case-insensitive prefix match). Show result with "Add friend" button. Sends a friendship row with status = 'pending'. Show a "Requests" section at top showing incoming pending requests with Accept/Decline buttons.
All DB operations via Supabase client directly (no API routes needed — anon key + RLS handles it).