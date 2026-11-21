-- ============================================================================
-- BHW CONNECT — Supabase / PostgreSQL schema
-- Barangay Health Worker Records System (Brgy. Banlag)
-- ----------------------------------------------------------------------------
-- Mirrors the React app's data model 1:1 (households, residents, category
-- health records, monitoring + visits, activities, notifications, monthly
-- report values) so the localStorage store can be swapped for Supabase with
-- minimal mapping code.
--
-- Run order (Supabase SQL Editor or `supabase db push`):
--   1. this file — enums, tables, triggers, RLS policies, seed
--
-- Auth model:
--   • Sign-in uses Supabase Auth (auth.users, email + password).
--   • Each auth user gets a row in public.profiles (trigger below) holding
--     the app fields: username, full_name, role, barangay, purok, contact.
--   • Roles: bhw (Barangay Health Worker), rhm (Rural Health Midwife),
--     admin (System Administrator).
--
-- Access model (RLS): every signed-in user can READ all barangay data (this
-- matches the demo app, where any account sees all records), while writes are
-- unrestricted insert/update for authenticated users and delete limited to
-- rhm/admin. Stricter purok-scoped variants are included at the bottom,
-- commented out, if you want BHWs limited to their own purok later.
-- ============================================================================

-- ============ extensions ============
create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ============ enums ============
create type app_role    as enum ('bhw', 'rhm', 'admin');
create type record_cat  as enum ('Child Health', 'Maternal Health', 'Immunization', 'Family Planning', 'Other Health Records');
create type mon_status  as enum ('On Track', 'Due Soon', 'Overdue', 'Completed');
create type health_stat as enum ('Active', 'Under Observation', 'Referred', 'Follow-up Required', 'Resolved', 'Completed');
create type report_sheet as enum ('vitA', 'vac', 'tb', 'fp');

-- ============ helper: updated_at maintenance ============
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================================
-- TABLE: profiles — one row per signed-in account (linked to Supabase Auth)
-- ============================================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique,                     -- e.g. 'bhw.banlag'
  full_name    text not null,                            -- e.g. 'Juan D. Dela Cruz'
  role         app_role not null default 'bhw',
  barangay     text not null default 'Brgy. Banlag',
  purok        text not null default 'All Puroks',       -- 'Purok 1'..'Purok 6' for BHWs
  contact      text,
  email        text,
  status       text not null default 'Active' check (status in ('Active','Inactive','Suspended')),
  bhw_name     text,                                     -- short name in monthly reports, e.g. 'Anlingcao A.'
  date_created date not null default current_date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Auto-create a profile whenever a user signs up through Supabase Auth.
-- Pass full_name / username / role / purok / bhw_name in the signup metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name, role, barangay, purok, contact, email, bhw_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', new.email),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'bhw'),
    coalesce(new.raw_user_meta_data->>'barangay', 'Brgy. Banlag'),
    coalesce(new.raw_user_meta_data->>'purok', 'All Puroks'),
    new.raw_user_meta_data->>'contact',
    new.email,
    new.raw_user_meta_data->>'bhw_name'
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ RLS helper (security definer avoids recursion on profiles) ===
create or replace function public.my_profile()
returns public.profiles language sql stable security definer set search_path = public as $$
  select * from public.profiles where id = auth.uid()
$$;
create or replace function public.my_role()
returns app_role language sql stable security definer set search_path = public as $$
  select coalesce(public.my_profile().role, 'bhw'::app_role)
$$;

-- ============================================================================
-- TABLE: households
-- ============================================================================
create sequence public.household_id_seq start 100;   -- IDs are 4-digit padded (HH-0024 style), matching the app's padId()

