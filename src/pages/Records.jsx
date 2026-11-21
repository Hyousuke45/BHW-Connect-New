// Centralized Health Records: category tabs, Excel-like worksheet with editable
// cells + dirty state, per-category record forms, detail modal, CSV export
import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { useStore, toast } from '../store'
import { useNav } from '../App'
import { StatusPill, DV, downloadCSV, Modal } from '../ui'
import { fmtDate, age, padId, today } from '../utils'
import {
  HEALTH_STATUS, IMM_STATUS, MON_STATUS, VACCINES, VACCINE_CATS, GROWTH_STATUS,
  VITA_STATUS, DEWORM_STATUS, FP_METHODS, PREG_STATUS,
} from '../constants'

export function openRecordForm(prefResId) {
  window.dispatchEvent(new CustomEvent('open-record-form', { detail: { resId: prefResId || null } }))
}
export function openRecDetail(id) {
  window.dispatchEvent(new CustomEvent('open-rec-detail', { detail: { id } }))
}

const REC_TABS = [
  { k: 'all', name: 'All Records', icon: 'sheet' },
  { k: 'general', name: 'General', icon: 'clipboard' },
  { k: 'child', name: 'Child Health', icon: 'baby' },
  { k: 'maternal', name: 'Maternal Health', icon: 'preg' },
  { k: 'imm', name: 'Immunization', icon: 'syringe' },
  { k: 'fp', name: 'Family Planning', icon: 'pill' },
  { k: 'other', name: 'Other Health Records', icon: 'flask' },
]
const CAT_OF = { general: 'Other Health Records', child: 'Child Health', maternal: 'Maternal Health', imm: 'Immunization', fp: 'Family Planning', other: 'Other Health Records' }
const tabOf = cat => Object.keys(CAT_OF).filter(k => CAT_OF[k] === cat)[0]

const FORM_TABS = [
  { k: 'general', name: 'General', icon: 'clipboard', prefix: 'OHR-' },
  { k: 'child', name: 'Child Health', icon: 'baby', prefix: 'CHR-' },
  { k: 'maternal', name: 'Maternal Health', icon: 'preg', prefix: 'MHR-' },
  { k: 'imm', name: 'Immunization', icon: 'syringe', prefix: 'IMR-' },
  { k: 'fp', name: 'Family Planning', icon: 'pill', prefix: 'FPR-' },
  { k: 'other', name: 'Other Health', icon: 'flask', prefix: 'OHR-' },
]

/* --- worksheet column definitions per tab --- */
function wsColumns(tab) {
  switch (tab) {
    case 'child': return [
      ['Record ID', 'id', 90, 'ro'], ['Resident ID', 'resId', 92, 'ro'], ["Child's Full Name", 'resName', 170, 'ro'],
      ['Age', 'age', 64, 'ro'], ['Sex', 'sex', 58, 'ro'], ['Weight (kg)', 'weight', 80, 'num'],
      ['Height (cm)', 'height', 78, 'num'], ['Measurement Date', 'measureDate', 110, 'date'],
      ['Growth Status', 'growth', 130, 'sel:' + GROWTH_STATUS.join('|')],
      ['Vitamin A Status', 'vita', 140, 'sel:' + VITA_STATUS.join('|')],
      ['Deworming Status', 'deworm', 140, 'sel:' + DEWORM_STATUS.join('|')],
      ['Feeding Information', 'feeding', 150, 'text'],
      ['Health Notes', 'notes', 180, 'text'],
      ['Next Monitoring Date', 'nextMon', 120, 'date'],
      ['Remarks', 'remarks', 150, 'text'], ['Status', 'status', 130, 'sel:' + HEALTH_STATUS.join('|')]]
    case 'maternal': return [
      ['Record ID', 'id', 90, 'ro'], ['Resident ID', 'resId', 92, 'ro'], ["Mother's Name", 'resName', 170, 'ro'],
      ['Age', 'age', 64, 'ro'], ['Pregnancy Status', 'pregStatus', 170, 'sel:' + PREG_STATUS.join('|')],
      ['Registration Date', 'regDate', 110, 'date'], ['Est. Delivery Date', 'edd', 110, 'date'],
      ['Pregnancy Information', 'pregInfo', 170, 'text'], ['Prenatal Visit Date', 'prenatalDate', 110, 'date'],
      ['Prenatal Visit Details', 'prenatalDetails', 200, 'text'], ['Blood Pressure', 'bp', 95, 'text'],
      ['Health Notes', 'notes', 170, 'text'], ['Follow-up Date', 'followUp', 110, 'date'],
      ['Maternal Status', 'maternalStatus', 130, 'sel:' + MON_STATUS.join('|')],
      ['Remarks', 'remarks', 150, 'text']]
    case 'imm': return [
      ['Record ID', 'id', 90, 'ro'], ['Resident ID', 'resId', 92, 'ro'], ['Resident Name', 'resName', 170, 'ro'],
      ['Birthdate', 'birthdate', 105, 'ro'], ['Vaccine Name', 'vaccine', 180, 'sel:' + VACCINES.join('|')],
      ['Vaccine Category', 'vacCat', 130, 'sel:' + VACCINE_CATS.join('|')],
      ['Dose No.', 'dose', 72, 'num'], ['Date Administered', 'dateAdmin', 110, 'date'],
      ['Administered By', 'administeredBy', 170, 'text'], ['Next Schedule', 'nextSched', 110, 'date'],
      ['Immunization Status', 'immStatus', 140, 'sel:' + IMM_STATUS.join('|')],
      ['Remarks', 'remarks', 150, 'text']]
    case 'fp': return [
      ['Record ID', 'id', 90, 'ro'], ['Resident ID', 'resId', 92, 'ro'], ['Resident Name', 'resName', 170, 'ro'],
      ['Age', 'age', 64, 'ro'], ['FP Method', 'method', 170, 'sel:' + FP_METHODS.join('|')],
      ['Registration Date', 'regDate', 110, 'date'], ['Method Start Date', 'methodStart', 115, 'date'],
      ['Last Visit', 'lastVisit', 105, 'date'], ['Follow-up Date', 'followUp', 110, 'date'],
      ['FP Status', 'fpStatus', 130, 'sel:New Acceptor|Current User|Drop-out|Follow-up'],
      ['NHTS?', 'nhts', 70, 'sel:Yes|No'], ['Visit Information', 'visitInfo', 180, 'text'],
      ['Remarks', 'remarks', 150, 'text']]
    case 'other': case 'general': return [
      ['Record ID', 'id', 90, 'ro'], ['Resident ID', 'resId', 92, 'ro'], ['Resident Name', 'resName', 170, 'ro'],
      ['Household ID', 'hhId', 95, 'ro'], ['Age', 'age', 64, 'ro'], ['Sex', 'sex', 58, 'ro'],
      ['Health Category', 'otherCat', 140, 'sel:Chronic Disease|Injury|Nutrition|Infectious Disease|General Consultation'],
      ['Date Recorded', 'dateRecorded', 110, 'date'], ['Health Condition', 'condition', 150, 'text'],
      ['Health Information / Findings', 'info', 230, 'text'],
      ['Health Status', 'status', 140, 'sel:' + HEALTH_STATUS.join('|')],
      ['Follow-up Date', 'followUp', 110, 'date'], ['Remarks', 'remarks', 150, 'text']]
    default: return [
      ['Record ID', 'id', 95, 'ro'], ['Category', 'cat', 120, 'ro'], ['Resident ID', 'resId', 95, 'ro'],
      ['Resident Name', 'resName', 170, 'ro'], ['Household ID', 'hhId', 95, 'ro'], ['Age/Sex', 'agesex', 95, 'ro'],
      ['Date Recorded', 'dateRecorded', 110, 'ro'], ['Summary', 'summary', 260, 'ro'],
      ['Status', 'status', 140, 'ro'], ['Follow-up', 'followUp', 105, 'ro']]
  }
}

