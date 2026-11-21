// App shell: sidebar + topbar + notification panel + page host
import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { useNav } from '../App'
import { initials, todayLong, fmtDate, monStatusOf } from '../utils'
import { toast } from '../store'
import Dashboard from './Dashboard'
import Households from './Households'
import Records from './Records'
import Monitoring from './Monitoring'
import Reports from './Reports'
import Account from './Account'

const NAV_ITEMS = [
  { group: 'Main Menu' },
  { k: 'dashboard', icon: 'dash', name: 'Dashboard' },
  { k: 'households', icon: 'home', name: 'Household Management' },
  { k: 'records', icon: 'health', name: 'Health Records', badge: 'records' },
  { k: 'monitoring', icon: 'calcheck', name: 'Health Monitoring', badge: 'hot' },
  { group: 'Other' },
  { k: 'reports', icon: 'report', name: 'BHW Monthly Report' },
  { k: 'account', icon: 'user', name: 'Account Information' },
]

export default function Shell({ page, onNavigate, onLogout }) {
  const { db, update } = useStore()
  const { confirmDialog } = useNav()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  const user = db.user || {}
  const unread = db.notifs.filter(n => !n.read).length
  const overdue = db.monitoring.filter(m => monStatusOf(m.nextSched, m.status) === 'Overdue').length
  const dueSoon = db.monitoring.filter(m => monStatusOf(m.nextSched, m.status) === 'Due Soon').length

  // close notification pop on outside click
  useEffect(() => {
    if (!notifOpen) return
    const onDoc = e => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [notifOpen])

  const markAllNotifs = () => {
    update(d => { d.notifs.forEach(n => { n.read = true }) })
    toast('ok', 'Notifications', 'All notifications marked as read.')
  }

  const confirmLogout = () => {
    confirmDialog({
      kind: 'warn',
      title: 'Log out of BHW Connect?',
      message: 'Are you sure you want to log out? All unsaved worksheet edits will be kept locally.',
      okLabel: 'Yes, log out',
      onOK: onLogout,
    })
  }

  const go = p => { onNavigate(p); setSidebarOpen(false) }

  const pages = {
    dashboard: <Dashboard />,
    households: <Households />,
    records: <Records />,
    monitoring: <Monitoring />,
    reports: <Reports />,
    account: <Account />,
  }

  return (
    <div id="app">
      <aside className={'sidebar' + (sidebarOpen ? ' open' : '')}>
        <div className="sb-brand">
          <div className="sb-logo"><img src="/logo.jpg" alt="BHW Connect logo" /></div>
          <div>
            <div className="sb-name">BHW Connect</div>
            <div className="sb-tag">Health Records</div>
          </div>
        </div>
        <nav className="sb-nav">
          {NAV_ITEMS.map((it, i) =>
            it.group
              ? <div key={'g' + i} className="sb-label">{it.group}</div>
              : (
                <button key={it.k} className={'nav-item' + (page === it.k ? ' active' : '')} onClick={() => go(it.k)}>
                  <Icon name={it.icon} />{it.name}
                  {it.badge === 'records' && db.records.length > 0 && <span className="badge">{db.records.length}</span>}
                  {it.badge === 'hot' && (overdue + dueSoon) > 0 && <span className="badge hot">{overdue + dueSoon}</span>}
                </button>
              )
          )}
        </nav>
        <div className="sb-foot">
          <button className="sb-user" onClick={() => go('account')} title="Open Account Information">
            <span className="sb-ava on">{initials(user.fullName)}</span>
            <span style={{ minWidth: 0 }}>
              <span className="sb-un">{user.fullName}</span>
              <span className="sb-ur" style={{ display: 'block' }}>BHW &middot; {user.purok}</span>
            </span>
            <Icon name="chevR" style={{ marginLeft: 'auto', width: 15, height: 15, opacity: .6 }} />
          </button>
          <button className="sb-logout" onClick={confirmLogout}>
            <Icon name="logout" style={{ width: 17, height: 17 }} /> Logout
          </button>
        </div>
      </aside>
      {sidebarOpen && <div className="sb-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="tb-btn burger" aria-label="Open menu" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button>
          <div className="tb-welcome">
            <b>Welcome, {(user.fullName || 'BHW').split(' ')[0]}!</b>
            <span>{user.role} &middot; {user.purok}</span>
          </div>
          <div className="tb-spacer"></div>
          <div className="tb-date"><Icon name="cal" /><span>{todayLong()}</span></div>
          <button className="tb-btn" title="Refresh data" onClick={() => toast('ok', 'Dashboard refreshed', 'All summaries and lists updated.')}>
            <Icon name="refresh" />
          </button>
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button className="tb-btn" title="Notifications" onClick={() => setNotifOpen(v => !v)}>
              <Icon name="bell" />
              {unread > 0 && <span className="ping" />}
            </button>
            {notifOpen && (
              <div className="notif-pop">
                <div className="notif-h"><Icon name="bell" />Notifications{unread > 0 && <span className="nbadge">{unread}</span>}</div>
                <div className="notif-list">
                  {db.notifs.slice(0, 8).map(n => (
                    <div key={n.id} className={'notif-item' + (n.read ? '' : ' unread')}>
                      <span className="ni-ico"><Icon name={n.icon} /></span>
                      <div style={{ minWidth: 0 }}>
                        <div className="nt">{n.title}</div>
                        <div className="nd">{n.desc}</div>
                      </div>
                      <span className="nm">{fmtDate(n.date)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 9, textAlign: 'center' }}>
                  <button className="btn btn-sm btn-ghost" onClick={markAllNotifs}>Mark all as read</button>
                </div>
              </div>
            )}
          </div>
          <button className="tb-btn" title="Account Information" onClick={() => go('account')}><Icon name="user" /></button>
        </header>
        <main className="content">
          <div key={page} className="page">{pages[page]}</div>
        </main>
      </div>
    </div>
  )
}
