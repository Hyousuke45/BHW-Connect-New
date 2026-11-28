-- ============================================================================
-- BHW Connect — Supabase schema
-- Generated for the BHW Connect app (Brgy. Banlag health records system).
-- Model maps 1:1 to the app's working data model (see src/seed.js):
--   users -> profiles (linked to Supabase auth.users)
--   households -> residents -> health_records -> monitoring -> visits
--   activities, notifications, id counters, monthly report values
-- Run this whole file in the Supabase SQL editor (or psql) on a fresh project.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 0. Enums & helper types
-- --------------------------------------------------------------------------
-- On a hosted Supabase project the auth schema already exists. For local
-- plain-Postgres testing, create a minimal stand-in (harmless no-op on
-- Supabase because the real one exists and create schema if not exists is a
-- no-op there).
create schema if not exists auth;
-- local-test stand-in for auth.users; skipped when it already exists (Supabase)
do $do$ begin
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = 'auth' and c.relname = 'users') then
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create or replace function auth.uid() returns uuid language sql stable
      as $fn$ select nullif(btrim(current_setting('bhw.uid', true)), '')::uuid $fn$;
  end if;
end $do$;

create type user_role as enum ('bhw', 'rhm', 'admin');

create type purok_t as enum ('Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6', 'All Puroks');

create type record_category as enum ('Child Health', 'Maternal Health', 'Immunization', 'Family Planning', 'Other Health Records');

create type mon_type as enum ('Maternal Health', 'Child Growth', 'Immunization', 'General Health Follow-up', 'Family Planning Follow-up', 'Other');

create type mon_status as enum ('On Track', 'Due Soon', 'Overdue', 'Completed');

create type health_status as enum ('Active', 'Under Observation', 'Referred', 'Follow-up Required', 'Resolved', 'Completed', 'Scheduled', 'Pending', 'Missed Schedule');

-- --------------------------------------------------------------------------
-- 1. Profiles (app users = BHW / RHM / Admin), joined 1:1 to auth.users
--    Mirrors db.users in seed.js (fullName, role, barangay, purok, contact,
--    email, status, dateCreated).
-- --------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text unique not null,           -- e.g. 'bhw.banlag'
  full_name     text not null,                   -- e.g. 'Juan D. Dela Cruz'
  role          user_role not null default 'bhw',
  barangay      text not null default 'Brgy. Banlag',
  purok         purok_t not null default 'All Puroks',
  contact       text,
  email         text,
  status        text not null default 'Active' check (status in ('Active', 'Inactive', 'Suspended')),
  date_created  date not null default current_date,
  created_at    timestamptz not null default now()
);

comment on table public.profiles is 'App accounts; one row per Supabase auth user. Role drives RLS.';

-- Current user's profile row, exposed to RLS policies
create or replace function public.my_profile()
returns public.profiles
language sql stable security definer set search_path = public
as $$ select * from public.profiles where id = auth.uid() $$;

create or replace function public.my_role()
returns user_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.my_purok()
returns purok_t
language sql stable security definer set search_path = public
as $$ select purok from public.profiles where id = auth.uid() $$;

-- Helpers used by policies: can the current user see rows of this purok?
create or replace function public.can_access_purok(row_purok purok_t)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case public.my_role()
    when 'admin' then true
    when 'rhm'   then true                                   -- RHM covers all puroks
    else (public.my_purok() = row_purok)                      -- BHW: own purok only
  end
$$;

-- Auto-create a profile when an auth user signs up (via database webhook or trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, email, role, contact)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', new.email),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'bhw'),
    new.raw_user_meta_data->>'contact'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Note: enable the webhook trigger on a hosted Supabase project:
-- create trigger on_auth_user_created after insert on auth.users
--   for each row execute function public.handle_new_user();

