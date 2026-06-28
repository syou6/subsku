-- Burn — Supabase schema
-- Run in the Supabase SQL editor (or via `supabase db push`).
-- Two tables: profiles (billing plan) and burn_state (the user's app data blob).
-- Row Level Security ensures a user can only ever touch their own rows.

-- ----------------------------------------------------------------------------
-- profiles: one row per auth user, holds the Burn billing plan + Stripe linkage
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  plan                   text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id     text unique,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Plan changes happen only via the Stripe webhook (service role), so we expose
-- no client-side insert/update policy on purpose.

-- ----------------------------------------------------------------------------
-- burn_state: the persisted app data (subs, projects, fx rates, settings)
-- Stored as a single jsonb blob, mirroring the original artifact's data model.
-- ----------------------------------------------------------------------------
create table if not exists public.burn_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.burn_state enable row level security;

drop policy if exists "burn_state_select_own" on public.burn_state;
create policy "burn_state_select_own" on public.burn_state
  for select using (auth.uid() = user_id);

drop policy if exists "burn_state_insert_own" on public.burn_state;
create policy "burn_state_insert_own" on public.burn_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "burn_state_update_own" on public.burn_state;
create policy "burn_state_update_own" on public.burn_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists burn_state_touch on public.burn_state;
create trigger burn_state_touch before update on public.burn_state
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- On new auth user: seed a profile + empty state row
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.burn_state (user_id, data) values (new.id, '{}'::jsonb) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
