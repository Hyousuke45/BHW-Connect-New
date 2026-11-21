// Dashboard: summary cards, recent activities, monitoring overview, upcoming schedules, quick actions
import { useMemo } from 'react'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { useNav } from '../App'
import { useCountUp } from '../ui'
import { fmtDate, monStatusOf, monAbbr } from '../utils'
import { PUROKS } from '../constants'
import { openHouseholdForm, openMemberPicker } from './Households'
import { openRecordForm } from './Records'
import { openMonForm, openMonDetail } from './Monitoring'

function StatCard({ icon, label, value, sub, onClick, tone, delay }) {
  const v = useCountUp(value)
  return (
    <div className={'stat-card' + (tone ? ' ' + tone : '')} style={{ animationDelay: delay + 's' }} onClick={onClick}>
      <div className="sc-top">
        <span className="sc-ico"><Icon name={icon} /></span>
        <div>
          <div className="sc-val">{v}</div>
          <div className="sc-label">{label}</div>
        </div>
      </div>
      <div className="sc-foot">
        <span className="sc-sub">{sub}</span>
        <span className="sc-link">View All <Icon name="chevR" /></span>
      </div>
    </div>
  )
}

const ACT_ICONS = {
  household: 'home', member: 'adduser', record: 'health', monitoring: 'calcheck', visit: 'clipboard',
}

export default function Dashboard() {
  const { db } = useStore()
  const { go } = useNav()

  const stats = useMemo(() => {
    const st = { 'On Track': 0, 'Due Soon': 0, Overdue: 0, Completed: 0 }
    db.monitoring.forEach(m => { st[monStatusOf(m.nextSched, m.status)]++ })
    return st
  }, [db.monitoring])

  const max = Math.max(1, db.monitoring.length)
  const upcoming = useMemo(() => db.monitoring
    .filter(m => monStatusOf(m.nextSched, m.status) !== 'Completed')
    .sort((a, b) => (a.nextSched < b.nextSched ? -1 : 1))
    .slice(0, 5), [db.monitoring])

  const cards = [
    { icon: 'home', label: 'Total Households', val: db.households.length, sub: PUROKS.length + ' puroks covered', k: 'households' },
    { icon: 'users', label: 'Total Residents', val: db.residents.length, sub: 'registered under households', k: 'households' },
    { icon: 'health', label: 'Total Health Records', val: db.records.length, sub: 'all categories', k: 'records' },
    { icon: 'calcheck', label: 'Residents for Monitoring', val: db.monitoring.length, sub: 'active monitoring schedules', k: 'monitoring' },
  ]
  const monRows = [
    ['On Track', 'st-on'], ['Due Soon', 'st-due'], ['Overdue', 'st-od'], ['Completed', 'st-done'],
  ]

  return (
    <section>
      <div className="grid-cards">
        {cards.map((c, i) => (
          <StatCard key={c.label} icon={c.icon} label={c.label} value={c.val} sub={c.sub}
            delay={i * 0.06} onClick={() => go(c.k)} />
        ))}
      </div>

      <div className="dash-grid">
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card">
            <div className="card-h"><Icon name="activity" /><h3>Recent Activities</h3></div>
            <div className="card-b">
              <div className="act-feed">
                {(db.activities || []).slice(0, 7).map((a, i) => (
                  <div className="act" key={a.id}>
                    <span className="act-ico"><Icon name={ACT_ICONS[a.type] || 'activity'} /></span>
                    <div style={{ minWidth: 0 }}>
                      <div className="act-t">{a.desc}{i === 0 && <span className="badge-new">NEW</span>}</div>
                      <div className="act-d">{a.resName || 'Household record'}</div>
                    </div>
                    <span className="act-when">{fmtDate(a.date)}<br />{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><Icon name="chart" /><h3>Health Monitoring Overview</h3></div>
            <div className="card-b">
              <div className="mon-bars">
                {monRows.map(([k, cls]) => (
                  <div className={'mon-row ' + cls} key={k}>
                    <b><span className="dot"></span>{k}</b>
                    <div className="mb-track"><div className="mb-fill" style={{ width: Math.round(100 * stats[k] / max) + '%' }}></div></div>
                    <span className="mb-val">{stats[k]}</span>
                  </div>
                ))}
              </div>
              <div className="mon-legend">
                <div className="lg"><span className="dot" style={{ background: '#2f9e6e', width: 8, height: 8, borderRadius: 3, display: 'inline-block' }}></span>On Track — within schedule</div>
                <div className="lg"><span className="dot" style={{ background: '#e79c13', width: 8, height: 8, borderRadius: 3, display: 'inline-block' }}></span>Due Soon — approaching</div>
                <div className="lg"><span className="dot" style={{ background: '#dc5044', width: 8, height: 8, borderRadius: 3, display: 'inline-block' }}></span>Overdue — schedule passed</div>
                <div className="lg"><span className="dot" style={{ background: '#5b8def', width: 8, height: 8, borderRadius: 3, display: 'inline-block' }}></span>Completed — done</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div className="card">
            <div className="card-h"><Icon name="clk" /><h3>Upcoming Schedules</h3>
              <button className="view-all" onClick={() => go('monitoring')}>View All</button></div>
            <div className="card-b">
              <div className="upcoming-strip">
                {upcoming.length ? upcoming.map(m => {
                  const d = m.nextSched.split('-')
                  const cls = monStatusOf(m.nextSched, m.status)
                  const chip = cls === 'Overdue' ? 'chip-od' : cls === 'Due Soon' ? 'chip-due' : 'chip-on'
                  return (
                    <div className="up-item" key={m.id} onClick={() => openMonDetail(m.id)} style={{ cursor: 'pointer' }}>
                      <span className="up-date"><b>{d[2]}</b><span>{monAbbr(+d[1] - 1)}</span></span>
                      <div className="up-info">
                        <div className="n">{m.resName}</div>
                        <div className="t">{m.type}</div>
                      </div>
                      <span className={'up-chip ' + chip}>{cls}</span>
                    </div>
                  )
                }) : (
                  <div className="empty-note"><Icon name="calcheck" /><b>No upcoming schedules</b><span>All monitoring activities are completed.</span></div>
                )}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><Icon name="star" /><h3>Quick Actions</h3></div>
            <div className="card-b">
              <div className="qa-grid">
                <button className="qa primary" onClick={() => openHouseholdForm(null)}><Icon name="home" />Add Household</button>
                <button className="qa" onClick={() => openMemberPicker()}><Icon name="adduser" />Register Resident</button>
                <button className="qa" onClick={() => openRecordForm()}><Icon name="health" />Add Health Record</button>
                <button className="qa" onClick={() => openMonForm()}><Icon name="calcheck" />Add Monitoring Schedule</button>
                <button className="qa" onClick={() => go('households')}><Icon name="list" />View Household Records</button>
                <button className="qa" onClick={() => go('records')}><Icon name="sheet" />View Health Records</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
