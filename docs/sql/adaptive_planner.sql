-- Adaptive Planner schema + RLS
-- Safe to run in Supabase SQL Editor.

begin;

-- 1) Required extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- 2) Timestamp trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3) Parent table: course_plans
create table if not exists public.course_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'New Course Plan',
  status text not null default 'planning',
  recommended_format text not null default 'single_video',
  planner_input jsonb not null default '{}'::jsonb,
  planner_output jsonb not null default '{}'::jsonb,
  shared_context jsonb not null default '{}'::jsonb,
  progress_percent integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_plans_status_check
    check (status in ('planning', 'ready', 'in_progress', 'completed', 'failed')),
  constraint course_plans_recommended_format_check
    check (recommended_format in ('single_video', 'multi_video_course')),
  constraint course_plans_progress_check
    check (progress_percent >= 0 and progress_percent <= 100)
);

create index if not exists idx_course_plans_user_created
  on public.course_plans (user_id, created_at desc);
create index if not exists idx_course_plans_user_status
  on public.course_plans (user_id, status);

drop trigger if exists trg_course_plans_updated_at on public.course_plans;
create trigger trg_course_plans_updated_at
before update on public.course_plans
for each row
execute function public.set_updated_at();

-- 4) Child table: course_modules
create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_plan_id uuid not null references public.course_plans(id) on delete cascade,
  order_index integer not null,
  title text not null,
  status text not null default 'not_started',
  objective_focus jsonb not null default '[]'::jsonb,
  estimated_minutes integer not null default 5,
  source_course_id uuid null references public.courses(id) on delete set null,
  result_video_url text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_modules_status_check
    check (status in ('not_started', 'in_progress', 'review', 'published', 'failed')),
  constraint course_modules_estimated_minutes_check
    check (estimated_minutes > 0 and estimated_minutes <= 240),
  constraint course_modules_order_index_check
    check (order_index > 0),
  constraint course_modules_unique_order
    unique (course_plan_id, order_index)
);

create index if not exists idx_course_modules_plan_order
  on public.course_modules (course_plan_id, order_index);
create index if not exists idx_course_modules_source_course
  on public.course_modules (source_course_id);
create index if not exists idx_course_modules_status
  on public.course_modules (status);

drop trigger if exists trg_course_modules_updated_at on public.course_modules;
create trigger trg_course_modules_updated_at
before update on public.course_modules
for each row
execute function public.set_updated_at();

-- 5) Integrity: ensure source_course_id (if set) belongs to same user as the parent plan
create or replace function public.enforce_course_module_source_ownership()
returns trigger
language plpgsql
as $$
declare
  plan_owner uuid;
  source_owner uuid;
begin
  if new.source_course_id is null then
    return new;
  end if;

  select cp.user_id
    into plan_owner
  from public.course_plans cp
  where cp.id = new.course_plan_id;

  select c.user_id
    into source_owner
  from public.courses c
  where c.id = new.source_course_id;

  if source_owner is null then
    raise exception 'source_course_id % does not exist', new.source_course_id;
  end if;

  if plan_owner is distinct from source_owner then
    raise exception 'source_course_id must belong to the same user as course_plan';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_course_modules_source_ownership on public.course_modules;
create trigger trg_course_modules_source_ownership
before insert or update on public.course_modules
for each row
execute function public.enforce_course_module_source_ownership();

-- 6) RLS
alter table public.course_plans enable row level security;
alter table public.course_modules enable row level security;

-- Optional hardening (recommended in production):
-- alter table public.course_plans force row level security;
-- alter table public.course_modules force row level security;

-- course_plans policies
drop policy if exists "course_plans_select_own" on public.course_plans;
create policy "course_plans_select_own"
on public.course_plans
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "course_plans_insert_own" on public.course_plans;
create policy "course_plans_insert_own"
on public.course_plans
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "course_plans_update_own" on public.course_plans;
create policy "course_plans_update_own"
on public.course_plans
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "course_plans_delete_own" on public.course_plans;
create policy "course_plans_delete_own"
on public.course_plans
for delete
to authenticated
using (auth.uid() = user_id);

-- course_modules policies (via parent ownership)
drop policy if exists "course_modules_select_own" on public.course_modules;
create policy "course_modules_select_own"
on public.course_modules
for select
to authenticated
using (
  exists (
    select 1
    from public.course_plans cp
    where cp.id = course_modules.course_plan_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "course_modules_insert_own" on public.course_modules;
create policy "course_modules_insert_own"
on public.course_modules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.course_plans cp
    where cp.id = course_modules.course_plan_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "course_modules_update_own" on public.course_modules;
create policy "course_modules_update_own"
on public.course_modules
for update
to authenticated
using (
  exists (
    select 1
    from public.course_plans cp
    where cp.id = course_modules.course_plan_id
      and cp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.course_plans cp
    where cp.id = course_modules.course_plan_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists "course_modules_delete_own" on public.course_modules;
create policy "course_modules_delete_own"
on public.course_modules
for delete
to authenticated
using (
  exists (
    select 1
    from public.course_plans cp
    where cp.id = course_modules.course_plan_id
      and cp.user_id = auth.uid()
  )
);

-- 7) Explicit grants for authenticated clients (RLS still applies)
grant select, insert, update, delete on public.course_plans to authenticated;
grant select, insert, update, delete on public.course_modules to authenticated;

commit;
