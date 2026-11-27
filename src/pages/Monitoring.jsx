// Health Monitoring: status cards, filtered list, monitoring detail,
// add/edit form, record-visit form, history, reschedule, mark completed
import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { useStore, toast } from '../store'
import { useNav } from '../App'
import { StatusPill, DV, useCountUp, Modal } from '../ui'
import { fmtDate, monStatusOf, addDays, today, uid, padId } from '../utils'
import { MON_TYPES, MON_STATUS } from '../constants'

export function openMonForm() {
  window.dispatchEvent(new CustomEvent('open-mon-form'))
}
export function openMonDetail(id) {
  window.dispatchEvent(new CustomEvent('open-mon-detail', { detail: { id } }))
}

function MonCard({ icon, label, value, sub, onClick, tone, delay }) {
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
      <div className="sc-foot"><span className="sc-sub">{sub}</span></div>
    </div>
  )
}

export default function Monitoring() {
  const { db } = useStore()
  const { confirmDialog } = useNav()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [sched, setSched] = useState('')
  const [sort, setSort] = useState('sched-asc')
  const [pageNo, setPageNo] = useState(1)
  // monitoring modals are hosted at App level (MonitoringModals) and driven by
  // window events, so they work from any page

  const stats = useMemo(() => {
    const st = { total: db.monitoring.length, on: 0, due: 0, od: 0, done: 0 }
    db.monitoring.forEach(m => {
      const s = monStatusOf(m.nextSched, m.status)
      if (s === 'On Track') st.on++
      else if (s === 'Due Soon') st.due++
      else if (s === 'Overdue') st.od++
      else st.done++
    })
    return st
  }, [db.monitoring])

  const list = useMemo(() => {
    const q = search.toLowerCase()
    const l = db.monitoring.filter(m => {
      const ms = monStatusOf(m.nextSched, m.status)
      if (type && m.type !== type) return false
      if (status && ms !== status) return false
      if (sched) {
        const d = Math.round((new Date(m.nextSched + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000)
        if (sched === 'over') { if (d >= 0) return false }
        else if (!(d >= 0 && d <= +sched)) return false
      }
      if (q && !(m.resName.toLowerCase().includes(q) || m.resId.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))) return false
      return true
    })
    switch (sort) {
      case 'name': l.sort((a, b) => a.resName.localeCompare(b.resName)); break
      case 'sched-desc': l.sort((a, b) => (a.nextSched < b.nextSched ? 1 : -1)); break
      case 'status': l.sort((a, b) => a.status.localeCompare(b.status)); break
      default: l.sort((a, b) => (a.nextSched < b.nextSched ? -1 : 1))
    }
    return l
  }, [db.monitoring, search, type, status, sched, sort])

  const per = 10
  const pages = Math.max(1, Math.ceil(list.length / per))
  const pageNoSafe = Math.min(pageNo, pages)
  const start = (pageNoSafe - 1) * per
  const rows = list.slice(start, start + per)

  const cards = [
    { icon: 'calcheck', label: 'Total Monitoring Records', val: stats.total, sub: 'all residents monitored' },
    { icon: 'check', label: 'On Track', val: stats.on, sub: 'within assigned schedule' },
    { icon: 'clk', label: 'Due Soon', val: stats.due, sub: 'approaching dates', tone: 'warn' },
    { icon: 'warn', label: 'Overdue', val: stats.od, sub: 'schedule has passed', tone: 'danger' },
    { icon: 'okc', label: 'Completed', val: stats.done, sub: 'monitoring completed' },
  ]

  // pulled from store at render scope
  const { update, addActivity } = useStore()
  function updateWith(fn) { update(fn) }
  function addActivityWith(a, b, c) { addActivity(a, b, c) }

  return (
    <section>
      <div className="grid-cards">
        {cards.map((c, i) => (
          <MonCard key={c.label} icon={c.icon} label={c.label} value={c.val} sub={c.sub} tone={c.tone}
            delay={i * 0.06} onClick={() => { setStatus(''); setPageNo(1) }} />
        ))}
      </div>
      <div className="toolbar">
        <div className="tb-search">
          <Icon name="search" />
          <input placeholder="Search resident name or Resident ID…" value={search} onChange={e => { setSearch(e.target.value); setPageNo(1) }} />
        </div>
        <div className="tb-field"><span>Monitoring Type</span>
          <select className="compact" value={type} onChange={e => { setType(e.target.value); setPageNo(1) }}>
            <option value="">All types</option>
            {MON_TYPES.map(t => <option key={t}>{t}</option>)}
          </select></div>
        <div className="tb-field"><span>Status</span>
          <select className="compact" value={status} onChange={e => { setStatus(e.target.value); setPageNo(1) }}>
            <option value="">All statuses</option>
            {MON_STATUS.map(s => <option key={s}>{s}</option>)}
          </select></div>
        <div className="tb-field"><span>Schedule</span>
          <select className="compact" value={sched} onChange={e => { setSched(e.target.value); setPageNo(1) }}>
            <option value="">All dates</option><option value="7">Next 7 days</option>
            <option value="14">Next 14 days</option><option value="30">Next 30 days</option>
            <option value="over">Past due</option>
          </select></div>
        <div className="tb-field"><span>Sort</span>
          <select className="compact" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="sched-asc">Next schedule (soonest)</option>
            <option value="name">Resident (A-Z)</option>
            <option value="sched-desc">Next schedule (latest)</option>
            <option value="status">Status</option>
          </select></div>
        <div className="tb-right">
          <button className="btn btn-line" onClick={() => toast('ok', 'Refreshed', 'Monitoring list updated.')}><Icon name="refresh" />Refresh</button>
          <button className="btn btn-pri" onClick={() => openMonForm()}><Icon name="plus" />Add Monitoring</button>
        </div>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table className="tbl">
            <thead><tr>
              <th>Monitoring ID</th><th>Resident ID</th><th>Resident Name</th><th>Monitoring Type</th>
              <th>Last Visit</th><th>Next Schedule</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {rows.length ? rows.map(m => {
                const ms = monStatusOf(m.nextSched, m.status)
                return (
                  <tr className="click" key={m.id} onClick={() => openMonDetail(m.id)}>
                    <td className="idc">{m.id}</td>
                    <td className="idc">{m.resId}</td>
                    <td><b>{m.resName}</b></td>
                    <td><span className="tag">{m.type}</span></td>
                    <td>{fmtDate(m.lastVisit)}</td>
                    <td><b>{fmtDate(m.nextSched)}</b></td>
                    <td><StatusPill s={ms} /></td>
                    <td>
                      <div className="actions">
                        <button className="icon-btn" title="View details" onClick={e => { e.stopPropagation(); openMonDetail(m.id) }}><Icon name="eye" /></button>
                        <button className="icon-btn" title="Edit monitoring" onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-mon-edit', { detail: { id: m.id } })) }}><Icon name="edit" /></button>
                        <button className="icon-btn" title="Record visit" onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-mon-visit', { detail: { id: m.id } })) }}><Icon name="clipboard" /></button>
                        <button className="icon-btn" title="Monitoring history" onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('open-mon-history', { detail: { id: m.id } })) }}><Icon name="history" /></button>
                        {ms !== 'Completed' && <button className="icon-btn" title="Mark as completed" onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('mon-mark-done', { detail: { id: m.id } })) }}><Icon name="check" /></button>}
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={8}><div className="tbl-empty"><Icon name="calcheck" /><b>No monitoring records</b><span>Create a monitoring schedule or adjust filters.</span></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span className="info">{list.length ? list.length + ' monitoring record(s)' : '0 records'}</span>
          <div className="pages">
            <button className="pg-btn" disabled={pageNoSafe <= 1} onClick={() => setPageNo(pageNoSafe - 1)}><Icon name="chevL" /></button>
            <button className="pg-btn cur">{pageNoSafe} / {pages}</button>
            <button className="pg-btn" disabled={pageNoSafe >= pages} onClick={() => setPageNo(pageNoSafe + 1)}><Icon name="chevR" /></button>
          </div>
        </div>
      </div>

    </section>
  )
}

