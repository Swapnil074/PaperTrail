-- =============================================================
-- PaperTrail – Database Schema
-- Run this against your Supabase project via SQL editor
-- =============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Articles
-- ---------------------------------------------------------
create table if not exists articles (
  id              uuid        default gen_random_uuid() primary key,
  url             text        not null,
  title           text,
  content         text,                            -- parsed HTML body
  excerpt         text,                            -- 280-char plain text preview
  author          text,
  published_at    timestamptz,
  reading_time    integer,                         -- estimated minutes
  image_url       text,
  site_name       text,
  status          text        default 'unread'
                    check (status in ('unread','reading','read','archived')),
  telegram_message_id bigint,
  tags            text[]      default '{}',
  is_favorite     boolean     default false,
  fetch_error     text,
  fetched_at      timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists articles_status_idx        on articles (status);
create index if not exists articles_created_at_idx    on articles (created_at desc);
create index if not exists articles_is_favorite_idx   on articles (is_favorite) where is_favorite = true;

-- Full-text search index
create index if not exists articles_fts_idx on articles
  using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,'')));

-- ---------------------------------------------------------
-- Highlights
-- ---------------------------------------------------------
create table if not exists highlights (
  id            uuid        default gen_random_uuid() primary key,
  article_id    uuid        not null references articles (id) on delete cascade,
  text          text        not null,
  start_offset  integer     not null,
  end_offset    integer     not null,
  color         text        default 'yellow'
                  check (color in ('yellow','green','blue','pink','purple')),
  note          text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists highlights_article_id_idx on highlights (article_id);

-- ---------------------------------------------------------
-- Notes (article-level)
-- ---------------------------------------------------------
create table if not exists notes (
  id          uuid        default gen_random_uuid() primary key,
  article_id  uuid        not null references articles (id) on delete cascade,
  content     text        not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists notes_article_id_idx on notes (article_id);

-- ---------------------------------------------------------
-- AI Summaries (cached, one per article)
-- ---------------------------------------------------------
create table if not exists ai_summaries (
  id          uuid        default gen_random_uuid() primary key,
  article_id  uuid        not null references articles (id) on delete cascade unique,
  summary     text,
  key_points  text[]      default '{}',
  insights    text,
  model       text,
  created_at  timestamptz default now()
);

-- ---------------------------------------------------------
-- updated_at trigger (reusable function)
-- ---------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger articles_updated_at
  before update on articles
  for each row execute function set_updated_at();

create or replace trigger highlights_updated_at
  before update on highlights
  for each row execute function set_updated_at();

create or replace trigger notes_updated_at
  before update on notes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- Row Level Security (disabled for single-user app)
-- Enable and add policies if you add auth later
-- ---------------------------------------------------------
alter table articles    disable row level security;
alter table highlights  disable row level security;
alter table notes       disable row level security;
alter table ai_summaries disable row level security;