export function recSummary(r) {
  switch (r.cat) {
    case 'Child Health': return r.weight + ' kg · ' + r.height + ' cm · ' + r.growth
    case 'Maternal Health': return r.pregStatus + ' · ' + (r.edd ? 'EDD ' + fmtDate(r.edd) : 'no EDD')
    case 'Immunization': return r.vaccine + ' dose ' + r.dose + ' · ' + r.immStatus
    case 'Family Planning': return r.method + ' · ' + r.fpStatus
    default: return r.condition + ' · ' + (r.info || '')
  }
}
export function recStatusOf(r) {
  if (r.cat === 'Immunization') return r.immStatus
  if (r.cat === 'Maternal Health') return r.maternalStatus || r.status
  return r.status
}

export default function Records() {
  const { db, update } = useStore()
  const { confirmDialog, toast } = useNav()
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState('')
  const [tab, setTab] = useState('all')
  const [wsSearch, setWsSearch] = useState('')
  const [dirty, setDirty] = useState({}) // recId -> count
  const [saved, setSaved] = useState(true)

  // record form / detail driven by events (from other pages)
  const [recForm, setRecForm] = useState(null) // {id?, tab, resId?}
  const [recDetail, setRecDetail] = useState(null) // id
  useEffect(() => {
    const onForm = e => setRecForm({ id: null, tab: 'general', resId: e.detail.resId })
    const onDetail = e => setRecDetail(e.detail.id)
    window.addEventListener('open-record-form', onForm)
    window.addEventListener('open-rec-detail', onDetail)
    return () => { window.removeEventListener('open-record-form', onForm); window.removeEventListener('open-rec-detail', onDetail) }
  }, [])

  const list = useMemo(() => {
    const q = (search + ' ' + wsSearch).trim().toLowerCase()
    return db.records.filter(r => {
      if (tab !== 'all' && r.cat !== CAT_OF[tab]) return false
      if (status && r.status !== status && r.immStatus !== status) return false
      if (q && !(r.resName.toLowerCase().includes(q) || r.resId.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) || (r.hhId || '').toLowerCase().includes(q))) return false
      return true
    })
  }, [db.records, search, wsSearch, status, tab])

  const cols = wsColumns(tab)
  const counts = { all: db.records.length }
  db.records.forEach(r => { counts[r.cat] = (counts[r.cat] || 0) + 1 })

  const cellEdited = (recId, key, value) => {
    update(d => {
      const r = d.records.find(x => x.id === recId)
      if (!r) return
      let v = value
      if (key === 'nhts') v = v === 'Yes'
      if (key === 'dose') v = +v || 1
      if (key === 'weight' || key === 'height') v = parseFloat(v) || 0
      r[key] = v
    })
    setDirty(prev => ({ ...prev, [recId]: (prev[recId] || 0) + 1 }))
    setSaved(false)
  }

  const saveSheet = () => {
    setDirty({})
    setSaved(true)
    toast('ok', 'Changes saved', 'Worksheet edits were saved to the local database.')
  }

  const exportCSV = () => {
    const rows = [cols.map(c => c[0])]
    list.forEach(r => {
      rows.push(cols.map(c => {
        const k = c[1]
        if (k === 'agesex') return r.age + ' / ' + r.sex
        if (k === 'summary') return recSummary(r)
        if (k === 'status' || k === 'immStatus' || k === 'maternalStatus') return recStatusOf(r)
        if (k === 'birthdate') { const res = db.residents.find(x => x.id === r.resId); return res ? res.birthdate : '' }
        let v = r[k]
        if (k === 'nhts') return v ? 'Yes' : 'No'
        return v == null ? '' : v
      }))
    })
    downloadCSV('BHW_HealthRecords_' + (tab === 'all' ? 'All' : tab), rows)
  }

  const deleteRec = id => {
    const r = db.records.find(x => x.id === id)
    if (!r) return
    confirmDialog({
      kind: 'danger',
      title: 'Delete health record ' + id + '?',
      message: 'The record for ' + r.resName + ' (' + r.cat + ') will be removed. This cannot be undone.',
      okLabel: 'Delete Record',
      onOK: () => {
        update(d => { d.records = d.records.filter(x => x.id !== id) })
        toast('ok', 'Record deleted', 'Health record ' + id + ' was removed.')
        setRecDetail(null)
      },
    })
  }

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  return (
    <section>
      <div className="toolbar">
        <div className="tb-search">
          <Icon name="search" />
          <input placeholder="Search resident name or Resident ID…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="tb-field"><span>Category</span>
          <select className="compact" value={cat} onChange={e => { setCat(e.target.value); setTab(e.target.value === 'general' ? 'general' : e.target.value) }}>
            <option value="all">All categories</option><option value="general">General</option>
            <option>Child Health</option><option>Maternal Health</option><option>Immunization</option>
            <option>Family Planning</option><option>Other Health Records</option>
          </select></div>
        <div className="tb-field"><span>Status</span>
          <select className="compact" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {['Active', 'Under Observation', 'Referred', 'Follow-up Required', 'Resolved', 'Completed', 'Scheduled', 'Pending', 'Missed Schedule', 'On Track', 'Due Soon', 'Overdue'].map(s => <option key={s}>{s}</option>)}
          </select></div>
        <div className="tb-right">
          <button className="btn btn-line" onClick={() => toast('ok', 'Refreshed', 'Health records updated.')}><Icon name="refresh" />Refresh</button>
          <button className="btn btn-ghost" onClick={() => { setSearch(''); setWsSearch(''); setCat('all'); setTab('all'); setStatus(''); toast('info', 'Filters cleared', 'Showing all records again.') }}><Icon name="filter" />Clear Filters</button>
          <button className="btn btn-ghost" onClick={exportCSV}><Icon name="export" />Export</button>
          <button className="btn btn-pri" onClick={() => setRecForm({ id: null, tab: tab === 'all' ? 'general' : tab, resId: null })}><Icon name="plus" />Add New Record</button>
        </div>
      </div>

      <div className="sheet-wrap">
        <div className="sheet-tabs">
          {REC_TABS.map(t => {
            const cnt = t.k === 'all' ? db.records.length : (counts[CAT_OF[t.k]] || 0)
            return (
              <button key={t.k} className={'sheet-tab' + (tab === t.k ? ' active' : '')} onClick={() => setTab(t.k)}>
                <Icon name={t.icon} />{t.name}<span className="cnt">{cnt}</span>
              </button>
            )
          })}
        </div>
        <div className="ws-toolbar">
          <div className="ws-name-box"><Icon name="sheet" /><span className="ws-name">{REC_TABS.find(t => t.k === tab).name} Worksheet</span></div>
          <div className="tb-search" style={{ minWidth: 190, flex: '0 1 240px' }}>
            <Icon name="search" />
            <input placeholder="Find in worksheet…" value={wsSearch} onChange={e => setWsSearch(e.target.value)} />
          </div>
          <div className="ws-tool" onClick={() => setRecForm({ id: null, tab: tab === 'all' ? 'general' : tab, resId: null })} title="Add new record in this category">
            <Icon name="plus" />New Row</div>
          <div className="ws-tool" onClick={() => toast('info', 'Sort', 'Column order follows the worksheet definition.')} title="Sort info">
            <Icon name="sort" />Sort</div>
          <div className="ws-tool" onClick={saveSheet} title="Save edits made in cells"><Icon name="save" />Save Changes</div>
          <div className="ws-tool" onClick={exportCSV} title="Download CSV copy"><Icon name="export" />Export</div>
          <span className="ws-hint" style={{ marginLeft: 'auto' }}>Click a cell to edit &middot; fields with <span style={{ color: 'var(--warn)' }}>amber</span> focus are editable</span>
        </div>
        <div className="ws-body">
          <table className="grid-table">
            <thead><tr>
              <th className="rownum">#</th>
              {cols.map((c, i) => <th key={c[1]} style={{ minWidth: c[2] }}>{c[0]}<span className="col-letter">{letters[i]}</span></th>)}
              <th>Actions</th>
            </tr></thead>
            <tbody>
              {list.length ? list.map((r, ri) => (
                <tr className="data-row" key={r.id}>
                  <td className="rownum">{ri + 1}</td>
                  {cols.map(c => {
                    const [header, key, w, type] = c
                    if (key === 'agesex') return <td key={key} className="cell auto">{r.age + ' · ' + r.sex}</td>
                    if (key === 'summary') return <td key={key} className="cell auto">{recSummary(r)}</td>
                    if (key === 'status' || key === 'immStatus' || key === 'maternalStatus')
                      return <td key={key} className="cell"><StatusPill s={recStatusOf(r)} /></td>
                    if (key === 'birthdate') {
                      const res = db.residents.find(x => x.id === r.resId)
                      return <td key={key} className="cell auto">{fmtDate(res ? res.birthdate : '—')}</td>
                    }
                    let val = r[key]
                    if (val === undefined || val === null) val = ''
                    if (key === 'nhts') val = val ? 'Yes' : 'No'
                    if (type === 'ro' || key === 'cat' || key === 'resName' || key === 'resId' || key === 'id' || key === 'hhId' || key === 'age' || key === 'sex')
                      return <td key={key} className="cell auto"><span className="ro">{val}</span></td>
                    const isDirty = dirty[r.id]
                    if (type === 'date') return (
                      <td key={key} className={'cell editable' + (isDirty ? ' dirty' : '')}>
                        <input type="date" value={val} onChange={e => cellEdited(r.id, key, e.target.value)} />
                      </td>
                    )
                    if (type && type.startsWith('sel:')) {
                      const opts = type.slice(4).split('|')
                      return (
                        <td key={key} className={'cell editable' + (isDirty ? ' dirty' : '')}>
                          <select value={String(val)} onChange={e => cellEdited(r.id, key, e.target.value)}>
                            {opts.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </td>
                      )
                    }
                    if (type === 'num') return (
                      <td key={key} className={'cell editable' + (isDirty ? ' dirty' : '')}>
                        <input type="number" step="0.1" value={val} onChange={e => cellEdited(r.id, key, e.target.value)} />
                      </td>
                    )
                    return (
                      <td key={key} className={'cell editable' + (isDirty ? ' dirty' : '')}>
                        <input type="text" value={val} onChange={e => cellEdited(r.id, key, e.target.value)} />
                      </td>
                    )
                  })}
                  <td className="cell" style={{ whiteSpace: 'nowrap' }}>
                    <div className="actions">
                      <button className="icon-btn" title="View details" onClick={() => setRecDetail(r.id)}><Icon name="eye" /></button>
                      <button className="icon-btn" title="Edit record" onClick={() => setRecForm({ id: r.id, tab: tabOf(r.cat) })}><Icon name="edit" /></button>
                      <button className="icon-btn del" title="Delete record" onClick={() => deleteRec(r.id)}><Icon name="trash" /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr className="data-row"><td className="cell" colSpan={cols.length + 2}>
                  <div className="tbl-empty"><Icon name="sheet" /><b>No records in this worksheet</b><span>Add a new record or switch category tabs.</span></div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="ws-foot">
          <div className="ws-status"><span className={'dot ' + (saved ? 'saved' : 'dirty2')}></span><span>{saved ? 'All changes saved' : 'Unsaved changes in worksheet'}</span></div>
          <span className="ws-hint">{list.length + ' record(s) shown · ' + cols.length + ' columns'}</span>
          <span className="ws-hint" style={{ marginLeft: 'auto' }}>BHW Connect &middot; Centralized Health Records</span>
        </div>
      </div>

      <RecordsModals
        recForm={recForm} setRecForm={setRecForm}
        recDetail={recDetail} setRecDetail={setRecDetail}
        deleteRec={deleteRec}
      />
    </section>
  )
}

/* ============ Record form + detail modals ============ */
function RecordsModals({ recForm, setRecForm, recDetail, setRecDetail, deleteRec }) {
  const { db, update, addActivity } = useStore()
  const { openModal, toast } = useNav()

  /* ---------- record form (add/edit, per-category) ---------- */
  if (recForm) {
    const r = recForm.id ? db.records.find(x => x.id === recForm.id) : null
    const tab = r ? tabOf(r.cat) : recForm.tab
    const tabDef = FORM_TABS.find(t => t.k === tab) || FORM_TABS[0]
    const nextId = r ? r.id : padId(db.counters.rec, tabDef.prefix)
    const residents = [...db.residents].sort((a, b) => a.name.localeCompare(b.name))
    if (!recForm.data) {
      recForm.data = { resId: r ? r.resId : (recForm.resId || residents[0]?.id || '') }
      recForm.fields = r ? { ...r } : null
    }
    const data = recForm.data
    const chosen = db.residents.find(x => x.id === data.resId)
    const setField = (k, v) => setRecForm({ ...recForm, data: { ...data, [k]: v } })
    // existing record values (for edit) or defaults
    const V = (k, def) => r ? (r[k] ?? '') : (recForm.fields?.[k] ?? def ?? '')

    const save = () => {
      const res = db.residents.find(x => x.id === data.resId)
      if (!res) { toast('err', 'Resident required', 'Select a registered resident first.'); return }
      const rec = { resId: res.id, resName: res.name, hhId: res.hhId, age: age(res.birthdate), sex: res.sex }
      if (tab === 'general' || tab === 'other') {
        Object.assign(rec, {
          cat: 'Other Health Records', otherCat: V('otherCat', 'General Consultation'), dateRecorded: V('dateRecorded', today()) || today(),
          condition: V('condition'), info: V('info'), status: V('status', 'Active'), followUp: V('followUp'), remarks: V('remarks'),
        })
        if (!rec.condition) { toast('err', 'Health condition required', 'Describe the condition or concern.'); return }
      } else if (tab === 'child') {
        Object.assign(rec, {
          cat: 'Child Health', weight: parseFloat(V('weight')) || 0, height: parseFloat(V('height')) || 0,
          measureDate: V('measureDate', today()) || today(), growth: V('growth', 'Normal'), vita: V('vita', 'Given (full dose)'),
          deworm: V('deworm', 'Given'), feeding: V('feeding'), notes: V('notes'), nextMon: V('nextMon'), remarks: V('remarks'), status: V('status', 'Active'),
        })
        if (!rec.weight || !rec.height) { toast('err', 'Measurements required', 'Enter weight (kg) and height (cm).'); return }
      } else if (tab === 'maternal') {
        Object.assign(rec, {
          cat: 'Maternal Health', pregStatus: V('pregStatus', PREG_STATUS[0]), regDate: V('regDate', today()) || today(),
          edd: V('edd'), pregInfo: V('pregInfo'), prenatalDate: V('prenatalDate'), prenatalDetails: V('prenatalDetails'),
          bp: V('bp'), notes: V('notes'), followUp: V('followUp'), maternalStatus: V('maternalStatus', 'On Track'), remarks: V('remarks'),
          status: V('maternalStatus') === 'Completed' ? 'Completed' : 'Active',
        })
      } else if (tab === 'imm') {
        Object.assign(rec, {
          cat: 'Immunization', vaccine: V('vaccine', VACCINES[0]), vacCat: V('vacCat', VACCINE_CATS[0]), dose: +(V('dose', 1)) || 1,
          dateAdmin: V('dateAdmin', today()) || today(), administeredBy: V('administeredBy', 'RHM Sheila Mae I. Uy, RM'),
          nextSched: V('nextSched'), immStatus: V('immStatus', 'Scheduled'), remarks: V('remarks'),
          status: V('immStatus') === 'Completed' ? 'Completed' : 'Active',
        })
      } else if (tab === 'fp') {
        Object.assign(rec, {
          cat: 'Family Planning', method: V('method', FP_METHODS[2]), regDate: V('regDate', today()) || today(),
          methodStart: V('methodStart'), lastVisit: V('lastVisit'), followUp: V('followUp'),
          fpStatus: V('fpStatus', 'New Acceptor'), nhts: V('nhts', 'Yes') === 'Yes', visitInfo: V('visitInfo'), remarks: V('remarks'),
          status: 'Active',
        })
      }
      if (r) {
        update(d => { Object.assign(d.records.find(x => x.id === r.id), rec) })
        addActivity('record', 'Health Record Updated — ' + rec.cat, rec.resName)
        toast('ok', 'Record updated', 'Health record ' + r.id + ' saved.')
      } else {
        const prefix = { 'Child Health': 'CHR-', 'Maternal Health': 'MHR-', 'Immunization': 'IMR-', 'Family Planning': 'FPR-', 'Other Health Records': 'OHR-' }[rec.cat]
        let newId = ''
        update(d => {
          const rr = Object.assign({ id: padId(d.counters.rec, prefix), dateRecorded: today() }, rec)
          d.records.push(rr); d.counters.rec++
          newId = rr.id
        })
        addActivity('record', 'Health Record added — ' + rec.cat, rec.resName)
        toast('ok', 'Record saved', 'New ' + rec.cat + ' record ' + newId + ' created for ' + rec.resName + '.')
      }
      setRecForm(null)
    }

    const F = (label, k, type = 'text', opts, def) => (
      <div key={k}>
        <label>{label.includes('*') ? label : <>{label}</>}</label>
        {type === 'sel'
          ? <select value={String(V(k, def))} onChange={e => setField(k, e.target.value)}>{opts.map(o => <option key={o}>{o}</option>)}</select>
          : type === 'date'
            ? <input type="date" value={V(k, def) || ''} onChange={e => setField(k, e.target.value)} />
            : type === 'num'
              ? <input type="number" step="0.1" value={V(k, def) || ''} onChange={e => setField(k, e.target.value)} />
              : <input value={V(k, def) || ''} onChange={e => setField(k, e.target.value)} />}
      </div>
    )
    const TA = (label, k, ph) => (
      <div className="full" key={k}>
        <label>{label}</label>
        <textarea rows={2} placeholder={ph || ''} value={V(k) || ''} onChange={e => setField(k, e.target.value)} />
      </div>
    )

    // store edits in recForm.fields so V() picks them up (edit mode merges)
    const setFieldWrapped = (k, v) => {
      recForm.fields = { ...(recForm.fields || {}), [k]: v }
      setRecForm({ ...recForm, data: { ...data }, fields: recForm.fields })
      V.dirty = true
    }
    // NOTE: form fields must write through setFieldWrapped; redefine helpers:
    const FW = (label, k, type = 'text', opts, def) => (
      <div key={k}>
        <label>{label}</label>
        {type === 'sel'
          ? <select value={String(getVal(k, def))} onChange={e => setFieldWrapped(k, e.target.value)}>{opts.map(o => <option key={o}>{o}</option>)}</select>
          : type === 'date'
            ? <input type="date" value={getVal(k, def) || ''} onChange={e => setFieldWrapped(k, e.target.value)} />
            : type === 'num'
              ? <input type="number" step="0.1" value={getVal(k, def) || ''} onChange={e => setFieldWrapped(k, e.target.value)} />
              : <input placeholder="auto" value={getVal(k, def) || ''} onChange={e => setFieldWrapped(k, e.target.value)} />}
      </div>
    )
    function getVal(k, def) {
      if (recForm.fields && recForm.fields[k] !== undefined) return recForm.fields[k]
      if (r && r[k] !== undefined) return r[k]
      return def !== undefined ? def : ''
    }

    const residentBlock = (
      <>
        <div className="f-hr">RESIDENT INFORMATION</div>
        <div><label>Record ID</label><input value={nextId} readOnly /></div>
        <div><label>Resident ID / Name <span className="req">*</span></label>
          <select value={data.resId} onChange={e => setField('resId', e.target.value)}>
            {residents.map(x => <option key={x.id} value={x.id}>{x.name + ' — ' + x.id}</option>)}
          </select>
          <div className="auto-fill"><Icon name="search" />Search or select a registered resident</div>
        </div>
        <div><label>Resident Name</label><input readOnly placeholder="Auto-displayed" value={chosen ? chosen.name : ''} /></div>
        <div><label>Household ID</label><input readOnly placeholder="Auto-linked" value={chosen ? chosen.hhId : ''} /></div>
        <div><label>Age</label><input readOnly placeholder="Auto" value={chosen ? age(chosen.birthdate) : ''} /></div>
        <div><label>Sex</label><input readOnly placeholder="Auto" value={chosen ? chosen.sex : ''} /></div>
      </>
    )

    let fields = null
    if (tab === 'general' || tab === 'other') {
      fields = <>
        <div className="f-hr">HEALTH RECORD DETAILS</div>
        {FW('Health Category', 'otherCat', 'sel', ['Chronic Disease', 'Injury', 'Nutrition', 'Infectious Disease', 'General Consultation'], 'General Consultation')}
        {FW('Date Recorded', 'dateRecorded', 'date', null, today())}
        {FW('Health Condition *', 'condition', 'text', null, '')}
        <div className="full"><label>Health Information / Findings</label>
          <textarea rows={3} value={getVal('info') || ''} onChange={e => setFieldWrapped('info', e.target.value)} placeholder="Detailed health-related information" /></div>
        {FW('Health Status', 'status', 'sel', HEALTH_STATUS, 'Active')}
        {FW('Follow-up Date', 'followUp', 'date')}
        <div className="full"><label>Remarks</label>
          <textarea rows={2} value={getVal('remarks') || ''} onChange={e => setFieldWrapped('remarks', e.target.value)} /></div>
      </>
    } else if (tab === 'child') {
      fields = <>
        <div className="f-hr">GROWTH MEASUREMENT</div>
        <div><label>Birthdate</label><input readOnly placeholder="Auto from profile" value={chosen ? fmtDate(chosen.birthdate) : ''} /></div>
        {FW('Weight (kg) *', 'weight', 'num')}
        {FW('Height (cm) *', 'height', 'num')}
        {FW('Measurement Date', 'measureDate', 'date', null, today())}
        {FW('Growth Status', 'growth', 'sel', GROWTH_STATUS, 'Normal')}
        {FW('Vitamin A Status', 'vita', 'sel', VITA_STATUS, 'Given (full dose)')}
        {FW('Deworming Status', 'deworm', 'sel', DEWORM_STATUS, 'Given')}
        {FW('Feeding Information', 'feeding')}
        {FW('Next Monitoring Date', 'nextMon', 'date')}
        <div className="full"><label>Health Notes</label>
          <textarea rows={2} value={getVal('notes') || ''} onChange={e => setFieldWrapped('notes', e.target.value)} /></div>
        {FW('Record Status', 'status', 'sel', HEALTH_STATUS, 'Active')}
        <div className="full"><label>Remarks</label>
          <textarea rows={2} value={getVal('remarks') || ''} onChange={e => setFieldWrapped('remarks', e.target.value)} /></div>
      </>
    } else if (tab === 'maternal') {
      fields = <>
        <div className="f-hr">MATERNAL INFORMATION</div>
        {FW('Pregnancy Status', 'pregStatus', 'sel', PREG_STATUS, PREG_STATUS[0])}
        {FW('Registration Date', 'regDate', 'date', null, today())}
        {FW('Estimated Delivery Date', 'edd', 'date')}
        {FW('Blood Pressure', 'bp')}
        <div className="full"><label>Pregnancy Information</label>
          <textarea rows={2} value={getVal('pregInfo') || ''} onChange={e => setFieldWrapped('pregInfo', e.target.value)} /></div>
        {FW('Prenatal Visit Date', 'prenatalDate', 'date')}
        {FW('Follow-up Date', 'followUp', 'date')}
        <div className="full"><label>Prenatal Visit Details</label>
          <textarea rows={2} value={getVal('prenatalDetails') || ''} onChange={e => setFieldWrapped('prenatalDetails', e.target.value)} /></div>
        {FW('Maternal Status', 'maternalStatus', 'sel', MON_STATUS, 'On Track')}
        <div className="full"><label>Health Notes</label>
          <textarea rows={2} value={getVal('notes') || ''} onChange={e => setFieldWrapped('notes', e.target.value)} /></div>
        <div className="full"><label>Remarks</label>
          <textarea rows={2} value={getVal('remarks') || ''} onChange={e => setFieldWrapped('remarks', e.target.value)} /></div>
      </>
    } else if (tab === 'imm') {
      fields = <>
        <div className="f-hr">VACCINATION DETAILS</div>
        <div><label>Birthdate</label><input readOnly placeholder="Auto from profile" value={chosen ? fmtDate(chosen.birthdate) : ''} /></div>
        {FW('Vaccine Name *', 'vaccine', 'sel', VACCINES, VACCINES[0])}
        {FW('Vaccine Category', 'vacCat', 'sel', VACCINE_CATS, VACCINE_CATS[0])}
        {FW('Dose Number', 'dose', 'num', null, 1)}
        {FW('Date Administered', 'dateAdmin', 'date', null, today())}
        {FW('Next Schedule', 'nextSched', 'date')}
        {FW('Administered By', 'administeredBy', 'text', null, 'RHM Sheila Mae I. Uy, RM')}
        {FW('Immunization Status', 'immStatus', 'sel', IMM_STATUS, 'Scheduled')}
        <div className="full"><label>Remarks</label>
          <textarea rows={2} value={getVal('remarks') || ''} onChange={e => setFieldWrapped('remarks', e.target.value)} /></div>
      </>
    } else if (tab === 'fp') {
      fields = <>
        <div className="f-hr">FAMILY PLANNING DETAILS</div>
        {FW('FP Method *', 'method', 'sel', FP_METHODS, FP_METHODS[2])}
        {FW('Registration Date', 'regDate', 'date', null, today())}
        {FW('Method Start Date', 'methodStart', 'date')}
        {FW('Last Visit', 'lastVisit', 'date')}
        {FW('Follow-up Date', 'followUp', 'date')}
        {FW('FP Status', 'fpStatus', 'sel', ['New Acceptor', 'Current User', 'Drop-out', 'Follow-up'], 'New Acceptor')}
        {FW('NHTS Member?', 'nhts', 'sel', ['Yes', 'No'], 'Yes')}
        <div className="full"><label>Visit Information</label>
          <textarea rows={2} value={getVal('visitInfo') || ''} onChange={e => setFieldWrapped('visitInfo', e.target.value)} /></div>
        <div className="full"><label>Remarks</label>
          <textarea rows={2} value={getVal('remarks') || ''} onChange={e => setFieldWrapped('remarks', e.target.value)} /></div>
      </>
    }

    return <Modal modal={{
      title: r ? 'Edit Health Record — ' + r.id : 'Add New Health Record',
      sub: r ? 'Modify the record for ' + r.resName : 'Choose a category tab, then fill in the record',
      icon: r ? 'edit' : 'health',
      body: (
        <div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {FORM_TABS.map(t => (
              <button key={t.k} type="button" className={'pn-btn' + (t.k === tab ? ' active' : '')}
                style={{ padding: '7px 13px', fontSize: '.78rem' }}
                onClick={() => setRecForm({ id: null, tab: t.k, resId: data.resId, fields: null })}>
                <Icon name={t.icon} />{t.name}
              </button>
            ))}
          </div>
          <div className="form-grid">
            {residentBlock}
            {fields}
          </div>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-line" onClick={() => { setRecForm(null); }}><Icon name="x" />Cancel</button>
          <button className="btn btn-pri" onClick={save}><Icon name="save" />Save Record</button>
        </>
      ),
    }} onClose={() => setRecForm(null)} />
  }

  /* ---------- record detail modal ---------- */
  if (recDetail) {
    const r = db.records.find(x => x.id === recDetail)
    if (!r) { setRecDetail(null); return null }
    const res = db.residents.find(x => x.id === r.resId)
    const g = []
    g.push(<DV key="id" k="Record ID" v={r.id} mono />)
    g.push(<DV key="cat" k="Health Category" v={<span className="tag">{r.cat}</span>} />)
    g.push(<DV key="resid" k="Resident ID" v={r.resId} mono />)
    g.push(<DV key="resname" k="Resident Name" v={r.resName} />)
    g.push(<DV key="hh" k="Household ID" v={r.hhId || '—'} mono />)
    if (res) {
      g.push(<DV key="bd" k="Birthdate" v={fmtDate(res.birthdate)} />)
      g.push(<DV key="agesex" k="Age / Sex" v={age(res.birthdate) + ' · ' + res.sex} />)
    }
    if (r.cat === 'Child Health') {
      g.push(<DV key="w" k="Weight" v={r.weight + ' kg'} />)
      g.push(<DV key="h" k="Height" v={r.height + ' cm'} />)
      g.push(<DV key="md" k="Measurement Date" v={fmtDate(r.measureDate)} />)
      g.push(<DV key="gr" k="Growth Status" v={<span className="tag">{r.growth}</span>} />)
      g.push(<DV key="va" k="Vitamin A Status" v={<span className="tag">{r.vita}</span>} />)
      g.push(<DV key="dw" k="Deworming Status" v={<span className="tag">{r.deworm}</span>} />)
      g.push(<DV key="fd" k="Feeding Information" v={r.feeding || '—'} />)
      g.push(<DV key="nm" k="Next Monitoring Date" v={fmtDate(r.nextMon)} />)
    }
    if (r.cat === 'Maternal Health') {
      g.push(<DV key="ps" k="Pregnancy Status" v={r.pregStatus} />)
      g.push(<DV key="rd" k="Registration Date" v={fmtDate(r.regDate)} />)
      g.push(<DV key="edd" k="Estimated Delivery Date" v={r.edd ? fmtDate(r.edd) : '—'} />)
      g.push(<DV key="pd" k="Prenatal Visit Date" v={fmtDate(r.prenatalDate)} />)
      g.push(<DV key="pdd" k="Prenatal Details" v={r.prenatalDetails} />)
      g.push(<DV key="bp" k="Blood Pressure" v={r.bp || '—'} />)
      g.push(<DV key="fu" k="Follow-up Date" v={fmtDate(r.followUp)} />)
      g.push(<DV key="ms" k="Maternal Status" v={<StatusPill s={r.maternalStatus || '—'} />} />)
    }
    if (r.cat === 'Immunization') {
      g.push(<DV key="vac" k="Vaccine" v={r.vaccine} />)
      g.push(<DV key="vc" k="Vaccine Category" v={r.vacCat} />)
      g.push(<DV key="dose" k="Dose Number" v={String(r.dose)} />)
      g.push(<DV key="da" k="Date Administered" v={fmtDate(r.dateAdmin)} />)
      g.push(<DV key="by" k="Administered By" v={r.administeredBy || '—'} />)
      g.push(<DV key="ns" k="Next Schedule" v={fmtDate(r.nextSched)} />)
      g.push(<DV key="is" k="Immunization Status" v={<StatusPill s={r.immStatus} />} />)
    }
    if (r.cat === 'Family Planning') {
      g.push(<DV key="m" k="FP Method" v={r.method} />)
      g.push(<DV key="rd2" k="Registration Date" v={fmtDate(r.regDate)} />)
      g.push(<DV key="msd" k="Method Start Date" v={fmtDate(r.methodStart)} />)
      g.push(<DV key="lv" k="Last Visit" v={fmtDate(r.lastVisit)} />)
      g.push(<DV key="fu2" k="Follow-up Date" v={fmtDate(r.followUp)} />)
      g.push(<DV key="fs" k="FP Status" v={r.fpStatus} />)
      g.push(<DV key="nh" k="NHTS Member" v={r.nhts ? 'Yes' : 'No'} />)
      g.push(<DV key="vi" k="Visit Information" v={r.visitInfo || '—'} />)
    }
    if (r.cat === 'Other Health Records') {
      g.push(<DV key="oc" k="Health Record Category" v={r.otherCat} />)
      g.push(<DV key="dr" k="Date Recorded" v={fmtDate(r.dateRecorded)} />)
      g.push(<DV key="cond" k="Health Condition" v={r.condition} />)
      g.push(<DV key="info" k="Health Information / Findings" v={r.info} />)
      g.push(<DV key="hs" k="Health Status" v={<StatusPill s={r.status} />} />)
      g.push(<DV key="fu3" k="Follow-up Date" v={fmtDate(r.followUp)} />)
    }
    if (r.remarks) g.push(<DV key="rem" k="Remarks" v={r.remarks} />)
    g.push(<DV key="st" k="Record Status" v={<StatusPill s={recStatusOf(r)} />} />)

    return <Modal modal={{
      title: 'Health Record — ' + r.id,
      sub: r.cat + ' · ' + r.resName,
      icon: 'health',
      body: <div className="detail-grid">{g}</div>,
      footer: (
        <>
          <button className="btn btn-line" onClick={() => { setRecDetail(null); }}><Icon name="x" />Close</button>
          <button className="btn btn-ghost" onClick={() => { setRecDetail(null); setRecForm({ id: r.id, tab: tabOf(r.cat) }) }}><Icon name="edit" />Edit Record</button>
          <button className="btn btn-danger" onClick={() => { setRecDetail(null); deleteRec(r.id) }}><Icon name="trash" />Delete Record</button>
        </>
      ),
    }} onClose={() => setRecDetail(null)} />
  }

  return null
}
