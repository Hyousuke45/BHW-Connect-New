// Login page — credentials checked against the DB users list
import { useState } from 'react'
import Icon from '../components/Icon'
import { toast } from '../store'
import { useStore } from '../store'

export default function LoginPage({ onLogin }) {
  const { db, update, logAccountActivity } = useStore()
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [err, setErr] = useState(null)
  const [showCreds, setShowCreds] = useState(false)

  const accounts = db.users || (db.user ? [db.user] : [])
  const findAccount = uname => accounts.find(
    a => a.username.toLowerCase() === uname.toLowerCase()
  )

  const submit = e => {
    e.preventDefault()
    const u = user.trim(), p = pass
    if (!u || !p) { setErr('Please enter both username and password.'); return }
    const acct = findAccount(u) || (u === 'bhw.banlag' ? accounts[0] : null)
    if (acct && p === acct.password) {
      setErr(null)
      // sign in as this account (persists in the store)
      update(d => { d.user = acct })
      logAccountActivity('Signed in to BHW Connect as ' + acct.username)
      toast('ok', 'Welcome back, ' + acct.fullName.split(' ')[0] + '!', 'You are signed in as ' + acct.role + (acct.purok && acct.purok !== 'All Puroks' ? ' · ' + acct.purok : '') + '.')
      onLogin()
    } else {
      setErr('Invalid username or password.')
      setPass('')
    }
  }

  const quickFill = acct => {
    setUser(acct.username)
    setPass(acct.password)
    setErr(null)
  }

  return (
    <div id="loginPage">
      <div className="login-card">
        <div className="login-logo"><img src="/logo.png" alt="BHW Connect logo" /></div>
        <div className="login-title">BHW Connect</div>
        <div className="login-sub">Barangay Health Worker Records System</div>
        {err && (
          <div className="login-err show">
            <Icon name="warn" /><span>{err}</span>
          </div>
        )}
        <form className="login-form" autoComplete="off" onSubmit={submit}>
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
          <button className="btn btn-pri btn-lg btn-block" type="submit"><Icon name="logout" /> Sign In</button>
        </form>
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
        <div className="login-foot">BHS Banlag &middot; RHM Sheila Mae I. Uy, RM &middot; &copy; 2026 BHW Connect</div>
      </div>
    </div>
  )
}
