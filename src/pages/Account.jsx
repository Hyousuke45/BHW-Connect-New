// Account Information: profile hero, profile/area/security/activity tabs,
// edit profile modal, change password
import { useState } from 'react'
import Icon from '../components/Icon'
import { useStore, toast } from '../store'
import { useNav } from '../App'
import { StatusPill, DV, Modal } from '../ui'
import { initials, fmtDate, today, nowTime } from '../utils'

const ACC_TABS = [
  { k: 'profile', name: 'Account Profile', icon: 'user' },
  { k: 'area', name: 'Assigned Area', icon: 'map' },
  { k: 'security', name: 'Security & Password', icon: 'lock' },
  { k: 'activity', name: 'Account Activity', icon: 'history' },
]

export default function Account() {
  const { db, update, logAccountActivity } = useStore()
  const { confirmDialog } = useNav()
  const [tab, setTab] = useState('profile')
  const [pw, setPw] = useState({ cur: '', nw: '', conf: '' })
  const [showPw, setShowPw] = useState({})
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState(null)
  const [conf, setConf] = useState(false)

  const u = db.user || {}
  const areaHH = db.households.filter(h => h.purok === u.purok).length
  const areaRes = db.residents.filter(r => {
    const h = db.households.find(x => x.id === r.hhId)
    return h && h.purok === u.purok
  }).length

  /* ---------- edit profile modal ---------- */
  if (editOpen) {
    if (!editData) setEditData({ fullName: u.fullName, contact: u.contact || '', email: u.email || '' })
    const data = editData || { fullName: u.fullName, contact: u.contact || '', email: u.email || '' }
    const setField = (k, v) => setEditData({ ...data, [k]: v })
    return <Modal modal={{
      title: 'Edit Profile',
      sub: 'Update your account details',
      icon: 'edit',
      body: (
        <div className="form-grid">
          <div><label>Full Name <span className="req">*</span></label><input value={data.fullName} onChange={e => setField('fullName', e.target.value)} /></div>
          <div><label>Username</label><input value={u.username} readOnly /><div className="auto-fill"><Icon name="lock" />Username cannot be changed</div></div>
          <div><label>Contact Number</label><input value={data.contact} onChange={e => setField('contact', e.target.value)} /></div>
          <div><label>Email Address</label><input type="email" value={data.email} onChange={e => setField('email', e.target.value)} /></div>
          <div><label>Assigned Barangay</label><input value={u.barangay} readOnly /><div className="auto-fill"><Icon name="pin" />Set by the health station</div></div>
          <div><label>Assigned Purok / Area</label><input value={u.purok} readOnly /><div className="auto-fill"><Icon name="pin" />Set by the health station</div></div>
          <div className="full"><label>Profile Picture</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="ph-ava" style={{ width: 64, height: 64, fontSize: '1.2rem', margin: 0 }}>{initials(data.fullName || u.fullName)}</span>
              <button type="button" className="btn btn-ghost" onClick={() => toast('info', 'Profile picture', 'Picture upload is simulated in this offline demo — initials are used instead.')}><Icon name="camera2" />Change Picture</button>
            </div>
          </div>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-line" onClick={() => { setEditOpen(false); setEditData(null); }}><Icon name="x" />Cancel</button>
          <button className="btn btn-pri" onClick={() => {
            update(d => {
              const acct = d.users.find(x => x.username === d.user.username) || d.user
              acct.fullName = data.fullName.trim() || acct.fullName
              acct.contact = data.contact.trim()
              acct.email = data.email.trim()
              if (d.user !== acct) d.user = acct
            })
            logAccountActivity('Profile information updated')
            toast('ok', 'Profile saved', 'Your account information was updated.')
            setEditOpen(false); setEditData(null);
          }}><Icon name="save" />Save Profile</button>
        </>
      ),
    }} onClose={() => { setEditOpen(false); setEditData(null) }} />
  }

  /* ---------- change password handler ---------- */
  const savePassword = e => {
    e.preventDefault()
    if (pw.cur !== u.password) { toast('err', 'Wrong current password', 'The current password you entered does not match.'); return }
    if (pw.nw.length < 6) { toast('err', 'Password too short', 'New password must be at least 6 characters.'); return }
    if (pw.nw !== pw.conf) { toast('err', 'Passwords do not match', 'New password and confirmation must match.'); return }
    update(d => {
      const acct = d.users.find(x => x.username === d.user.username) || d.user
      acct.password = pw.nw
      if (d.user !== acct) d.user = acct
    })
    logAccountActivity('Password changed')
    setPw({ cur: '', nw: '', conf: '' })
    toast('ok', 'Password updated', 'Your account password was changed successfully.')
  }

  const togglePwVis = k => setShowPw(s => ({ ...s, [k]: !s[k] }))

  return (
    <section>
      <div className="profile-hero">
        <div className="ph-ava">{initials(u.fullName)}</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="ph-name">{u.fullName}</div>
          <div className="ph-role">{u.role} · {u.username}</div>
          <div className="ph-tags">
            <span className="tag">{u.barangay}</span>
            <span className="tag">{u.purok}</span>
            <span className="tag">{u.status}</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative', zIndex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => setEditOpen(true)}
            style={{ background: 'rgba(255,255,255,.14)', borderColor: 'rgba(255,255,255,.3)', color: '#fff' }}>
            <Icon name="edit" />Edit Profile</button>
          <button className="btn btn-ghost" onClick={() => confirmDialog({
            kind: 'warn', title: 'Log out of BHW Connect?',
            message: 'Are you sure you want to log out? All unsaved worksheet edits will be kept locally.',
            okLabel: 'Yes, log out',
          })} style={{ background: 'rgba(185,80,68,.25)', borderColor: 'rgba(255,179,166,.4)', color: '#ffcfc7' }}>
            <Icon name="logout" />Logout</button>
        </div>
      </div>

      <div className="profile-nav">
        {ACC_TABS.map(t => (
          <button key={t.k} className={'pn-btn' + (tab === t.k ? ' active' : '')} onClick={() => setTab(t.k)}>
            <Icon name={t.icon} />{t.name}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card">
          <div className="card-h"><Icon name="info" /><h3>Profile Information</h3></div>
          <div className="card-b">
            <div className="detail-grid">
              <DV k="Full Name" v={u.fullName} />
              <DV k="Username" v={u.username} mono />
              <DV k="Account Role" v={<span className="tag">{u.role}</span>} />
              <DV k="Account Status" v={<StatusPill s="Active" />} />
              <DV k="Assigned Barangay" v={u.barangay} />
              <DV k="Assigned Purok / Area" v={u.purok} />
              <DV k="Contact Number" v={u.contact} />
              <DV k="Email Address" v={u.email} />
              <DV k="Date Created" v={fmtDate(u.dateCreated)} />
              <DV k="Records Managed" v={db.households.length + ' households · ' + db.residents.length + ' residents · ' + db.records.length + ' health records'} />
            </div>
          </div>
        </div>
      )}

      {tab === 'area' && (
        <div className="card">
          <div className="card-h"><Icon name="map" /><h3>Assigned Area</h3></div>
          <div className="card-b">
            <div className="detail-grid">
              <DV k="Barangay" v={u.barangay} />
              <DV k="Purok / Area" v={u.purok} />
              <DV k="Health Station" v="BHS Banlag" />
              <DV k="Rural Health Midwife" v="Sheila Mae I. Uy, RM" />
              <DV k="Households in Area" v={areaHH + ' households in ' + u.purok} />
              <DV k="Residents in Area" v={areaRes + ' residents'} />
            </div>
            <div className="f-note" style={{ marginTop: 14 }}><Icon name="info" />
              Area assignment is set by the barangay health station. Contact the RHM (Rural Health Midwife) to request a change.</div>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="two-col">
          <div className="card">
            <div className="card-h"><Icon name="key" /><h3>Change Password</h3></div>
            <div className="card-b">
              <form className="form-grid" onSubmit={savePassword}>
                <div className="full f-note"><Icon name="warn" />Password must be at least 6 characters. Use something memorable but not obvious.</div>
                <div><label>Current Password <span className="req">*</span></label>
                  <div className="lf-wrap">
                    <input type={showPw.cur ? 'text' : 'password'} value={pw.cur} onChange={e => setPw({ ...pw, cur: e.target.value })} required autoComplete="current-password" />
                    <button type="button" className="eye" onClick={() => togglePwVis('cur')}><Icon name={showPw.cur ? 'eyeoff' : 'eye'} /></button>
                  </div></div>
                <div><label>New Password <span className="req">*</span></label>
                  <div className="lf-wrap">
                    <input type={showPw.nw ? 'text' : 'password'} value={pw.nw} onChange={e => setPw({ ...pw, nw: e.target.value })} required minLength={6} autoComplete="new-password" />
                    <button type="button" className="eye" onClick={() => togglePwVis('nw')}><Icon name={showPw.nw ? 'eyeoff' : 'eye'} /></button>
                  </div></div>
                <div><label>Confirm New Password <span className="req">*</span></label>
                  <div className="lf-wrap">
                    <input type={showPw.conf ? 'text' : 'password'} value={pw.conf} onChange={e => setPw({ ...pw, conf: e.target.value })} required minLength={6} autoComplete="new-password" />
                    <button type="button" className="eye" onClick={() => togglePwVis('conf')}><Icon name={showPw.conf ? 'eyeoff' : 'eye'} /></button>
                  </div></div>
                <div className="full" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-pri" type="submit"><Icon name="check" />Update Password</button>
                  <button className="btn btn-line" type="reset" onClick={() => setPw({ cur: '', nw: '', conf: '' })}><Icon name="x" />Clear Form</button>
                </div>
              </form>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><Icon name="lock" /><h3>Account Security Status</h3></div>
            <div className="card-b">
              <div className="detail-grid">
                <DV k="Password" v="Updated recently" />
                <DV k="Session" v="Local device session" />
                <DV k="Data Storage" v="Browser localStorage (offline-first)" />
                <DV k="Last Sign-in" v={fmtDate(today()) + ' ' + nowTime()} />
                <DV k="Account Created" v={fmtDate(u.dateCreated)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="card">
          <div className="card-h"><Icon name="history" /><h3>Recent Account Activity</h3></div>
          <div className="card-b">
            <div className="act-feed">
              {(db.accountActs || []).length ? db.accountActs.map((a, i) => (
                <div className="act" key={i}>
                  <span className="act-ico"><Icon name="user" /></span>
                  <div>
                    <div className="act-t">{a.desc}</div>
                    <div className="act-d">Account activity</div>
                  </div>
                  <span className="act-when">{fmtDate(a.date)}<br />{a.time}</span>
                </div>
              )) : (
                <div className="empty-note"><Icon name="history" /><b>No account activity yet</b><span>Your sign-ins and updates will appear here.</span></div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