/* ============ Monitoring modals ============ */
/* Always mounted at App level so open-mon-* events from any page (Dashboard
   quick actions, upcoming schedules) reach these listeners. */
export function MonitoringModals() {
  const { db, update, addActivity } = useStore()
  const { confirmDialog, toast } = useNav()
  const [monModal, setMonModal] = useState(null) // {kind:'form'|'detail'|'visit'|'history'|'resched', id?, data?}
  const markDoneRef = useRef(null)

  const markDone = id => {
    const m = db.monitoring.find(x => x.id === id)
    if (!m) return
    confirmDialog({
      kind: 'info',
      title: 'Mark monitoring as completed?',
      message: 'Monitoring for ' + m.resName + ' (' + m.type + ') will be marked as Completed.',
      okLabel: 'Mark Completed',
      onOK: () => {
        update(d => {
          const mm = d.monitoring.find(x => x.id === id)
          mm.status = 'Completed'; mm.lastVisit = today()
          d.visits.push({ id: uid(), monId: id, date: today(), type: 'Scheduled', update: 'Monitoring completed', notes: '', followUpNeeded: 'No', nextSch: '', status: 'Completed' })
        })
        addActivity('visit', 'Monitoring marked completed', m.resName)
        toast('ok', 'Completed', 'Monitoring ' + id + ' marked as completed.')
      },
    })
  }
  markDoneRef.current = markDone

  useEffect(() => {
    const onForm = () => setMonModal({ kind: 'form', id: null })
    const onEdit = e => setMonModal({ kind: 'form', id: e.detail.id })
    const onDetail = e => setMonModal({ kind: 'detail', id: e.detail.id })
    const onVisit = e => setMonModal({ kind: 'visit', id: e.detail.id })
    const onHistory = e => setMonModal({ kind: 'history', id: e.detail.id })
    const onMarkDone = e => markDoneRef.current && markDoneRef.current(e.detail.id)
    const evs = [
      ['open-mon-form', onForm],
      ['open-mon-detail', onDetail],
      ['open-mon-edit', onEdit],
      ['open-mon-visit', onVisit],
      ['open-mon-history', onHistory],
      ['mon-mark-done', onMarkDone],
    ]
    evs.forEach(([name, fn]) => window.addEventListener(name, fn))
    return () => evs.forEach(([name, fn]) => window.removeEventListener(name, fn))
  }, [])

  return <MonitoringModalsRender monModal={monModal} setMonModal={setMonModal} markDone={markDone} />
}

