// Data mode switch — mock (seeded demo data + local auth) vs live Supabase.
//
// VITE_USE_MOCK=true (or window.BHW_USE_MOCK = true) forces mock mode even
// when Supabase env vars are configured, so you can flip between the two
// without touching the Supabase setup. Unset/false = auto: Supabase when
// configured, mock otherwise.
const envMock = String(import.meta.env.VITE_USE_MOCK || '').trim().toLowerCase()
const win = typeof window !== 'undefined' ? window : null

export const useMock =
  envMock === 'true' || envMock === '1' ||
  !!(win && win.BHW_USE_MOCK === true)
