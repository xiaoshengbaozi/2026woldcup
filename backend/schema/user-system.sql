create table if not exists users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  display_name text not null,
  home_team_id text,
  timezone text not null default 'Asia/Shanghai',
  language text not null default 'zh-CN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invitation_codes (
  id uuid primary key,
  code text not null unique,
  note text,
  max_uses integer not null default 1,
  used_count integer not null default 0,
  expires_at timestamptz,
  disabled_at timestamptz,
  used_by jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_followed_teams (
  user_id uuid not null references users(id) on delete cascade,
  team_id text not null,
  team_name text not null,
  region text,
  followed_at timestamptz not null default now(),
  primary key (user_id, team_id)
);

create table if not exists user_followed_players (
  user_id uuid not null references users(id) on delete cascade,
  player_id text not null,
  player_name text not null,
  team text,
  position text,
  followed_at timestamptz not null default now(),
  primary key (user_id, player_id)
);

create table if not exists user_favorite_matches (
  user_id uuid not null references users(id) on delete cascade,
  match_id text not null,
  title text not null,
  stage text,
  starts_at timestamptz,
  added_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

create table if not exists user_match_reminders (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  match_id text not null,
  title text not null,
  starts_at timestamptz,
  remind_before_minutes integer not null default 30,
  channel text not null default 'site',
  enabled boolean not null default true,
  last_queued_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists user_notifications (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  channel text not null default 'site',
  read boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists user_match_predictions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  match_id text not null,
  title text not null,
  home_score integer not null,
  away_score integer not null,
  confidence integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_watch_records (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  match_id text not null,
  title text not null,
  status text not null default 'planned',
  watched_at timestamptz not null default now()
);

create table if not exists user_news_subscriptions (
  user_id uuid not null references users(id) on delete cascade,
  topic_id text not null,
  topic text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create index if not exists idx_user_match_reminders_due
  on user_match_reminders (enabled, starts_at, last_queued_at);

create index if not exists idx_user_predictions_match
  on user_match_predictions (match_id, updated_at desc);

create index if not exists idx_user_notifications_unread
  on user_notifications (user_id, read, created_at desc);

create index if not exists idx_invitation_codes_status
  on invitation_codes (disabled_at, expires_at, used_count);