create table public.households (
  id         text primary key,                       -- 'HH-001' (trigger-assigned)
  head_first text not null,
  head_last  text not null,
  head       text not null,                          -- denormalized full name
  house_num  text not null,                           -- 'BLK 12 LT 30'
  street     text not null,
  barangay   text not null default 'Brgy. Banlag',
  purok      text not null check (purok in ('Purok 1','Purok 2','Purok 3','Purok 4','Purok 5','Purok 6')),
  contact    text,
  date_reg   date not null default current_date,
  members    int  not null default 0 check (members >= 0),   -- maintained by trigger
  remarks    text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_households_touch before update on public.households
  for each row execute function public.touch_updated_at();

-- Assign 'HH-###' when the client inserts without an id.
create or replace function public.assign_household_id()
returns trigger language plpgsql as $$
begin
  if new.id is null or new.id = '' then
    new.id := 'HH-' || lpad(nextval('public.household_id_seq')::text, 4, '0');
  end if;
  return new;
end $$;
create trigger trg_households_id before insert on public.households
  for each row execute function public.assign_household_id();

create index idx_households_purok    on public.households(purok);
create index idx_households_head     on public.households(head);

-- ============================================================================
-- TABLE: residents
-- ============================================================================
create sequence public.resident_id_seq start 100;      -- sequence starts chosen clear of seeded rows

create table public.residents (
  id            text primary key,                    -- 'RES-001' (trigger-assigned)
  household_id  text not null references public.households(id) on delete cascade,
  name          text not null,
  birthdate     date not null check (birthdate <= current_date),
  sex           text not null check (sex in ('Male','Female')),
  relation      text not null check (relation in
                 ('Household Head','Spouse','Son','Daughter','Parent','Grandparent','Grandchild','Relative','Other')),
  civil_status  text check (civil_status in ('Single','Married','Widowed','Separated','Other')),
  occupation    text,
  contact       text,
  remarks       text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_residents_touch before update on public.residents
  for each row execute function public.touch_updated_at();

create or replace function public.assign_resident_id()
returns trigger language plpgsql as $$
begin
  if new.id is null or new.id = '' then
    new.id := 'RES-' || lpad(nextval('public.resident_id_seq')::text, 4, '0');
  end if;
  return new;
end $$;
create trigger trg_residents_id before insert on public.residents
  for each row execute function public.assign_resident_id();

create index idx_residents_hh     on public.residents(household_id);
create index idx_residents_name   on public.residents(name);

-- Keep households.members = count of residents.
create or replace function public.sync_household_members()
returns trigger language plpgsql as $$
declare
  hh text;
begin
  hh := coalesce(new.household_id, old.household_id);
  update public.households h
     set members = (select count(*) from public.residents r where r.household_id = hh),
         updated_at = now()
   where h.id = hh;
  return coalesce(new, old);
end $$;
create trigger trg_residents_members_ins after insert on public.residents
  for each row execute function public.sync_household_members();
create trigger trg_residents_members_del after delete on public.residents
  for each row execute function public.sync_household_members();

-- ============================================================================
-- TABLE: health_records — one row per category record (CHR/MHR/IMR/FPR/OHR)
-- All category-specific fields live in dedicated nullable columns, exactly
-- like the React store's record objects (missing fields = NULL).
-- ============================================================================
create sequence public.record_id_seq start 1000;      -- sequence starts chosen clear of seeded rows

create table public.health_records (
  id          text primary key,                       -- 'CHR-001' (client- or trigger-assigned)
  cat         record_cat not null,
  resident_id text not null references public.residents(id) on delete cascade,
  household_id text not null references public.households(id) on delete cascade,
  status      health_stat not null default 'Active',

  -- shared
  remarks        text,
  date_recorded  date not null default current_date,

  -- Child Health (CHR)
  weight_kg      numeric(4,1),
  height_cm      numeric(4,1),
  measure_date   date,
  growth         text check (growth in ('Normal','Underweight','Stunted','Wasted','Overweight','Obese')),
  vita           text check (vita in ('Given (full dose)','Not given','Due this month','Scheduled')),
  deworm         text check (deworm in ('Given','Not given','Due this month','Scheduled')),
  feeding        text,
  next_mon       date,

  -- Maternal Health (MHR)
  preg_status    text check (preg_status in ('Pregnant (Newly Registered)','Pregnant (Follow-up)','Post-partum','With Family Planning','Other')),
  reg_date       date,
  edd            date,
  preg_info      text,
  prenatal_date  date,
  prenatal_details text,
  bp             text,
  follow_up      date,
  maternal_status text,

  -- Immunization (IMR)
  vaccine        text check (vaccine in ('BCG','Hepatitis B','Pentavalent (DPT-HepB-Hib)','OPV (Polio)','IPV','Measles-Mumps-Rubella','PCV','Rotavirus','Influenza','Typhoid')),
  vac_cat        text check (vac_cat in ('BCG','HepB','DPT','Polio','MR/MCV','PCV','Other')),
  dose           int check (dose between 1 and 3),
  date_admin     date,
  administered_by text,
  next_sched     date,
  imm_status     text check (imm_status in ('Scheduled','Completed','Pending','Missed Schedule')),

  -- Family Planning (FPR)
  method         text check (method in ('BTL','Vasectomy','Pill (COC)','Pill (POP)','Injectables (DMPA)','LAM','IUD','Implanon','Condom','Standard Days Method (SDM)')),
  method_start   date,
  last_visit     date,
  fp_status      text check (fp_status in ('New Acceptor','Current User','Drop-out','Follow-up')),
  visit_info     text,
  nhts           boolean not null default false,

  -- Other Health Records (OHR)
  other_cat      text check (other_cat in ('Chronic Disease','Injury','Nutrition','Infectious Disease','General Consultation')),
  condition      text,
  info           text,

  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_health_records_touch before update on public.health_records
  for each row execute function public.touch_updated_at();

create or replace function public.assign_record_id()
returns trigger language plpgsql as $$
declare
  prefix text;
begin
  if new.id is null or new.id = '' then
    prefix := case new.cat
                when 'Child Health'          then 'CHR'
                when 'Maternal Health'       then 'MHR'
                when 'Immunization'         then 'IMR'
                when 'Family Planning'       then 'FPR'
                else 'OHR'
              end;
    new.id := prefix || '-' || lpad(nextval('public.record_id_seq')::text, 4, '0');
  end if;
  return new;
end $$;
create trigger trg_health_records_id before insert on public.health_records
  for each row execute function public.assign_record_id();

create index idx_records_resident on public.health_records(resident_id);
create index idx_records_cat      on public.health_records(cat);
create index idx_records_hh        on public.health_records(household_id);
create index idx_records_status    on public.health_records(status);

-- ============================================================================
-- TABLE: monitoring + visits
-- ============================================================================
create sequence public.monitoring_id_seq start 100;

create table public.monitoring (
  id           text primary key,                     -- 'MON-001' (trigger-assigned)
  resident_id  text not null references public.residents(id) on delete cascade,
  household_id text not null references public.households(id) on delete cascade,
  record_id    text references public.health_records(id) on delete set null,
  type         text not null check (type in
                 ('Maternal Health','Child Growth','Immunization','General Health Follow-up','Family Planning Follow-up','Other')),
  date_start   date not null default current_date,
  last_visit   date,
  next_sched   date not null,
  status       mon_status not null default 'On Track',
  health_update text,
  notes        text,
  remarks      text,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_monitoring_touch before update on public.monitoring
  for each row execute function public.touch_updated_at();

create or replace function public.assign_monitoring_id()
returns trigger language plpgsql as $$
begin
  if new.id is null or new.id = '' then
    new.id := 'MON-' || lpad(nextval('public.monitoring_id_seq')::text, 4, '0');
  end if;
  return new;
end $$;
create trigger trg_monitoring_id before insert on public.monitoring
  for each row execute function public.assign_monitoring_id();

create index idx_mon_resident on public.monitoring(resident_id);
create index idx_mon_status   on public.monitoring(status);
create index idx_mon_next     on public.monitoring(next_sched);

create table public.visits (
  id            uuid primary key default gen_random_uuid(),
  monitoring_id text not null references public.monitoring(id) on delete cascade,
  date          date not null default current_date,
  type          text not null default 'Follow-up' check (type in ('Scheduled','Follow-up')),
  update        text,
  notes         text,
  follow_up_needed boolean not null default false,
  next_sched    date,
  status        mon_status,
  recorded_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);
create index idx_visits_mon on public.visits(monitoring_id);

-- ============================================================================
-- TABLE: activities (recent actions feed)
-- ============================================================================
create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('household','member','record','monitoring','visit','account')),
  desc        text not null,
  res_name    text,
  profile_id  uuid references public.profiles(id) on delete set null,
  date        date not null default current_date,
  time        time not null default current_time,
  created_at  timestamptz not null default now()
);
create index idx_activities_date on public.activities(created_at desc);

-- ============================================================================
-- TABLE: notifications
-- ============================================================================
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles(id) on delete cascade,  -- null = broadcast to all
  icon        text not null default 'info',     -- matches Icon.jsx names: cal|warn|info|sheet
  title       text not null,
  desc        text,
  date        date not null default current_date,
  time        time not null default current_time,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index idx_notifs_profile on public.notifications(profile_id, read);

-- ============================================================================
-- TABLE: report_values — BHW Monthly Report (4 worksheets × 12 months × BHWs)
-- Key mirrors the app: (sheet, month, row_key, bhw_name, nhts)
-- ============================================================================
create table public.report_values (
  id          uuid primary key default gen_random_uuid(),
  sheet       report_sheet not null,
  month       int not null check (month between 1 and 12),
  bhw_name    text not null,                -- short BHW name e.g. 'Anlingcao A.'
  row_key     text not null,                -- e.g. 'vitA_6_11_given' / 'fp_pill_coc'
  nhts        boolean not null default false,
  value       int not null default 0 check (value >= 0),
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now(),
  unique (sheet, month, bhw_name, row_key, nhts)
);
create index idx_report_lookup on public.report_values(sheet, month);

-- Report header settings (BHS name, RHM name) — singleton-ish kv table.
create table public.report_settings (
  key   text primary key,       -- 'bhs_name' | 'rhm_name'
  value text not null,
  updated_at timestamptz not null default now()
);
insert into public.report_settings(key, value) values
  ('bhs_name', 'BHS: BANLAG'),
  ('rhm_name', 'SHEILA MAE I. UY, RM');

-- Re-add the convenience view (age in years/months computed server-side).
create or replace view public.residents_with_age as
select r.*,
       date_part('year', age(r.birthdate))::int as age_years,
       date_part('month', age(r.birthdate))::int as age_months
  from public.residents r;

-- ============================================================================
-- ROW LEVEL SECURITY
-- Base model: every authenticated user may READ all barangay data and
-- INSERT/UPDATE it; DELETE is limited to rhm/admin. (Matches the demo app.)
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.households     enable row level security;
alter table public.residents      enable row level security;
alter table public.health_records enable row level security;
alter table public.monitoring     enable row level security;
alter table public.visits         enable row level security;
alter table public.activities    enable row level security;
alter table public.notifications enable row level security;
alter table public.report_values enable row level security;
alter table public.report_settings enable row level security;

-- ---- profiles: read all, edit only your own (admin edits anyone) ----
create policy "profiles: read all" on public.profiles
  for select to authenticated using (true);
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin update any" on public.profiles
  for update to authenticated using (public.my_role() = 'admin') with check (true);
create policy "profiles: admin insert" on public.profiles
  for insert to authenticated with check (public.my_role() = 'admin');
create policy "profiles: delete self none" on public.profiles
  for delete to authenticated using (public.my_role() = 'admin');

-- ---- barangay data: open read + open insert/update, delete gated ----
create policy "households: read" on public.households for select to authenticated using (true);
create policy "households: insert" on public.households for insert to authenticated with check (true);
create policy "households: update" on public.households for update to authenticated using (true) with check (true);
create policy "households: delete" on public.households for delete to authenticated using (public.my_role() in ('rhm','admin'));

create policy "residents: read" on public.residents for select to authenticated using (true);
create policy "residents: insert" on public.residents for insert to authenticated with check (true);
create policy "residents: update" on public.residents for update to authenticated using (true) with check (true);
create policy "residents: delete" on public.residents for delete to authenticated using (public.my_role() in ('rhm','admin'));

create policy "records: read" on public.health_records for select to authenticated using (true);
create policy "records: insert" on public.health_records for insert to authenticated with check (true);
create policy "records: update" on public.health_records for update to authenticated using (true) with check (true);
create policy "records: delete" on public.health_records for delete to authenticated using (public.my_role() in ('rhm','admin'));

create policy "monitoring: read" on public.monitoring for select to authenticated using (true);
create policy "monitoring: insert" on public.monitoring for insert to authenticated with check (true);
create policy "monitoring: update" on public.monitoring for update to authenticated using (true) with check (true);
create policy "monitoring: delete" on public.monitoring for delete to authenticated using (public.my_role() in ('rhm','admin'));

create policy "visits: read" on public.visits for select to authenticated using (true);
create policy "visits: insert" on public.visits for insert to authenticated with check (true);
create policy "visits: update" on public.visits for update to authenticated using (true) with check (true);
create policy "visits: delete" on public.visits for delete to authenticated using (public.my_role() in ('rhm','admin'));

create policy "activities: read" on public.activities for select to authenticated using (true);
create policy "activities: insert" on public.activities for insert to authenticated with check (true);

create policy "notifications: read own/broadcast" on public.notifications for select to authenticated
  using (profile_id is null or profile_id = auth.uid());
create policy "notifications: insert" on public.notifications for insert to authenticated with check (true);
create policy "notifications: update own/broadcast" on public.notifications for update to authenticated
  using (profile_id is null or profile_id = auth.uid()) with check (true);

create policy "report_values: read" on public.report_values for select to authenticated using (true);
create policy "report_values: insert" on public.report_values for insert to authenticated with check (true);
create policy "report_values: update" on public.report_values for update to authenticated using (true) with check (true);

create policy "report_settings: read" on public.report_settings for select to authenticated using (true);
create policy "report_settings: update" on public.report_settings for update to authenticated using (true) with check (true);

-- ----------------------------------------------------------------------------
-- OPTIONAL STRICTER MODEL — purok-scoped BHW access (swap in if wanted):
--   BHWs only see/edit households & residents in their own purok; RHM/admin
--   see everything. Replace the "using (true)" read/insert/update policies
--   above with these, then uncomment:
--
-- create or replace function public.my_purok() returns text
--   language sql stable security definer set search_path = public as $$
--   select coalesce(public.my_profile().purok, 'All Puroks')
-- $$;
--
-- create policy "households: read purok" on public.households for select to authenticated
--   using (public.my_role() in ('rhm','admin') or public.my_purok() = 'All Puroks' or purok = public.my_purok());
-- ... (repeat the same using(...) pattern for residents, health_records,
--      monitoring, visits — they all join through household_id.)
-- ----------------------------------------------------------------------------

-- ============================================================================
-- SEED DATA — the 8 demo accounts (create auth users first, then these rows
-- materialize automatically via the trigger; or insert rows directly if you
-- seed without auth — see the wiring guide for the recommended flow).
-- ============================================================================
-- Demo usernames:  bhw.banlag / bhw.anlingcao / bhw.belarma / bhw.delco /
--                  bhw.icari / bhw.macote / rhm.uy / admin.banlag
-- (passwords are set in Supabase Auth — see supabase/SEEDING.md)

-- ============================================================================
-- Supabase client settings (Storage/auth config done in Dashboard):
--   • Auth → Email provider: ON (disable confirm-email for demo)
--   • Project API settings: expose schema 'public'
-- ============================================================================
-- END OF SCHEMA