function MonitoringModalsRender({ monModal, setMonModal, markDone }) {
  const { db, update, addActivity } = useStore()
  const { confirmDialog, toast } = useNav()

  if (!monModal) return null
  const { kind, id } = monModal
  const m = id ? db.monitoring.find(x => x.id === id) : null

  /* ---------- Add/Edit monitoring form ---------- */
  if (kind === 'form') {
    const residents = [...db.residents].sort((a, b) => a.name.localeCompare(b.name))
    if (!monModal.data) monModal.data = m ? {
      resId: m.resId, type: m.type, dateStart: m.dateStart, lastVisit: m.lastVisit || '',
      next: m.nextSched, status: m.status, healthUpdate: m.healthUpdate || '', notes: m.notes || '', remarks: m.remarks || '',
    } : {
      resId: residents[0]?.id || '', type: MON_TYPES[0], dateStart: today(), lastVisit: '',
      next: addDays(today(), 14), status: 'On Track', healthUpdate: '', notes: '', remarks: '',
    }
    const data = monModal.data
    const setField = (k, v) => setMonModal({ ...monModal, data: { ...data, [k]: v } })
    const chosen = db.residents.find(x => x.id === data.resId)

    const save = thenVisit => {
      if (!data.resId) { toast('err', 'Resident required', 'Select a registered resident first.'); return }
      if (!data.next) { toast('err', 'Next schedule required', 'Set the next follow-up schedule date.'); return }
      const res = db.residents.find(x => x.id === data.resId)
      const payload = {
        resId: res.id, resName: res.name, hhId: res.hhId, type: data.type,
        dateStart: data.dateStart || today(), lastVisit: data.lastVisit, nextSched: data.next,
        status: monStatusOf(data.next, data.status === 'Completed' ? 'Completed' : null),
        healthUpdate: data.healthUpdate.trim(), notes: data.notes.trim(), remarks: data.remarks.trim(),
      }
      if (m) {
        update(d => { Object.assign(d.monitoring.find(x => x.id === m.id), payload) })
        addActivity('monitoring', 'Monitoring schedule updated', m.resName)
        toast('ok', 'Monitoring updated', 'Record ' + m.id + ' saved.')
        setMonModal(null)
      } else {
        let newId = ''
        update(d => {
          const mon = Object.assign({ id: padId(d.counters.mon, 'MON-') }, payload)
          d.monitoring.push(mon); d.counters.mon++
          newId = mon.id
        })
        addActivity('monitoring', 'Monitoring Added — new schedule created', res.name)
        if (thenVisit) {
          toast('ok', 'Monitoring saved', 'Now record the first follow-up visit for ' + res.name + '.')
          setMonModal({ kind: 'visit', id: newId })
        } else {
          toast('ok', 'Monitoring saved', 'Schedule ' + newId + ' for ' + res.name + ' created.')
          setMonModal(null)
        }
      }
    }

    return <Modal modal={{
      title: m ? 'Edit Monitoring — ' + m.id : 'Add Monitoring Schedule',
      sub: m ? m.resName + ' · ' + m.type : 'Create a monitoring record for a registered resident',
      icon: m ? 'edit' : 'calcheck',
      body: (
        <div className="form-grid">
          <div className="full f-note"><Icon name="info" />Monitoring ID is generated automatically. Status auto-computes from the next schedule date.</div>
          <div><label>Monitoring ID</label><input value={m ? m.id : padId(db.counters.mon, 'MON-')} readOnly /></div>
          {!m && (
            <div><label>Resident <span className="req">*</span></label>
              <select value={data.resId} onChange={e => setField('resId', e.target.value)}>
                {residents.map(x => <option key={x.id} value={x.id}>{x.name + ' — ' + x.id}</option>)}
              </select>
              <div className="auto-fill"><Icon name="search" />Search or select a registered resident</div>
            </div>
          )}
          {m && <div><label>Resident</label><input readOnly value={m.resName + ' (' + m.resId + ')'} /></div>}
          {!m && <div><label>Resident Name</label><input readOnly placeholder="Auto-displayed" value={chosen ? chosen.name : ''} /></div>}
          {!m && <div><label>Household ID</label><input readOnly placeholder="Auto-linked" value={chosen ? chosen.hhId : ''} /></div>}
          <div><label>Monitoring Type</label>
            <select value={data.type} onChange={e => setField('type', e.target.value)}>
              {MON_TYPES.map(t => <option key={t}>{t}</option>)}
            </select></div>
          <div><label>Date Started</label><input type="date" value={data.dateStart} onChange={e => setField('dateStart', e.target.value)} /></div>
          <div><label>Last Monitoring Date</label><input type="date" value={data.lastVisit} onChange={e => setField('lastVisit', e.target.value)} /></div>
          <div><label>Next Follow-up Schedule <span className="req">*</span></label><input type="date" value={data.next} onChange={e => setField('next', e.target.value)} /></div>
          <div><label>Monitoring Status</label>
            <select value={data.status} onChange={e => setField('status', e.target.value)}>
              {MON_STATUS.map(s => <option key={s}>{s}</option>)}
            </select>
            <div className="auto-fill"><Icon name="clk" />Auto-computed from schedule if left as On Track</div></div>
          <div className="full"><label>Health Update</label><textarea rows={2} value={data.healthUpdate} onChange={e => setField('healthUpdate', e.target.value)} placeholder="Current recorded health update" /></div>
          <div className="full"><label>Monitoring Notes</label><textarea rows={2} value={data.notes} onChange={e => setField('notes', e.target.value)} placeholder="Details of monitoring activity" /></div>
          <div className="full"><label>Remarks</label><textarea rows={2} value={data.remarks} onChange={e => setField('remarks', e.target.value)} /></div>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-line" onClick={() => { setMonModal(null); }}><Icon name="x" />Cancel</button>
          {!m && <button className="btn btn-soft" onClick={() => save(true)}><Icon name="cal" />Save &amp; Schedule Follow-up</button>}
          <button className="btn btn-pri" onClick={() => save(false)}><Icon name="save" />{m ? 'Save Monitoring Changes' : 'Save Monitoring'}</button>
        </>
      ),
    }} onClose={() => setMonModal(null)} />
  }

  /* ---------- Monitoring detail ---------- */
  if (kind === 'detail' && m) {
    const visits = db.visits.filter(v => v.monId === m.id).sort((a, b) => (a.date < b.date ? 1 : -1))
    const ms = monStatusOf(m.nextSched, m.status)
    return <Modal modal={{
      title: 'Monitoring Record — ' + m.id,
      sub: m.resName + ' · ' + m.type,
      icon: 'calcheck',
      body: (
        <div>
          <div className="detail-grid" style={{ marginBottom: 8 }}>
            <DV k="Monitoring ID" v={m.id} mono />
            <DV k="Resident ID" v={m.resId} mono />
            <DV k="Resident Name" v={m.resName} />
            <DV k="Household ID" v={m.hhId} mono />
            <DV k="Monitoring Type" v={<span className="tag">{m.type}</span>} />
            <DV k="Date Started" v={fmtDate(m.dateStart)} />
            <DV k="Last Monitoring Date" v={fmtDate(m.lastVisit)} />
            <DV k="Next Follow-up Schedule" v={<b>{fmtDate(m.nextSched)}</b>} />
            <DV k="Monitoring Status" v={<StatusPill s={ms} />} />
            <DV k="Health Update" v={m.healthUpdate || '—'} />
            <DV k="Monitoring Notes" v={m.notes || '—'} />
            <DV k="Remarks" v={m.remarks || '—'} />
          </div>
          <div className="f-hr">RECENT VISIT HISTORY</div>
          <div className="table-scroll" style={{ marginTop: 8 }}>
            <table className="tbl" style={{ minWidth: 560 }}>
              <thead><tr>
                <th>Visit Date</th><th>Type</th><th>Health Update</th><th>Follow-up Needed</th><th>Status</th>
              </tr></thead>
              <tbody>
                {visits.length ? visits.slice(0, 5).map(v => (
                  <tr key={v.id}>
                    <td><b>{fmtDate(v.date)}</b></td>
                    <td>{v.type}</td>
                    <td>{v.update}</td>
                    <td>{v.followUpNeeded === 'Yes' ? <span className="tag">Yes</span> : <span className="tag">No</span>}</td>
                    <td><StatusPill s={v.status} /></td>
                  </tr>
                )) : (
                  <tr><td colSpan={5}><div className="tbl-empty"><Icon name="history" /><b>No visits recorded yet</b><span>Use "Record Visit" to document the first monitoring visit.</span></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-line" onClick={() => { setMonModal(null); }}><Icon name="x" />Close</button>
          <button className="btn btn-ghost" onClick={() => setMonModal({ kind: 'history', id: m.id })}><Icon name="history" />Full History</button>
          <button className="btn btn-ghost" onClick={() => setMonModal({ kind: 'resched', id: m.id, data: { date: addDays(m.nextSched, 7), note: '' } })}><Icon name="cal" />Reschedule</button>
          {ms !== 'Completed' && <button className="btn btn-soft" onClick={() => { setMonModal(null);; markDone(m.id) }}><Icon name="check" />Mark Completed</button>}
          <button className="btn btn-pri" onClick={() => setMonModal({ kind: 'visit', id: m.id })}><Icon name="clipboard" />Record Visit</button>
        </>
      ),
    }} onClose={() => setMonModal(null)} />
  }

  /* ---------- Record visit form ---------- */
  if (kind === 'visit' && m) {
    if (!monModal.data) monModal.data = {
      date: today(), type: 'Scheduled', update: '', notes: '', fy: 'No',
      next: addDays(today(), 14), status: monStatusOf(m.nextSched, m.status), remarks: '',
    }
    const data = monModal.data
    const setField = (k, v) => setMonModal({ ...monModal, data: { ...data, [k]: v } })
    const saveVisit = () => {
      if (!data.update.trim()) { toast('err', 'Health update required', 'Record the health update from this visit.'); return }
      const visit = {
        id: uid(), monId: m.id, date: data.date || today(), type: data.type,
        update: data.update.trim(), notes: data.notes.trim(), followUpNeeded: data.fy,
        nextSch: data.next, status: data.status, remarks: data.remarks.trim(),
      }
      update(d => {
        d.visits.push(visit)
        const mm = d.monitoring.find(x => x.id === m.id)
        mm.lastVisit = visit.date
        mm.healthUpdate = visit.update
        if (data.fy === 'Yes' && data.next) { mm.nextSched = data.next; mm.status = monStatusOf(data.next, null) }
        else { mm.status = visit.status; if (data.next) mm.nextSched = data.next }
      })
      addActivity('visit', 'Follow-up Recorded — monitoring visit documented', m.resName)
      toast('ok', 'Visit saved', 'Monitoring visit for ' + m.resName + ' recorded' + (data.fy === 'Yes' && data.next ? '. Next schedule: ' + fmtDate(data.next) : '.'))
      setMonModal(null)
    }
    return <Modal modal={{
      title: 'Record Monitoring Visit',
      sub: m.resName + ' · ' + m.type + ' · ' + m.id,
      icon: 'clipboard',
      body: (
        <div className="form-grid">
          <div className="full f-note"><Icon name="info" />Monitoring ID and resident are linked automatically to the monitoring record.</div>
          <div><label>Monitoring ID</label><input value={m.id} readOnly /></div>
          <div><label>Resident ID / Name</label><input readOnly value={m.resId + ' · ' + m.resName} /></div>
          <div><label>Visit Date <span className="req">*</span></label><input type="date" value={data.date} onChange={e => setField('date', e.target.value)} /></div>
          <div><label>Visit Type</label>
            <select value={data.type} onChange={e => setField('type', e.target.value)}>
              <option>Scheduled</option><option>Follow-up</option><option>Other</option>
            </select></div>
          <div className="full"><label>Health Update <span className="req">*</span></label>
            <textarea rows={2} value={data.update} onChange={e => setField('update', e.target.value)} placeholder="Recorded health information or update" /></div>
          <div className="full"><label>Visit Notes</label>
            <textarea rows={2} value={data.notes} onChange={e => setField('notes', e.target.value)} placeholder="Observations and details of the visit" /></div>
          <div><label>Follow-up Needed?</label>
            <select value={data.fy} onChange={e => setField('fy', e.target.value)}>
              <option>Yes</option><option>No</option>
            </select></div>
          <div><label>Next Schedule</label><input type="date" value={data.next} disabled={m.status === 'Completed'} onChange={e => setField('next', e.target.value)} /></div>
          <div><label>Updated Monitoring Status</label>
            <select value={data.status} onChange={e => setField('status', e.target.value)}>
              {MON_STATUS.map(s => <option key={s}>{s}</option>)}
            </select></div>
          <div className="full"><label>Remarks</label><textarea rows={2} value={data.remarks} onChange={e => setField('remarks', e.target.value)} /></div>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-line" onClick={() => { setMonModal(null); }}><Icon name="x" />Cancel</button>
          <button className="btn btn-pri" onClick={saveVisit}><Icon name="save" />Save Visit</button>
        </>
      ),
    }} onClose={() => setMonModal(null)} />
  }

  /* ---------- Reschedule ---------- */
  if (kind === 'resched' && m) {
    if (!monModal.data) monModal.data = { date: addDays(m.nextSched, 7), note: '' }
    const data = monModal.data
    const setField = (k, v) => setMonModal({ ...monModal, data: { ...data, [k]: v } })
    const doReschedule = () => {
      if (!data.date) return
      update(d => {
        const mm = d.monitoring.find(x => x.id === m.id)
        mm.nextSched = data.date
        mm.status = monStatusOf(data.date, null)
        if (data.note.trim()) mm.notes = (mm.notes ? mm.notes + ' · ' : '') + data.note.trim()
      })
      toast('ok', 'Rescheduled', 'Next follow-up for ' + m.resName + ' moved to ' + fmtDate(data.date) + '.')
      setMonModal(null)
    }
    return <Modal modal={{
      title: 'Reschedule Monitoring — ' + m.id,
      sub: 'Current next schedule: ' + fmtDate(m.nextSched),
      icon: 'cal',
      size: 'sm',
      body: (
        <div className="form-grid">
          <div className="full"><label>New Next Follow-up Date <span className="req">*</span></label>
            <input type="date" value={data.date} onChange={e => setField('date', e.target.value)} /></div>
          <div className="full"><label>Reason / Notes</label>
            <textarea rows={2} value={data.note} onChange={e => setField('note', e.target.value)} placeholder="Reason for rescheduling" /></div>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-line" onClick={() => { setMonModal(null); }}><Icon name="x" />Cancel</button>
          <button className="btn btn-pri" onClick={doReschedule}><Icon name="cal" />Reschedule</button>
        </>
      ),
    }} onClose={() => setMonModal(null)} />
  }

  /* ---------- Full history ---------- */
  if (kind === 'history' && m) {
    const visits = db.visits.filter(v => v.monId === m.id).sort((a, b) => (a.date < b.date ? 1 : -1))
    return <Modal modal={{
      title: 'Monitoring History — ' + m.id,
      sub: m.resName + ' · ' + visits.length + ' recorded visit(s)',
      icon: 'history',
      body: (
        <div>
          <div className="detail-grid" style={{ marginBottom: 10 }}>
            <DV k="Resident" v={m.resName} />
            <DV k="Monitoring Type" v={<span className="tag">{m.type}</span>} />
            <DV k="Date Started" v={fmtDate(m.dateStart)} />
            <DV k="Current Status" v={<StatusPill s={monStatusOf(m.nextSched, m.status)} />} />
          </div>
          <div className="table-scroll">
            <table className="tbl" style={{ minWidth: 640 }}>
              <thead><tr>
                <th>Visit Date</th><th>Monitoring Type</th><th>Health Update</th><th>Visit Notes</th><th>Next Schedule</th><th>Status</th>
              </tr></thead>
              <tbody>
                {visits.length ? visits.map(v => (
                  <tr key={v.id}>
                    <td><b>{fmtDate(v.date)}</b></td>
                    <td>{v.type}</td>
                    <td>{v.update}</td>
                    <td>{v.notes || '—'}</td>
                    <td>{v.nextSch ? fmtDate(v.nextSch) : '—'}</td>
                    <td><StatusPill s={v.status} /></td>
                  </tr>
                )) : (
                  <tr><td colSpan={6}><div className="tbl-empty"><Icon name="history" /><b>No visits yet</b><span>Record a visit to start the history.</span></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-line" onClick={() => { setMonModal(null); }}><Icon name="x" />Close</button>
          <button className="btn btn-pri" onClick={() => setMonModal({ kind: 'visit', id: m.id })}><Icon name="plus" />Add New Visit</button>
        </>
      ),
    }} onClose={() => setMonModal(null)} />
  }

  return null
}
