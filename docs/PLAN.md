# Hockey Live Scoring App — Build Plan

## 1. What you're building (v1 scope)

A mobile-friendly web app where a scorer logs match events live (goals, assists, penalties, shots, saves) and anyone with the link watches the score and event feed update in real time. Player and team stats are derived automatically from the event log — you don't build them separately.

**Not in v1:** native apps, fantasy leagues, monetization, AI predictions, wearables, merchandise. Those come later, if at all.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite), mobile-responsive CSS | One codebase, no app store, instant sharing via link |
| Backend | Node.js + Express, simple REST | Easy to reason about, no GraphQL overhead |
| Database | PostgreSQL via Supabase | Relational data fits matches/players/events; Supabase bundles DB + realtime + auth |
| Real-time | Supabase Realtime (Postgres subscriptions) | No separate WebSocket server to run |
| Hosting | Vercel (frontend) + Railway or Supabase (backend/DB) | Free tiers, deploy on push, no DevOps |
| Auth | Supabase Auth (email/password or magic link) | Only scorers need to log in; spectators don't |

---

## 3. Database schema

```sql
-- Teams
team (
  id            uuid primary key,
  name          text not null,
  short_name    text,
  created_at    timestamp default now()
)

-- Players
player (
  id            uuid primary key,
  team_id       uuid references team(id),
  name          text not null,
  jersey_number int,
  position      text,      -- forward, defense, goalie
  created_at    timestamp default now()
)

-- Matches
match (
  id            uuid primary key,
  home_team_id  uuid references team(id),
  away_team_id  uuid references team(id),
  scheduled_at  timestamp,
  status        text,      -- scheduled, live, final
  home_score    int default 0,
  away_score    int default 0,
  created_at    timestamp default now()
)

-- Events (the core table — everything else is derived from this)
event (
  id            uuid primary key,
  match_id      uuid references match(id),
  player_id     uuid references player(id),
  team_id       uuid references team(id),
  type          text,      -- goal, assist, penalty, shot, save
  period        int,
  game_time     text,      -- e.g. "12:34"
  x             float,     -- shot/event location, optional
  y             float,
  penalty_minutes int,     -- only for penalty events
  created_at    timestamp default now()
)

-- Scorer accounts (via Supabase Auth) mapped to matches they can edit
match_scorer (
  match_id      uuid references match(id),
  user_id       uuid references auth.users(id)
)
```

Everything downstream — player career stats, team standings, shot charts — is a `SELECT` over `event`, not a new table.

---

## 4. Site structure / pages

```
/                          → Home: list of live + upcoming matches
/matches                   → All matches (filter by team, date, status)
/matches/:id               → Live match view (public)
                               - scoreboard
                               - period/time
                               - event feed (goal by X, assisted by Y, 12:34 P2)
                               - shot chart (v2 if time-boxed out of v1)
/matches/:id/score         → Scorer console (auth required)
                               - tap-to-log: goal / assist / penalty / shot / save
                               - player + team picker
                               - undo last event
/teams                     → List of teams
/teams/:id                 → Team page: roster, upcoming/past matches, record
/players/:id               → Player page: auto-generated career stats from event log
/login                     → Scorer login (Supabase Auth)
/admin                     → Create match, create teams/rosters (auth required)
```

Keep it to these 8 routes for v1. No dashboards, no community features, no notifications yet.

---

## 5. API endpoints

```
GET    /api/matches                  list matches (filter: status, team, date)
GET    /api/matches/:id              match detail incl. current score
POST   /api/matches                  create match (auth)
PATCH  /api/matches/:id              update status/score (auth)

GET    /api/matches/:id/events       event feed for a match
POST   /api/matches/:id/events       log a new event (auth, scorer only)
DELETE /api/events/:id               undo an event (auth)

GET    /api/teams
GET    /api/teams/:id
POST   /api/teams                    (auth)

GET    /api/players/:id              player detail + aggregated stats
POST   /api/players                  (auth)
```

Real-time: frontend subscribes to Postgres changes on `event` and `match` tables for the given `match_id` — no polling needed.

---

## 6. Build order (suggested 6–8 week solo timeline)

| Week | Milestone |
|---|---|
| 1 | Set up Supabase project, create schema, seed 2 test teams + rosters |
| 2 | Build admin: create team/players/match (no auth yet, just get it working) |
| 3 | Build scorer console: log events, update score, tied to a match |
| 4 | Build public live match view, wire up Supabase Realtime subscription |
| 5 | Add auth (scorer login), lock down scorer console + admin routes |
| 6 | Build team page + player page (derived stats from event table) |
| 7 | Polish: mobile responsiveness, dark mode, undo button, empty states |
| 8 | Test with one real match end-to-end, fix what breaks |

Ship after week 8 with one real league/team using it. Don't build anything past this list until that happens.

---

## 7. What comes after v1 (only if v1 gets used)

- Shot chart visualization (data's already there from the `x`/`y` fields)
- Season standings page
- Push notifications for goals
- MVP voting / leaderboards
- Everything else from the original wishlist (fantasy leagues, wearables, monetization) — revisit only once you have real usage data telling you what's worth building next.
