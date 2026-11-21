# BHW Connect — React + Vite Edition

Barangay Health Worker Records System, built as a **React + Vite** app with a calm, desktop-first visual language: brand-green scale + neutral ink, semantic status colors only, fade-in transitions, and a small pop as click feedback.

## Quick start

```bash
npm install        # once
npm run dev        # dev server at http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build
```

## Sign in

- Username: `bhw.banlag` · Password: `bhw123`

## Features

1. **Dashboard** — count-up summary cards, recent activities, monitoring overview bars, upcoming schedules, quick actions.
2. **Household Management** — searchable/filterable/sortable household list with pagination; household profile with member table; add/edit household (auto IDs, auto member count); register/edit/remove residents (auto-computed age); resident profile with health summary.
3. **Centralized Health Records** — Excel-style worksheet: 7 category tabs, column letters, editable cells with amber dirty-state, auto-filled resident data, worksheet search, Save Changes, CSV export; per-category record forms (child growth, maternal, immunization, family planning, general/other) and record detail.
4. **Health Monitoring** — status cards (On Track / Due Soon / Overdue / Completed), filtered list, monitoring detail with visit history, add/edit monitoring, record-visit form (auto-updates status & next schedule), reschedule, mark completed.
5. **BHW Monthly Report** — the 4 worksheets from `excels.xlsx` (Vitamin A & Deworming, Vaccination/Nutrition/Deliveries, TB Surveillance, Family Planning) with by-BHW or by-month mode, editable cells with live totals, CSV export.
6. **Account Information** — profile hero, assigned area, change password (with show/hide), account activity log, edit profile, logout.

## Tech notes

- **React 19 + Vite 8** — no other runtime dependencies; state in React, persisted to `localStorage` (key `bhwConnectDB`), offline-first.
- Fully responsive but **desktop-first**: fixed sidebar and multi-column layouts on desktop/laptop (≥1100px), narrower sidebar down to 860px, then the drawer layout for tablet/phone (tested at 1440/1024/800/375px).
- Structure: `src/pages/*` per screen, `src/components/Icon.jsx` (inline SVG set), `src/store.jsx` (state + persistence), `src/ui.jsx` (modal/toast/confirm/CSV primitives), `src/seed.js` (demo data), `src/constants.js` (spec lists), `src/utils.js` (dates/IDs).

## Design decisions (per your feedback)

- **Fewer colors** — green scale + ink; semantic colors only where meaning demands it (status pills, overdue/due-soon, destructive buttons).
- **Calm motion** — pages, cards, modals, toasts and the login card *fade in*. The one **pop** is click feedback: buttons, tabs, rows and nav items compress to ~94% while pressed. Honors `prefers-reduced-motion`.
- **Selects fixed** — dropdown text no longer runs under the arrow (right padding + `text-overflow: ellipsis` on every select, including toolbar, worksheet cells, report meta and modals).

## Multi-account demo login (mockup data)

The login screen has a collapsible **Demo accounts** panel listing all 8 mock
users — click a row to autofill its credentials:

| username | password | role | purok |
|---|---|---|---|
| bhw.banlag | bhw123 | Barangay Health Worker | Purok 3 |
| bhw.anlingcao | bhw123 | Barangay Health Worker | Purok 1 |
| bhw.belarma | bhw123 | Barangay Health Worker | Purok 2 |
| bhw.delco | bhw123 | Barangay Health Worker | Purok 4 |
| bhw.icari | bhw123 | Barangay Health Worker | Purok 5 |
| bhw.macote | bhw123 | Barangay Health Worker | Purok 6 |
| rhm.uy | rhm123 | Rural Health Midwife | All Puroks |
| admin.banlag | admin123 | System Administrator | All Puroks |

Signing in with any account persists that user in the store (topbar, Account
Information and profile edits follow the signed-in user). Account → Edit
Profile / Change Password update the account inside the users list.

## Supabase backend (schema included)

`supabase/` contains everything needed to move from localStorage to a real
backend:

- **`schema.sql`** — full PostgreSQL schema: 10 tables (profiles, households,
  residents, health_records, monitoring, visits, activities, notifications,
  report_values, report_settings), 4 enums, id-assignment triggers matching
  the app's `HH-0024`/`RES-0068`/`CHR-`/`MON-` format, auto `households.members`
  count trigger, `residents_with_age` view, `handle_new_user` auth trigger and
  36 RLS policies (BHW/RHM/admin permission split: everyone reads/inserts/
  updates; delete is RHM/admin-only).
- **`WIRING.md`** — step-by-step: create the project, run the schema, create
  the 8 auth users, install `@supabase/supabase-js`, env vars, swap
  LoginPage/`store.jsx` persistence to table queries, realtime channels, and a
  staged rollout plan (app keeps working offline when the env vars are absent).
- **`SEEDING.md`** — how to copy the demo data from the running app into
  Supabase (with `scripts/export_db_to_sql.py`, which converts the
  localStorage JSON dump to FK-ordered SQL inserts with the right snake_case
  mapping and boolean coercion).

The demo passwords live only in the localStorage mockup. Real deployments
authenticate via Supabase Auth (email + password, never stored client-side).
