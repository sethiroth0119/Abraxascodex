-- Community voting on cards: Best Card, Best Art, Best Balance.
-- Run this ONCE in your Supabase SQL Editor (Dashboard → SQL → New query → paste → Run).

create table if not exists card_votes (
  id         bigserial primary key,
  card_id    text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  category   text not null check (category in ('best_card', 'best_art', 'best_balance')),
  created_at timestamptz not null default now(),
  unique (card_id, user_id, category)
);

create index if not exists card_votes_card_idx     on card_votes(card_id);
create index if not exists card_votes_category_idx on card_votes(category);

alter table card_votes enable row level security;

-- Anyone logged in can read all votes (so counts are visible to everyone).
drop policy if exists "card_votes read" on card_votes;
create policy "card_votes read" on card_votes
  for select to authenticated using (true);

-- Logged-in users can cast their own vote.
drop policy if exists "card_votes insert" on card_votes;
create policy "card_votes insert" on card_votes
  for insert to authenticated with check (auth.uid() = user_id);

-- Logged-in users can revoke their own vote (toggle off).
drop policy if exists "card_votes delete" on card_votes;
create policy "card_votes delete" on card_votes
  for delete to authenticated using (auth.uid() = user_id);
