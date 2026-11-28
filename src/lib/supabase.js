// Supabase client — connects to your project when configured, falls back to
// demo mode when it is not (so the app keeps working out of the box).
//
// Configure by either:
//   1. a .env file (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), or
//   2. window.SUPABASE_CONFIG = { url: 'https://xxxx.supabase.co', anonKey: 'eyJ...' }
//      set before this bundle loads (e.g. in index.html or a small config.js).
import { createClient } from '@supabase/supabase-js'

const envUrl = import.meta.env.VITE_SUPABASE_URL
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const win = typeof window !== 'undefined' ? window : null
const winCfg = win && (win.SUPABASE_CONFIG || null)

export const SUPABASE_URL = envUrl || (winCfg && winCfg.url) || null
export const SUPABASE_ANON_KEY = envKey || (winCfg && winCfg.anonKey) || null

// live only when BOTH url and anon key are present and not placeholders
export const supabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY &&
  !/YOUR_|PLACEHOLDER|xxxx/i.test(SUPABASE_URL + ' ' + SUPABASE_ANON_KEY))

export const supabase = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null
