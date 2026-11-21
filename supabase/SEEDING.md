# Seeding demo data into Supabase

Run `schema.sql` first (Supabase SQL Editor), create the 8 auth users, then use this to seed barangay data. Order matters because of foreign keys: households → residents → health records → monitoring → visits.

## Option A — copy from the running app (recommended)

The demo app already contains rich generated data (24 households, ~70 residents, ~120 records, monitoring, visits, report values). Export it as SQL inserts:

1. Open the app, sign in, open browser DevTools console.
2. Paste:

```js
const db = JSON.parse(localStorage.getItem('bhwConnectDB'))
copy(db)   // db is now on your clipboard
```

3. Transform with `scripts/export_db_to_sql.py` (in this repo) — reads the JSON dump on stdin, emits `households.sql` + `residents.sql` + `records.sql` + `monitoring.sql` + `visits.sql` + `report_values.sql` with correct column mapping (camelCase → snake_case, `'Yes'/'No'` → boolean, date columns as `DATE`).
4. Run each file in the Supabase SQL Editor in the order above (or paste them into one script; the file is already ordered).
5. Reset the sequences afterwards so new rows don't collide with seeded IDs:

```sql
select setval('public.household_id_seq',
  (select coalesce(max(substring(id from 4)::int), 0) + 1 from public.households));
select setval('public.resident_id_seq',
  (select coalesce(max(substring(id from 5)::int), 0) + 1 from public.residents));
select setval('public.record_id_seq',
  (select coalesce(max(substring(id from 5)::int), 0) + 1 from public.health_records));
select setval('public.monitoring_id_seq',
  (select coalesce(max(substring(id from 5)::int), 0) + 1 from public.monitoring));
```

## Option B — minimal hand seed

```sql
insert into public.households (head_first, head_last, head, house_num, street, purok, contact, date_reg)
values ('Juan','Dela Cruz','Juan Dela Cruz','BLK 5 LT 12','Sitio Riverside','Purok 3','09214458890','2024-06-15');
-- id auto-assigned as HH-025; grab it:
insert into public.residents (household_id, name, birthdate, sex, relation, civil_status, occupation, contact)
select id, 'Juan Dela Cruz', '1985-03-14', 'Male', 'Household Head', 'Married', 'Farmer', '09214458890'
  from public.households where head = 'Juan Dela Cruz';
```

## Notes

- `households.members` is maintained by trigger — never insert/update it yourself.
- `households.household_id` column in `residents` is `household_id`; the FK is on delete cascade, so removing a household removes its residents.
- Do NOT seed `visits` with `followUpNeeded: 'Yes'/'No'` strings — the column is boolean `follow_up_needed`.
- Report values: insert one row per (sheet, month 1-12, bhw_name, row_key, nhts). For the FP sheet remember the paired `_nhts` keys become rows with `nhts=true` and the same `row_key` prefix stripped of the suffix.
