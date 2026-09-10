# Hockey Heroes

A live scoring and stats app for hockey matches — inspired by CricHeroes, built for hockey.

Log goals, assists, penalties, shots, and saves ball-by-ball (well, event-by-event), and let spectators follow live. Player and team stats are derived automatically from the event log.

## Structure

```
hockey-heroes/
├── backend/          Node.js + Express REST API
│   └── src/
│       ├── db/       Supabase client + schema.sql
│       └── routes/   matches, events, teams, players
├── frontend/         React (Vite) app
│   └── src/
│       ├── pages/    Home, MatchLive, Scorer, Team, Player, Admin, Login, TournamentManager
│       ├── components/
│       └── lib/      supabase client, api helper
└── docs/
    └── PLAN.md      Full build plan (schema, routes, roadmap)
```

## Setup

### 1. Database (Supabase)
1. Create a project at supabase.com
2. Run `backend/src/db/schema.sql` in the SQL editor
3. Copy your project URL and anon key

### 2. Backend
```bash
cd backend
cp .env.example .env   # fill in SUPABASE_URL and SUPABASE_ANON_KEY
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env   # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm install
npm run dev
```

## Status

v1 scaffold — core routes and pages stubbed per `docs/PLAN.md`. See that file for the full roadmap and what's intentionally left out of v1.