-- --------------------------------------------------------------------------
-- 2. Households (db.households)
-- --------------------------------------------------------------------------
create table public.households (
  id           text primary key,               -- 'HH-0001' app-visible id
  head         text not null,                  -- household head full name
  house_num    text,                           -- e.g. 'BLK 4 LT 12'
  street       text,
  barangay     text not null default 'Brgy. Banlag',
  purok        purok_t not null,
  contact      text,
  date_reg     date not null default current_date,
  remarks      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on public.households (purok);
create index on public.households (head);

-- --------------------------------------------------------------------------
-- 3. Residents (db.residents)
-- --------------------------------------------------------------------------
create table public.residents (
  id           text primary key,               -- 'RES-0001'
  hh_id        text not null references public.households (id) on delete cascade,
  name         text not null,
  birthdate    date not null,
  sex          text not null check (sex in ('Male', 'Female')),
  relation     text not null default 'Other', -- Household Head / Spouse / Son / ...
  civil        text not null default 'Single', -- Single / Married / Widowed / Separated / Other
  occupation   text,
  contact      text,
  remarks      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on public.residents (hh_id);
create index on public.residents (name);

-- Number of members is derived, not stored (matches app: hhMembers())

-- --------------------------------------------------------------------------
-- 4. Health records (db.records) — one table, category-typed columns
--    The app's five record shapes share resident + status + remarks columns;
--    category-specific columns are null for other categories.
--    res_name/age/sex are denormalized in the app for display; here they are
--    generated (stored) columns from residents for parity with list views.
-- --------------------------------------------------------------------------
create table public.health_records (
  id             text primary key,             -- 'CHR-0001' / 'MHR-0001' / 'IMR-0001' / 'FPR-0001' / 'OHR-0001'
  cat            record_category not null,
  res_id         text not null references public.residents (id) on delete cascade,
  res_name       text not null,                -- denormalized for list views; filled by trigger
  hh_id          text not null,
  age            int not null,
  sex            text not null,
  status         health_status,
  follow_up      date,
  remarks        text,
  date_recorded  date not null default current_date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Child Health
  weight         numeric(5,1),
  height         numeric(5,1),
  measure_date   date,
  growth         text check (growth is null or growth in ('Normal','Underweight','Stunted','Wasted','Overweight','Obese')),
  vita           text,
  deworm         text,
  feeding        text,
  next_mon       date,
  notes          text,
  -- Maternal Health
  preg_status    text,
  reg_date       date,
  edd            date,
  preg_info      text,
  prenatal_date  date,
  prenatal_details text,
  bp             text,
  maternal_status text,
  -- Immunization
  vaccine        text,
  vac_cat        text,
  dose           int,
  date_admin     date,
  administered_by text,
  next_sched     date,
  imm_status     text,
  -- Family Planning
  method         text,
  method_start   date,
  last_visit     date,
  fp_status      text,
  nhts           boolean,
  visit_info     text,
  -- Other Health Records
  other_cat      text,
  condition      text,
  info           text,
  -- keep the full original JSON record for audit / future migration
  source         jsonb
);

create index on public.health_records (res_id);
create index on public.health_records (cat);
create index on public.health_records (hh_id);

create or replace function public.fill_record_denorm()
returns trigger
language plpgsql
as $$
declare r record;
begin
  select name, hh_id, birthdate, sex into r
    from public.residents where id = new.res_id;
  new.res_name := r.name;
  new.hh_id := r.hh_id;
  new.age := date_part('year', age(r.birthdate))::int;
  new.sex := r.sex;
  return new;
end;
$$;

create trigger trg_fill_record_denorm
before insert or update of res_id on public.health_records
for each row execute function public.fill_record_denorm();

-- --------------------------------------------------------------------------
-- 5. Monitoring schedules (db.monitoring)
-- --------------------------------------------------------------------------
create table public.monitoring (
  id            text primary key,              -- 'MON-0001'
  res_id        text not null references public.residents (id) on delete cascade,
  res_name      text not null,
  hh_id         text not null,
  type          mon_type not null,
  date_start    date not null default current_date,
  last_visit    date,
  next_sched    date not null,
  status        mon_status not null default 'On Track',
  health_update text,
  notes         text,
  remarks       text,
  rec_id        text,                          -- optional link to source health_records.id
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index on public.monitoring (res_id);
create index on public.monitoring (next_sched);
create index on public.monitoring (status);

-- keep res_name/hh_id consistent with residents
create or replace function public.fill_monitoring_denorm()
returns trigger
language plpgsql
as $$
declare r record;
begin
  select name, hh_id into r from public.residents where id = new.res_id;
  new.res_name := r.name;
  new.hh_id := r.hh_id;
  return new;
end;
$$;

create trigger trg_fill_monitoring_denorm
before insert or update of res_id on public.monitoring
for each row execute function public.fill_monitoring_denorm();

-- --------------------------------------------------------------------------
-- 6. Monitoring visits (db.visits)
-- --------------------------------------------------------------------------
create table public.visits (
  id             uuid primary key default gen_random_uuid(),
  mon_id         text not null references public.monitoring (id) on delete cascade,
  date           date not null default current_date,
  type           text not null default 'Scheduled' check (type in ('Scheduled', 'Follow-up', 'Other')),
  update_text    text not null,               -- app field 'update': health update text
  notes          text,
  follow_up_needed boolean not null default false,
  next_sched     date,
  status         mon_status not null default 'On Track',
  remarks        text,
  created_at     timestamptz not null default now()
);

create index on public.visits (mon_id);
create index on public.visits (date);

-- --------------------------------------------------------------------------
-- 7. Activity feed (db.activities)
-- --------------------------------------------------------------------------
create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('household','member','record','monitoring','visit')),
  description text not null,                 -- app field 'desc': e.g. 'Household Added — newly registered'
  res_name    text,                            -- linked resident, if any
  actor_id    uuid references public.profiles (id),
  date        date not null default current_date,
  time        time not null default localtime,
  created_at  timestamptz not null default now()
);

create index on public.activities (date desc);

-- --------------------------------------------------------------------------
-- 8. Notifications (db.notifs)
-- --------------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  icon        text not null default 'info',    -- 'cal' | 'warn' | 'info' | 'sheet'
  title       text not null,
  description text,
  date        date not null default current_date,
  time        time not null default localtime,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index on public.notifications (user_id, read);

-- --------------------------------------------------------------------------
-- 9. ID counters (db.counters) — per entity sequence so 'HH-0007' stays unique
-- --------------------------------------------------------------------------
create table public.id_counters (
  entity    text primary key check (entity in ('hh','res','rec','mon','vis')),
  value     int not null default 1
);

insert into public.id_counters (entity, value) values ('hh',1), ('res',1), ('rec',1), ('mon',1), ('vis',1);

-- Atomic next-id allocation (returns e.g. 'HH-0007')
create or replace function public.next_id(p_entity text, p_prefix text)
returns text
language plpgsql
as $$
declare v int;
begin
  update public.id_counters set value = value + 1 where entity = p_entity returning value into v;
  return p_prefix || lpad(v::text, 4, '0');
end;
$$;

-- --------------------------------------------------------------------------
-- 10. Monthly report values (db.report[month][sheet][key])
--     One row per (bhw, month, sheet, metric key). value + nhts (family
--     planning sheet has a parallel NHTS counter per key).
-- --------------------------------------------------------------------------
create table public.report_values (
  id          uuid primary key default gen_random_uuid(),
  bhw_id      uuid not null references public.profiles (id) on delete cascade,
  month       text not null check (month in ('January','February','March','April','May','June','July','August','September','October','November','December')),
  sheet       text not null check (sheet in ('vitA','nip','tb','fp')),
  metric_key  text not null,                   -- e.g. 'vitA_6_11_given', 'del_10_14_male', 'fp_BTL'
  value       int not null default 0,
  nhts        int,                             -- fp sheet only: NHTS members
  updated_at  timestamptz not null default now(),
  unique (bhw_id, month, sheet, metric_key)
);

create index on public.report_values (bhw_id, month);

-- Static list of all reportable metric keys (from REP_SHEETS in constants.js)
create table public.report_metrics (
  sheet       text not null check (sheet in ('vitA','nip','tb','fp')),
  metric_key  text primary key,
  label       text not null
);

insert into public.report_metrics (sheet, metric_key, label) values
  -- VITAMIN A & DEWORMING
  ('vitA','vitA_6_11_given','Children 6-11 months old given Vit. A'),
  ('vitA','vitA_6_11_not','Children 6-11 months old not given Vit. A'),
  ('vitA','vitA_12_59_given','Children 12-59 months old given Vit. A'),
  ('vitA','vitA_12_59_not','Children 12-59 months old not given Vit. A'),
  ('vitA','dw_12_23','Children 12-23 months old given deworming'),
  ('vitA','dw_24_59','Children 24-59 months old given deworming'),
  ('vitA','fp_menopausal','Menopausal MWRA (15-49) had Hysterectomy'),
  ('vitA','fp_pregnant_new','Pregnant Women (Newly Registered)'),
  ('vitA','fp_not_interested','MWRA NOT using and NOT interested in FP'),
  -- VACCINATION, NUTRITION & DELIVERIES
  ('nip','nip_vac_0_11','Vaccination status of children 0-11 months old'),
  ('nip','nip_fic_12','Children 12 months old fully immunized (FIC)'),
  ('nip','nip_incomplete_13_23','Children 13-23 months old with incomplete immunization'),
  ('nip','nip_newborns','Number of Newborns (0-28 days)'),
  ('nip','nip_infants','Number of Infants (29 days to 11 months)'),
  ('nip','nip_underfive','Number of Underfive children (1-4 years old)'),
  ('nip','nip_schoolage','Number of School Age Children (5-9 years old)'),
  ('nip','nip_adolescents','Number of Adolescents (10-19 years old)'),
  ('nip','nip_postpartum','Post Partum Women (birth in last 6 months)'),
  ('nip','nip_pp_iron','PP given complete IRON'),
  ('nip','nip_pp_vita','PP given VITAMIN A'),
  ('nip','nip_deliveries','Number of Deliveries'),
  ('nip','del_10_14_male','Deliveries 10-14 Male'),
  ('nip','del_10_14_female','Deliveries 10-14 Female'),
  ('nip','del_10_14_gov','Deliveries 10-14 Gov''t Hos'),
  ('nip','del_10_14_pvt','Deliveries 10-14 PVT Hos'),
  ('nip','del_10_14_lying','Deliveries 10-14 Lying-in'),
  ('nip','del_15_19_male','Deliveries 15-19 Male'),
  ('nip','del_15_19_female','Deliveries 15-19 Female'),
  ('nip','del_15_19_gov','Deliveries 15-19 Gov''t Hos'),
  ('nip','del_15_19_pvt','Deliveries 15-19 PVT Hos'),
  ('nip','del_15_19_lying','Deliveries 15-19 Lying-in'),
  ('nip','del_20_49_male','Deliveries 20-49 Male'),
  ('nip','del_20_49_female','Deliveries 20-49 Female'),
  ('nip','del_20_49_gov','Deliveries 20-49 Gov''t Hos'),
  ('nip','del_20_49_pvt','Deliveries 20-49 PVT Hos'),
  ('nip','del_20_49_lying','Deliveries 20-49 Lying-in'),
  -- TB SURVEILLANCE
  ('tb','tb_no_consult','Persons with TB symptoms who did NOT seek consultation'),
  ('tb','tb_private','Sought consultation/treatment in Private Sector'),
  ('tb','tb_public','Sought consultation/treatment in Public Sector'),
  ('tb','tb_not_treated','NOT undergoing TB treatment'),
  ('tb','tb_treated','UNDERGOING TB treatment'),
  ('tb','tb_priv_hosp','Private hospital / clinic (anti-TB drugs)'),
  ('tb','tb_pharmacy','Pharmacy (anti-TB drugs)'),
  ('tb','tb_priv_doc','Private doctor (anti-TB drugs)'),
  ('tb','tb_ngo','NGO clinic (anti-TB drugs)'),
  ('tb','tb_gov_hosp','Government hospitals (anti-TB drugs)'),
  ('tb','tb_rhu','Rural / Urban Health Center (anti-TB drugs)'),
  ('tb','tb_bhs','Barangay Health Station (anti-TB drugs)'),
  ('tb','tb_outreach','Outreach clinic (anti-TB drugs)'),
  ('tb','tb_partner_none','No treatment partner'),
  ('tb','tb_partner_hp','Health professional (treatment partner)'),
  ('tb','tb_partner_bhw','Barangay Health Workers (treatment partner)'),
  ('tb','tb_partner_comm','Community leaders / volunteers (treatment partner)'),
  ('tb','tb_partner_friends','Friends / neighbors (treatment partner)'),
  ('tb','tb_partner_family','Family relatives (treatment partner)'),
  -- FAMILY PLANNING — CURRENT USERS BY METHOD
  ('fp','fp_BTL','BTL (Bilateral Tubal Ligation)'),
  ('fp','fp_Vasectomy','Vasectomy'),
  ('fp','fp_PillCOC','Pill (COC)'),
  ('fp','fp_PillPOP','Pill (POP)'),
  ('fp','fp_DMPA','Injectables (DMPA)'),
  ('fp','fp_LAM','LAM'),
  ('fp','fp_IUD','IUD'),
  ('fp','fp_Implanon','Implanon'),
  ('fp','fp_Condom','Condom'),
  ('fp','fp_SDM','Standard Days Method (SDM)');

-- --------------------------------------------------------------------------
-- 11. updated_at auto-touch
-- --------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_touch_households  before update on public.households    for each row execute function public.touch_updated_at();
create trigger trg_touch_residents   before update on public.residents     for each row execute function public.touch_updated_at();
create trigger trg_touch_records     before update on public.health_records for each row execute function public.touch_updated_at();
create trigger trg_touch_monitoring  before update on public.monitoring    for each row execute function public.touch_updated_at();

-- --------------------------------------------------------------------------
-- 12. Row Level Security
--     BHW sees/writes own purok; RHM & admin see all; anon blocked.
--     Monitoring/records inherit visibility through their household purok.
-- --------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.households      enable row level security;
alter table public.residents       enable row level security;
alter table public.health_records enable row level security;
alter table public.monitoring      enable row level security;
alter table public.visits          enable row level security;
alter table public.activities      enable row level security;
alter table public.notifications  enable row level security;
alter table public.id_counters    enable row level security;
alter table public.report_values  enable row level security;
alter table public.report_metrics enable row level security;

-- who is calling (returns false when signed out)
create or replace function public.is_signed_in()
returns boolean
language sql stable
as $$ select auth.uid() is not null $$;

-- profiles: everyone signed-in can read the directory; only self/admin can edit
create policy profiles_read   on public.profiles        for select using (public.is_signed_in());
create policy profiles_update on public.profiles        for update using (id = auth.uid() or public.my_role() = 'admin');
create policy profiles_insert on public.profiles        for insert with check (id = auth.uid() or public.my_role() = 'admin');

-- households / residents: filtered by purok
create policy hh_sel   on public.households for select using (public.can_access_purok(purok));
create policy hh_ins   on public.households for insert with check (public.can_access_purok(purok));
create policy hh_upd   on public.households for update using (public.can_access_purok(purok)) with check (public.can_access_purok(purok));
create policy hh_del   on public.households for delete using (public.can_access_purok(purok));

create policy res_sel  on public.residents for select using (
  exists (select 1 from public.households h where h.id = residents.hh_id and public.can_access_purok(h.purok))
);
create policy res_ins  on public.residents for insert with check (
  exists (select 1 from public.households h where h.id = residents.hh_id and public.can_access_purok(h.purok))
);
create policy res_upd  on public.residents for update using (
  exists (select 1 from public.households h where h.id = residents.hh_id and public.can_access_purok(h.purok))
) with check (
  exists (select 1 from public.households h where h.id = residents.hh_id and public.can_access_purok(h.purok))
);
create policy res_del  on public.residents for delete using (
  exists (select 1 from public.households h where h.id = residents.hh_id and public.can_access_purok(h.purok))
);

-- health records / monitoring / visits: through resident -> household purok
create policy rec_sel  on public.health_records for select using (
  exists (select 1 from public.residents r join public.households h on h.id = r.hh_id
          where r.id = health_records.res_id and public.can_access_purok(h.purok))
);
create policy rec_ins  on public.health_records for insert with check (
  exists (select 1 from public.residents r join public.households h on h.id = r.hh_id
          where r.id = health_records.res_id and public.can_access_purok(h.purok))
);
create policy rec_upd  on public.health_records for update using (
  exists (select 1 from public.residents r join public.households h on h.id = r.hh_id
          where r.id = health_records.res_id and public.can_access_purok(h.purok))
) with check (
  exists (select 1 from public.residents r join public.households h on h.id = r.hh_id
          where r.id = health_records.res_id and public.can_access_purok(h.purok))
);
create policy rec_del  on public.health_records for delete using (
  exists (select 1 from public.residents r join public.households h on h.id = r.hh_id
          where r.id = health_records.res_id and public.can_access_purok(h.purok))
);

create policy mon_sel  on public.monitoring for select using (
  exists (select 1 from public.residents r join public.households h on h.id = r.hh_id
          where r.id = monitoring.res_id and public.can_access_purok(h.purok))
);
create policy mon_ins  on public.monitoring for insert with check (
  exists (select 1 from public.residents r join public.households h on h.id = r.hh_id
          where r.id = monitoring.res_id and public.can_access_purok(h.purok))
);
create policy mon_upd  on public.monitoring for update using (
  exists (select 1 from public.residents r join public.households h on h.id = r.hh_id
          where r.id = monitoring.res_id and public.can_access_purok(h.purok))
) with check (
  exists (select 1 from public.residents r join public.households h on h.id = r.hh_id
          where r.id = monitoring.res_id and public.can_access_purok(h.purok))
);
create policy mon_del  on public.monitoring for delete using (
  exists (select 1 from public.residents r join public.households h on h.id = r.hh_id
          where r.id = monitoring.res_id and public.can_access_purok(h.purok))
);

create policy vis_sel  on public.visits for select using (
  exists (select 1 from public.monitoring m join public.residents r on r.id = m.res_id
          join public.households h on h.id = r.hh_id
          where m.id = visits.mon_id and public.can_access_purok(h.purok))
);
create policy vis_ins  on public.visits for insert with check (
  exists (select 1 from public.monitoring m join public.residents r on r.id = m.res_id
          join public.households h on h.id = r.hh_id
          where m.id = visits.mon_id and public.can_access_purok(h.purok))
);
create policy vis_upd  on public.visits for update using (
  exists (select 1 from public.monitoring m join public.residents r on r.id = m.res_id
          join public.households h on h.id = r.hh_id
          where m.id = visits.mon_id and public.can_access_purok(h.purok))
);
create policy vis_del  on public.visits for delete using (
  exists (select 1 from public.monitoring m join public.residents r on r.id = m.res_id
          join public.households h on h.id = r.hh_id
          where m.id = visits.mon_id and public.can_access_purok(h.purok))
);

-- activities / notifications / report values: read own or all (staff), write own
create policy act_sel  on public.activities for select using (public.is_signed_in());
create policy act_ins  on public.activities for insert with check (actor_id = auth.uid());
create policy act_del  on public.activities for delete using (actor_id = auth.uid() or public.my_role() = 'admin');

create policy notif_sel   on public.notifications for select using (user_id = auth.uid());
create policy notif_upd   on public.notifications for update using (user_id = auth.uid());
create policy notif_del   on public.notifications for delete using (user_id = auth.uid() or public.my_role() = 'admin');
create policy notif_ins   on public.notifications for insert with check (user_id = auth.uid() or public.my_role() in ('rhm','admin'));

-- id_counters: readable/writable only through the next_id() SECURITY DEFINER function
-- (the update inside next_id bypasses RLS for the function owner)
create policy ctr_sel on public.id_counters for select using (public.is_signed_in());

-- report values: BHW writes own rows; RHM/admin read all and can write all
create policy rep_sel on public.report_values for select using (
  bhw_id = auth.uid() or public.my_role() in ('rhm','admin')
);
create policy rep_ins on public.report_values for insert with check (
  bhw_id = auth.uid() or public.my_role() in ('rhm','admin')
);
create policy rep_upd on public.report_values for update using (
  bhw_id = auth.uid() or public.my_role() in ('rhm','admin')
);
create policy rep_del on public.report_values for delete using (
  bhw_id = auth.uid() or public.my_role() in ('rhm','admin')
);

create policy rmet_sel on public.report_metrics for select using (public.is_signed_in());

-- --------------------------------------------------------------------------
-- 13. Realtime (enable live updates for lists)
-- --------------------------------------------------------------------------
alter table public.households      replica identity full;
alter table public.residents       replica identity full;
alter table public.health_records replica identity full;
alter table public.monitoring      replica identity full;
alter table public.visits          replica identity full;
alter table public.notifications  replica identity full;

-- On a hosted Supabase project, also run:
--   alter publication supabase_realtime add table public.households, ...;
-- or toggle each table on in Dashboard > Database > Replication.

-- --------------------------------------------------------------------------
-- 14. Storage bucket for record attachments (optional — run on Supabase only)
-- --------------------------------------------------------------------------
-- insert into storage.buckets (id, name, public) values ('record-files', 'record-files', false)
--   on conflict (id) do nothing;

-- ============================================================================
-- End of schema
-- ============================================================================
