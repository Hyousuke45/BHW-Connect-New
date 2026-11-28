// Login page — Supabase auth when configured (sign in + register), demo
// credentials otherwise. Registering creates the auth user and its profile
// row (via the on_auth_user_created trigger in the Supabase schema).
import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { toast } from '../store'
import { useStore } from '../store'
import { supabase, supabaseConfigured, mockMode } from '../lib/supabase'
import { PUROKS } from '../constants'

const PUROK_OPTS = PUROKS // purok assignment choices at registration

// module-level: session restore runs once per page load, not after every logout
let sessionRestored = false

export default function LoginPage({ onLogin }) {
  const { db, update, logAccountActivity } = useStore()
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [err, setErr] = useState(null) // sign-in column errors
  const [regErr, setRegErr] = useState(null) // register column errors
  const [busy, setBusy] = useState(false)
  const [showCreds, setShowCreds] = useState(false)
  // register form
  const [reg, setReg] = useState({
    username: '', fullName: '', email: '', contact: '',
    purok: PUROK_OPTS[0], pass: '', pass2: '',
  })

  const accounts = db.users || (db.user ? [db.user] : [])
  const findAccount = uname => accounts.find(
    a => a.username.toLowerCase() === uname.toLowerCase()
  )

  // map a Supabase auth user (or signUp metadata) onto the app's account shape
  const acctFromAuth = (u, meta) => {
    const m = meta || u.user_metadata || {}
    return {
      fullName: m.full_name || (u.email ? u.email.split('@')[0] : 'BHW'),
      username: m.username || (u.email ? u.email.split('@')[0] : u.id.slice(0, 8)),
      role: m.role || 'Barangay Health Worker',
      barangay: m.barangay || 'Brgy. Banlag',
      purok: m.purok || 'All Puroks',
      contact: m.contact || '',
      email: u.email || m.email || '',
      status: 'Active',
      dateCreated: (u.created_at || '').slice(0, 10) || todayStr(),
      supabase: true, // marks a Supabase-backed account
    }
  }
  const todayStr = () => new Date().toISOString().slice(0, 10)

  const enterApp = (acct, greetingName) => {
    update(d => { d.user = acct })
    logAccountActivity('Signed in to BHW Connect as ' + acct.username)
    toast('ok', 'Welcome, ' + greetingName + '!', 'You are signed in as ' + acct.role + (acct.purok && acct.purok !== 'All Puroks' ? ' · ' + acct.purok : '') + '.')
    onLogin()
  }

  /* ---------- Supabase sign in ---------- */
  // resolves a username to the email used at registration: remembered accounts
  // first, else the app's synthetic domain, else the raw input if already an email
  const emailFor = uname => {
    if (uname.includes('@')) return uname
    try {
      const known = JSON.parse(localStorage.getItem('bhwAuthAccounts') || '{}')
      if (known[uname.toLowerCase()]) return known[uname.toLowerCase()]
    } catch (e) { /* ignore */ }
    return uname + '@banlag-bhw.ph'
  }
  const supaSignIn = async (uname, p) => {
    const email = emailFor(uname)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: p })
    if (error) {
      return { error: 'Invalid username or password.' }
    }
    return { acct: acctFromAuth(data.user) }
  }

  /* ---------- Supabase register ---------- */
  const supaRegister = async () => {
    const r = { ...reg }
    const email = r.email.trim()
    const uname = r.username.trim()
    const meta = {
      username: uname,
      full_name: r.fullName.trim(),
      role: 'Barangay Health Worker',
      barangay: 'Brgy. Banlag',
      purok: r.purok,
      contact: r.contact.trim(),
    }
    const { data, error } = await supabase.auth.signUp({ email, password: r.pass, options: { data: meta } })
    if (error) return { error: friendlyAuthError(error.message) }
    if (data.user && !data.session) {
      // email confirmation on: profile is created after the user confirms
      return { needsConfirm: true, email }
    }
    // remember username -> email so signing in by username works afterwards
    try {
      const known = JSON.parse(localStorage.getItem('bhwAuthAccounts') || '{}')
      known[uname.toLowerCase()] = email
      localStorage.setItem('bhwAuthAccounts', JSON.stringify(known))
    } catch (e) { /* ignore */ }
    return { acct: acctFromAuth(data.user, meta) }
  }

  const friendlyAuthError = msg => {
    const m = (msg || '').toLowerCase()
    if (m.includes('already registered') || m.includes('already exists')) return 'That email is already registered. Try signing in instead.'
    if (m.includes('password')) return 'Password must be at least 6 characters.'
    if (m.includes('fetch') || m.includes('network') || m.includes('failed')) return 'Cannot reach the auth server. Check your connection and try again.'
    return msg || 'Registration failed. Please try again.'
  }

  const submit = async e => {
    e.preventDefault()
    if (busy) return
    const u = user.trim(), p = pass
    if (!u || !p) { setErr('Please enter both username and password.'); return }
    setBusy(true); setErr(null)
    try {
      if (supabaseConfigured) {
        const r = await supaSignIn(u, p)
        if (r.acct) { enterApp(r.acct, r.acct.fullName.split(' ')[0]); return }
        setErr(r.error)
      } else {
        const acct = findAccount(u) || (u === 'bhw.banlag' ? accounts[0] : null)
        if (acct && p === acct.password) {
          enterApp(acct, acct.fullName.split(' ')[0])
          return
        }
        setErr('Invalid username or password.')
      }
      setPass('')
    } finally {
      setBusy(false)
    }
  }

  const register = async e => {
    e.preventDefault()
    if (busy) return
    const r = reg
    if (!r.username.trim() || !r.fullName.trim() || !r.email.trim()) { setRegErr('Please fill in username, full name and email.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) { setRegErr('Please enter a valid email address.'); return }
    if (r.pass.length < 6) { setRegErr('Password must be at least 6 characters.'); return }
    if (r.pass !== r.pass2) { setRegErr('Passwords do not match.'); return }
    setBusy(true); setRegErr(null)
    try {
      if (supabaseConfigured) {
        const out = await supaRegister()
        if (out.needsConfirm) {
          toast('ok', 'Check your email', 'We sent a confirmation link to ' + out.email + '. Click it, then sign in here.')
          setUser(r.username.trim())
          return
        }
        if (out.error) { setRegErr(out.error); return }
        if (out.acct) { enterApp(out.acct, out.acct.fullName.split(' ')[0]); return }
      } else {
        // demo mode: register locally into the stored account list
        if (findAccount(r.username.trim())) { setRegErr('That username is already taken.'); return }
        const acct = {
          fullName: r.fullName.trim(), username: r.username.trim(),
          role: 'Barangay Health Worker', barangay: 'Brgy. Banlag', purok: r.purok,
          contact: r.contact.trim(), email: r.email.trim(), status: 'Active',
          dateCreated: todayStr(), password: r.pass,
        }
        update(d => { d.users.push(acct) })
        toast('ok', 'Account created', r.fullName.trim() + ' is registered' + (r.purok !== 'All Puroks' ? ' for ' + r.purok : '') + '. Sign in with your new password.')
        setUser(acct.username); setPass('')
        return
      }
    } finally {
      setBusy(false)
    }
  }

  // restore a Supabase session on FIRST load only (module-level guard): after
  // an explicit logout the stored session is signed out server-side, so
  // getSession() must not bounce the user straight back into the app.
  useEffect(() => {
    if (!supabaseConfigured) return
    if (sessionRestored) return
    sessionRestored = true
    supabase.auth.signOut = supabase.auth.signOut.bind(supabase.auth)
    supabase.auth.getSession().then(({ data }) => {
      if (data && data.session) {
        const acct = acctFromAuth(data.session.user)
        update(d => { d.user = acct })
        onLogin()
      }
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const quickFill = acct => {
    setUser(acct.username)
    setPass(acct.password)
    setErr(null)
    setRegErr(null)
  }

  const setRegField = (k, v) => setReg(prev => ({ ...prev, [k]: v }))

  return (
    <div id="loginPage">
      <div className="login-card wide">
        <div className="login-head">
          <div className="login-logo"><img src="/logo.png" alt="BHW Connect logo" /></div>
          <div className="login-title">BHW Connect</div>
          <div className="login-sub">Barangay Health Worker Records System</div>
          {supabaseConfigured && (
            <div className="login-mode"><Icon name="okc" /><span>Connected to Supabase</span></div>
          )}
          {mockMode && (
            <div className="login-mode mock"><Icon name="info" /><span>Mock Data · demo accounts &amp; seeded records</span></div>
          )}
        </div>
        <div className="login-cols">
          {/* ---- left: sign in ---- */}
          <form className="login-form login-col" autoComplete="off" onSubmit={submit}>
            <div className="login-col-title"><Icon name="logout" /> Sign In</div>
            {err && (
              <div className="login-err show">
                <Icon name="warn" /><span>{err}</span>
              </div>
            )}
            <div>
              <label htmlFor="lgUser">Username</label>
              <div className="lf-wrap">
                <Icon name="user" />
                <input id="lgUser" type="text" placeholder="e.g. juan.delacruz" value={user} onChange={e => setUser(e.target.value)} required />
              </div>
            </div>
            <div>
              <label htmlFor="lgPass">Password</label>
              <div className="lf-wrap">
                <Icon name="lock" />
                <input id="lgPass" type={showPw ? 'text' : 'password'} placeholder="Enter your password" value={pass} onChange={e => setPass(e.target.value)} required />
                <button type="button" className="eye" aria-label="Show password" onClick={() => setShowPw(v => !v)}>
                  <Icon name={showPw ? 'eyeoff' : 'eye'} />
                </button>
              </div>
            </div>
            <div className="login-meta">
              <label className="remember">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me
              </label>
              <a href="#" onClick={e => { e.preventDefault(); toast('info', 'Account Recovery', 'Contact your barangay health station administrator to reset your password.') }}>
                Forgot password?
              </a>
            </div>
            <button id="lgSubmit" className="btn btn-pri btn-lg btn-block" type="submit" disabled={busy}><Icon name="logout" /> {busy ? 'Signing in…' : 'Sign In'}</button>
            <div className="login-cred">
              <button type="button" className="cred-toggle" onClick={() => setShowCreds(v => !v)}>
                <Icon name="info" />
                <span>Demo accounts ({accounts.length})</span>
                <Icon name="chevD" className={'cred-chev' + (showCreds ? ' open' : '')} style={{ marginLeft: 'auto' }} />
              </button>
              {showCreds && (
                <div className="cred-list">
                  {accounts.map(a => (
                    <button key={a.username} type="button" className="cred-row" onClick={() => quickFill(a)} title={'Fill ' + a.username}>
                      <span className="cred-ava">{a.fullName.trim()[0]}</span>
                      <span className="cred-body">
                        <b>{a.username}</b>
                        <small>{a.fullName} · {a.role}{a.purok && a.purok !== 'All Puroks' ? ' · ' + a.purok : ''}</small>
                      </span>
                      <span className="cred-pw">{a.password}</span>
                    </button>
                  ))}
                  <div className="cred-hint">Click any row to autofill · all passwords shown are demo-only</div>
                </div>
              )}
            </div>
          </form>
          {/* ---- right: register ---- */}
          <form className="login-form login-col" autoComplete="off" onSubmit={register}>
            <div className="login-col-title"><Icon name="adduser" /> Create Account</div>
            {regErr && (
              <div className="login-err show">
                <Icon name="warn" /><span>{regErr}</span>
              </div>
            )}
            <div className="login-grid">
              <div>
                <label htmlFor="rgName">Full Name <span className="req">*</span></label>
                <div className="lf-wrap">
                  <Icon name="user" />
                  <input id="rgName" type="text" placeholder="e.g. Maria D. Santos" value={reg.fullName} onChange={e => setRegField('fullName', e.target.value)} required />
                </div>
              </div>
              <div>
                <label htmlFor="rgUser">Username <span className="req">*</span></label>
                <div className="lf-wrap">
                  <Icon name="user" />
                  <input id="rgUser" type="text" placeholder="e.g. maria.santos" value={reg.username} onChange={e => setRegField('username', e.target.value)} required />
                </div>
              </div>
              <div>
                <label htmlFor="rgMail">Email <span className="req">*</span></label>
                <div className="lf-wrap">
                  <Icon name="mail" />
                  <input id="rgMail" type="email" placeholder="you@example.com" value={reg.email} onChange={e => setRegField('email', e.target.value)} required />
                </div>
              </div>
              <div>
                <label htmlFor="rgContact">Contact Number</label>
                <div className="lf-wrap">
                  <Icon name="phone" />
                  <input id="rgContact" type="text" placeholder="09xx xxx xxxx" value={reg.contact} onChange={e => setRegField('contact', e.target.value)} />
                </div>
              </div>
              <div>
                <label htmlFor="rgPurok">Assigned Purok</label>
                <div className="lf-wrap">
                  <Icon name="home" />
                  <select id="rgPurok" value={reg.purok} onChange={e => setRegField('purok', e.target.value)}>
                    {PUROK_OPTS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="rgPass">Password <span className="req">*</span></label>
                <div className="lf-wrap">
                  <Icon name="lock" />
                  <input id="rgPass" type="password" placeholder="At least 6 characters" value={reg.pass} onChange={e => setRegField('pass', e.target.value)} required />
                </div>
              </div>
              <div className="lg-span">
                <label htmlFor="rgPass2">Confirm Password <span className="req">*</span></label>
                <div className="lf-wrap">
                  <Icon name="lock" />
                  <input id="rgPass2" type="password" placeholder="Repeat your password" value={reg.pass2} onChange={e => setRegField('pass2', e.target.value)} required />
                </div>
              </div>
            </div>
            <button id="rgSubmit" className="btn btn-pri btn-lg btn-block" type="submit" disabled={busy}><Icon name="adduser" /> {busy ? 'Creating account…' : 'Create Account'}</button>
            <div className="login-col-note">Fields with <span className="req">*</span> are required · new accounts register as Barangay Health Worker</div>
          </form>
        </div>
        <div className="login-foot">BHS Banlag &middot; RHM Sheila Mae I. Uy, RM &middot; &copy; 2026 BHW Connect</div>
      </div>
    </div>
  )
}
