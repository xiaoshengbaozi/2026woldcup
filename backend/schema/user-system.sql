create table if not exists users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  email_verified_at timestamptz,
  email_verification_token_hash text,
  email_verification_expires_at timestamptz,
  email_verification_sent_at timestamptz,
  disabled_at timestamptz,
  display_name text not null,
  signature text,
  home_team_id text,
  avatar_player_id text,
  avatar_url text,
  timezone text not null default 'Asia/Shanghai',
  language text not null default 'zh-CN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users add column if not exists email_verified_at timestamptz;
alter table users add column if not exists email_verification_token_hash text;
alter table users add column if not exists email_verification_expires_at timestamptz;
alter table users add column if not exists email_verification_sent_at timestamptz;
alter table users add column if not exists disabled_at timestamptz;
alter table users add column if not exists signature text;
alter table users add column if not exists avatar_player_id text;
alter table users add column if not exists avatar_url text;

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
  logo text,
  followed_at timestamptz not null default now(),
  primary key (user_id, team_id)
);

alter table user_followed_teams add column if not exists logo text;

create table if not exists user_followed_players (
  user_id uuid not null references users(id) on delete cascade,
  player_id text not null,
  player_name text not null,
  team text,
  position text,
  photo text,
  followed_at timestamptz not null default now(),
  primary key (user_id, player_id)
);

alter table user_followed_players add column if not exists photo text;

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
  id text not null,
  user_id uuid not null references users(id) on delete cascade,
  match_id text not null,
  title text not null,
  starts_at timestamptz,
  remind_before_minutes integer not null default 30,
  channel text not null default 'site',
  enabled boolean not null default true,
  last_queued_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table user_match_reminders drop constraint if exists user_match_reminders_pkey;
alter table user_match_reminders alter column id type text using id::text;
alter table user_match_reminders add primary key (user_id, id);

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

create table if not exists user_prediction_archives (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  group_scores jsonb not null default '{}',
  knockout_picks jsonb not null default '{}',
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

create index if not exists idx_user_prediction_archives_user
  on user_prediction_archives (user_id, updated_at desc);

create index if not exists idx_user_notifications_unread
  on user_notifications (user_id, read, created_at desc);

create index if not exists idx_invitation_codes_status
  on invitation_codes (disabled_at, expires_at, used_count);

create table if not exists live_channels (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_live_channels_updated
  on live_channels (updated_at desc);

create table if not exists site_analytics_daily (
  day date primary key,
  views integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists site_analytics_sessions (
  session_id text primary key,
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_site_analytics_sessions_seen
  on site_analytics_sessions (last_seen_at);
