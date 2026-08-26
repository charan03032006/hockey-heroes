-- Hockey Heroes schema
create extension if not exists "uuid-ossp";

create table if not exists team (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  short_name text,
  created_at timestamp default now()
);

create table if not exists player (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references team(id) on delete cascade,
  name text not null,
  jersey_number int,
  position text,
  created_at timestamp default now()
);

create table if not exists match (
  id uuid primary key default uuid_generate_v4(),
  home_team_id uuid references team(id),
  away_team_id uuid references team(id),
  scheduled_at timestamp,
  status text default 'scheduled', -- scheduled | live | final
  home_score int default 0,
  away_score int default 0,
  created_at timestamp default now()
);

create table if not exists event (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references match(id) on delete cascade,
  player_id uuid references player(id),
  team_id uuid references team(id),
  type text not null, -- goal | assist | penalty | shot | save
  period int,
  game_time text,
  x float,
  y float,
  penalty_minutes int,
  created_at timestamp default now()
);

create table if not exists match_scorer (
  match_id uuid references match(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (match_id, user_id)
);

-- Helpful view: player career stats derived from event log
create or replace view player_stats as
select
  p.id as player_id,
  p.name,
  p.team_id,
  count(*) filter (where e.type = 'goal') as goals,
  count(*) filter (where e.type = 'assist') as assists,
  count(*) filter (where e.type = 'penalty') as penalties,
  count(*) filter (where e.type = 'shot') as shots,
  count(*) filter (where e.type = 'save') as saves
from player p
left join event e on e.player_id = p.id
group by p.id, p.name, p.team_id;

-- Enable realtime on the tables the frontend subscribes to
alter publication supabase_realtime add table event;
alter publication supabase_realtime add table match;
