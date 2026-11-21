# Connecting BHW Connect to Supabase

This guide wires the React app (`bhw-connect-app/`) to the Supabase project created from `supabase/schema.sql`. The app currently runs fully offline on `localStorage`; after this change it authenticates against Supabase Auth and reads/writes Postgres tables.

## 1. Create the project and run the schema

1. Create a project at [supabase.com](https://supabase.com) (region close to you, e.g. Singapore).
2. SQL Editor → paste the whole of `supabase/schema.sql` → **Run**. It creates: `profiles`, `households`, `residents`, `health_records`, `monitoring`, `visits`, `activities`, `notifications`, `report_values`, `report_settings` — plus triggers (auto ids like `HH-003`, `RES-012`, `CHR-125`, auto `households.members` count), views (`residents_with_age`), and 36 RLS policies.
3. Authentication → Providers → Email: **ON**. For the demo, turn **off** "Confirm email" (Authentication → Settings) so logins work instantly.

## 2. Create the 8 demo accounts

Auth users (Dashboard → Authentication → Add user → "Auto confirm user" ✓). Use the emails below; on signup the `handle_new_user` trigger auto-creates their `profiles` row:

| email | password | role | purok | full name |
|---|---|---|---|---|
| bhw.banlag@banlag-bhw.ph | bhw123 | bhw | Purok 3 | Juan D. Dela Cruz |
| bhw.anlingcao@banlag-bhw.ph | bhw123 | bhw | Purok 1 | Ana L. Anlingcao |
| bhw.belarma@banlag-bhw.ph | bhw123 | bhw | Purok 2 | Yusor B. Belarma |
| bhw.delco@banlag-bhw.ph | bhw123 | bhw | Purok 4 | Sofia R. Delco |
| bhw.icari@banlag-bhw.ph | bhw123 | bhw | Purok 5 | Elena T. Icari |
| bhw.macote@banlag-bhw.ph | bhw123 | bhw | Purok 6 | Vilma G. Macote |
| rhm.uy@banlag-bhs.ph | rhm123 | rhm | All Puroks | Sheila Mae I. Uy |
| admin@banlag-bhw.ph | admin123 | admin | All Puroks | Municipal IT Admin |

The trigger reads signup metadata (`raw_user_meta_data`). If you add users through the Dashboard (which does not send metadata), fix their profiles afterwards in SQL Editor:

```sql
update public.profiles set username='bhw.banlag', full_name='Juan D. Dela Cruz',
  role='bhw', purok='Purok 3', contact='0921 445 8890' where id = (select id from auth.users where email='bhw.banlag@banlag-bhw.ph');
```

(Repeat per account with the values from the table.)

## 3. Install the client in the app

```bash
npm install @supabase/supabase-js
```

Create `.env.local` (never commit it) from Project Settings → API:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...   # the anon public key
```

## 4. Create `src/supabase.js`

```js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

## 5. Swap `LoginPage` to Supabase Auth

Replace the local credential check with `signInWithPassword`; keep the same UI (demo picker rows now call it too):

```jsx
import { supabase } from '../supabase'

const submit = async e => {
  e.preventDefault()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailFor(user.trim()), pass  // map username → email, see below
  })
  if (error) { setErr('Invalid username or password.'); setPass(''); return }
  onLogin()
}
```

The demo usernames (`bhw.banlag`) are not emails, so map them once:

```js
function emailFor(username) {
  const demo = { 'bhw.banlag':'bhw.banlag@banlag-bhw.ph', /* ...7 more from the table above */ }
  return demo[username] || (username.includes('@') ? username : username + '@banlag-bhw.ph')
}
```

Keep the session alive across reloads — in `App.jsx`:

```jsx
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => { if (data.session) setLoggedIn(true) })
  const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setLoggedIn(!!s))
  return () => sub.subscription.unsubscribe()
}, [])
```

And logout becomes `await supabase.auth.signOut()`.

## 6. Load the signed-in profile (replaces `db.user`)

```js
// after login / on session restore
const { data: profile } = await supabase
  .from('profiles').select('*').eq('id', (await supabase.auth.getUser()).data.user.id).single()
// profile has: username, full_name, role, barangay, purok, contact, email, bhw_name
```

## 7. Replace the localStorage store with table queries

`src/store.jsx` stays the React state container — only the persistence layer changes. Field mapping (store → table column):

| store object | table | notes |
|---|---|---|
| `db.households[]` | `households` | `hhId`→`household_id`, `dateReg`→`date_reg`, `headFirst/headLast` kept |
| `db.residents[]` | `residents` | `hhId`→`household_id`, `civil`→`civil_status`, `birthdate` stays |
| `db.records[]` | `health_records` | `resId`→`resident_id`, `cat`→`cat` (enum), category fields same names, snake_case for `dateAdmin`→`date_admin`, `nextMon`→`next_mon`, `nextSched`→`next_sched`, `followUp`→`follow_up`, `measureDate`→`measure_date`, `pregStatus`→`preg_status`, `immStatus`→`imm_status`, `fpStatus`→`fp_status`, `visitInfo`→`visit_info`, `otherCat`→`other_cat`, `resName`/`hhId` denormalized→ keep or re-join |
| `db.monitoring[]` | `monitoring` | `resId`→`resident_id`, `nextSched`→`next_sched`, `healthUpdate`→`health_update`, `recId`→`record_id` |
| `db.visits[]` | `visits` | `monId`→`monitoring_id`, `followUpNeeded: 'Yes'/'No'`→boolean `follow_up_needed` |
| `db.activities[]` | `activities` | `desc` field is named `"desc"` in SQL — quote it |
| `db.notifs[]` | `notifications` | `read`→`read`, `icon` values match Icon.jsx (`cal`,`warn`,`info`,`sheet`) |
| `db.report[month][sheet][key]` | `report_values` | one row per (sheet, month 1-12, bhw_name, row_key, nhts) — flatten on load, batch-upsert on save |
| `db.users` / `db.user` | `profiles` + `auth` | never store passwords client-side again |

Example — dashboard load:

```js
const [{ data: households }, { data: residents }] = await Promise.all([
  supabase.from('households').select('*').order('id'),
  supabase.from('residents').select('*').order('id'),
])
```

Worksheet save (upsert on the natural key):

```js
await supabase.from('report_values').upsert(rows, { onConflict: 'sheet,month,bhw_name,row_key,nhts' })
```

## 8. ID assignment

The DB assigns `HH-025`, `RES-009`, `CHR-125`, `MON-061` etc. automatically when you insert **without an id** — pass `id: null` or omit it. Keep `padId()` only for optimistic display; reconcile from the returned row.

## 9. Deleting data

RLS allows delete only for `rhm` / `admin` roles — exactly the permission split the demo app implies. BHWs can insert and update everything, delete nothing (matches "remove" actions being gated in the UI).

## 10. Realtime (optional, nice for multi-BHW offices)

```js
supabase.channel('households')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'households' }, payload => updateHouseholds(payload))
  .subscribe()
```

Enable per table in Database → Replication before using this.

## Migration strategy

Ship both modes: keep the current localStorage mode when `VITE_SUPABASE_URL` is absent (the demo keeps working offline), use Supabase when present:

```js
export const useSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL)
```

That gives you a staged rollout: develop offline → run the schema → flip one env var.
