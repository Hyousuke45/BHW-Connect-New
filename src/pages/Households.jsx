// Household Management: toolbar filters, table, pagination, household profile,
// household form, member form, member profile — all in React state
import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { useStore, toast } from '../store'
import { useNav } from '../App'
import { StatusPill, DV, downloadCSV, Modal } from '../ui'
import { fmtDate, age, ageYears, hhAddress, padId, today } from '../utils'
import { PUROKS, RELATIONS, CIVIL } from '../constants'

/* ============ Cross-page openers (events) ============ */
export function openHouseholdForm(id) {
  window.dispatchEvent(new CustomEvent('open-hh-form', { detail: { id } }))
}
export function openHouseholdDetail(id) {
  window.dispatchEvent(new CustomEvent('open-hh-detail', { detail: { id } }))
}
export function openMemberPicker() {
  window.dispatchEvent(new CustomEvent('open-member-picker'))
}
export function openMemberForm(resId, hhId) {
  window.dispatchEvent(new CustomEvent('open-member-form', { detail: { resId, hhId } }))
}
export function openMemberProfile(resId) {
  window.dispatchEvent(new CustomEvent('open-member-profile', { detail: { resId } }))
}

/* ============ Page ============ */
export default function Households() {
  const { db } = useStore()
  const [search, setSearch] = useState('')
  const [purok, setPurok] = useState('')
  const [dateRange, setDateRange] = useState('')
  const [sort, setSort] = useState('id')
  const [per, setPer] = useState(10)
  const [pageNo, setPageNo] = useState(1)

  const list = useMemo(() => {
    const q = search.toLowerCase()
    const memberCount = {}
    db.residents.forEach(r => { memberCount[r.hhId] = (memberCount[r.hhId] || 0) + 1 })
    const l = db.households.filter(h => {
      if (purok && h.purok !== purok) return false
      if (dateRange) {
        const days = Math.round((new Date(h.dateReg + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000)
        if (-days > +dateRange) return false
      }
      if (q && !(h.id.toLowerCase().includes(q) || h.head.toLowerCase().includes(q) ||
        (h.street || '').toLowerCase().includes(q) || h.houseNum.toLowerCase().includes(q))) return false
      return true
    }).map(h => ({ ...h, _members: memberCount[h.id] || 0 }))
    switch (sort) {
      case 'name': l.sort((a, b) => a.head.localeCompare(b.head)); break
      case 'date-desc': l.sort((a, b) => (a.dateReg < b.dateReg ? 1 : -1)); break
      case 'date-asc': l.sort((a, b) => (a.dateReg < b.dateReg ? -1 : 1)); break
      case 'members': l.sort((a, b) => b._members - a._members); break
      default: l.sort((a, b) => a.id.localeCompare(b.id))
    }
    return l
  }, [db.households, db.residents, search, purok, dateRange, sort])

  const pages = Math.max(1, Math.ceil(list.length / per))
  const pageNoSafe = Math.min(pageNo, pages)
  const start = (pageNoSafe - 1) * per
  const rows = list.slice(start, start + per)

  const shown = []
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - pageNoSafe) <= 1) shown.push(p)
    else if (shown[shown.length - 1] !== '…') shown.push('…')
  }

  const exportCSV = () => {
    const rowsOut = [['Household ID', 'Household Head', 'House No', 'Street', 'Barangay', 'Purok', 'Members', 'Contact', 'Date Registered', 'Remarks']]
    db.households.forEach(h => {
      rowsOut.push([h.id, h.head, h.houseNum, h.street, h.barangay, h.purok, db.residents.filter(r => r.hhId === h.id).length, h.contact, h.dateReg, h.remarks])
    })
    downloadCSV('BHW_Households', rowsOut)
  }

  return (
    <section>
      <div className="toolbar">
        <div className="tb-search">
          <Icon name="search" />
          <input placeholder="Search Household ID, head, or address…" value={search} onChange={e => { setSearch(e.target.value); setPageNo(1) }} />
        </div>
        <div className="tb-field"><span>Purok</span>
          <select className="compact" value={purok} onChange={e => { setPurok(e.target.value); setPageNo(1) }}>
            <option value="">All puroks</option>
            {PUROKS.map(p => <option key={p}>{p}</option>)}
          </select></div>
        <div className="tb-field"><span>Registered</span>
          <select className="compact" value={dateRange} onChange={e => { setDateRange(e.target.value); setPageNo(1) }}>
            <option value="">All dates</option><option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option><option value="90">Last 90 days</option>
          </select></div>
        <div className="tb-field"><span>Sort</span>
          <select className="compact" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="id">Household ID</option><option value="name">Head (A-Z)</option>
            <option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option>
            <option value="members">Most members</option>
          </select></div>
        <div className="tb-field"><span>Entries</span>
          <select className="compact" value={per} onChange={e => { setPer(+e.target.value); setPageNo(1) }}>
            <option>5</option><option>10</option><option>25</option><option>50</option>
          </select></div>
        <div className="tb-right">
          <button className="btn btn-line" onClick={() => toast('ok', 'Refreshed', 'Household list updated.')}><Icon name="refresh" />Refresh</button>
          <button className="btn btn-ghost" onClick={exportCSV}><Icon name="export" />Export</button>
          <button className="btn btn-pri" onClick={() => openHouseholdForm(null)}><Icon name="plus" />Add Household</button>
        </div>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table className="tbl">
            <thead><tr>
              <th>Household ID</th><th>Household Head</th><th>Address</th><th>Purok/Area</th>
              <th style={{ textAlign: 'center' }}>Members</th><th>Contact Number</th><th>Date Registered</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {rows.length ? rows.map(h => (
                <tr className="click" key={h.id} onClick={() => openHouseholdDetail(h.id)}>
                  <td className="idc">{h.id}</td>
                  <td><b>{h.head}</b></td>
                  <td>{(h.houseNum ? h.houseNum + ', ' : '') + h.street}</td>
                  <td><span className="tag">{h.purok}</span></td>
                  <td style={{ textAlign: 'center' }}><b>{h._members}</b></td>
                  <td>{h.contact}</td>
                  <td>{fmtDate(h.dateReg)}</td>
                  <td>
                    <div className="actions">
                      <button className="icon-btn" title="View household" onClick={e => { e.stopPropagation(); openHouseholdDetail(h.id) }}><Icon name="eye" /></button>
                      <button className="icon-btn" title="Edit household" onClick={e => { e.stopPropagation(); openHouseholdForm(h.id) }}><Icon name="edit" /></button>
                      <button className="icon-btn" title="Add member" onClick={e => { e.stopPropagation(); openMemberForm(null, h.id) }}><Icon name="plus" /></button>
                      <button className="icon-btn del" title="Delete household" onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('delete-hh', { detail: { id: h.id } })) }}><Icon name="trash" /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8}><div className="tbl-empty"><Icon name="home" /><b>No households found</b><span>Try adjusting your search or filters, or register a new household.</span></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span className="info">{list.length ? 'Showing ' + (start + 1) + '–' + Math.min(start + per, list.length) + ' of ' + list.length + ' households' : '0 households'}</span>
          <div className="pages">
            <button className="pg-btn" disabled={pageNoSafe <= 1} onClick={() => setPageNo(pageNoSafe - 1)}><Icon name="chevL" /></button>
            {shown.map((p, i) => p === '…'
              ? <span key={'e' + i} className="pg-dots">…</span>
              : <button key={p} className={'pg-btn' + (p === pageNoSafe ? ' cur' : '')} onClick={() => setPageNo(p)}>{p}</button>)}
            <button className="pg-btn" disabled={pageNoSafe >= pages} onClick={() => setPageNo(pageNoSafe + 1)}><Icon name="chevR" /></button>
          </div>
        </div>
      </div>

      <HouseholdModals />
    </section>
  )
}

/* ============ Modals host (detail / forms / profiles) ============ */
function HouseholdModals() {
  const { db, update, addActivity } = useStore()
  const { confirmDialog, go } = useNav()
  const { openModal } = useNav()
  const [, force] = useState(0)

  const [hhForm, setHhForm] = useState(null) // {id?}
  const [hhDetail, setHhDetail] = useState(null) // id
  const [memForm, setMemForm] = useState(null) // {resId?, hhId?}
  const [memProfile, setMemProfile] = useState(null) // resId
  const [pickerOn, setPickerOn] = useState(false)
  const [pickHH, setPickHH] = useState('')

  // cross-page openers + delete requests from the table
  useEffect(() => {
    const handlers = [
      ['open-hh-form', e => setHhForm(e.detail || {})],
      ['open-hh-detail', e => setHhDetail(e.detail.id)],
      ['open-member-form', e => setMemForm(e.detail || {})],
      ['open-member-profile', e => setMemProfile(e.detail.resId)],
      ['open-member-picker', () => { setPickerOn(true); setPickHH(db.households[0] ? db.households[0].id : '') }],
      ['delete-hh', e => deleteHH(e.detail.id)],
    ]
    const offs = handlers.map(([name, fn]) => {
      const h = e => fn(e)
      window.addEventListener(name, h)
      return () => window.removeEventListener(name, h)
    })
    return () => offs.forEach(off => off())
  })

  const hhMembers = id => db.residents.filter(r => r.hhId === id).length

  function deleteHH(id) {
    const h = db.households.find(x => x.id === id)
    if (!h) return
    const n = hhMembers(id)
    confirmDialog({
      kind: 'danger',
      title: 'Delete household ' + id + '?',
      message: 'This will remove the household and its ' + n + ' registered member(s), along with linked health and monitoring records. This cannot be undone.',
      okLabel: 'Delete Household',
      onOK: () => {
        update(d => {
          d.residents = d.residents.filter(r => r.hhId !== id)
          d.records = d.records.filter(r => r.hhId !== id)
          d.monitoring = d.monitoring.filter(m => m.hhId !== id)
          d.households = d.households.filter(x => x.id !== id)
        })
        addActivity('household', 'Household deleted', h.head)
        toast('ok', 'Household deleted', 'Household ' + id + ' and linked records were removed.')
      },
    })
  }

  function removeMember(resId) {
    const r = db.residents.find(x => x.id === resId)
    if (!r) return
    confirmDialog({
      kind: 'danger',
      title: 'Remove resident ' + r.id + '?',
      message: r.name + ' will be removed from household ' + r.hhId + '. Linked health records stay in Centralized Health Records.',
      okLabel: 'Remove Member',
      onOK: () => {
        update(d => { d.residents = d.residents.filter(x => x.id !== resId) })
        addActivity('member', 'Member removed from household', r.name)
        toast('ok', 'Member removed', r.name + ' was removed from the household list.')
        setMemProfile(null)
        force(v => v + 1)
      },
    })
  }

  /* ---------- Household form modal ---------- */
  if (hhForm) {
    const h = hhForm.id ? db.households.find(x => x.id === hhForm.id) : null
    const nextId = h ? h.id : padId(db.counters.hh, 'HH-')
    if (!hhForm.data) hhForm.data = {
      head: h ? h.head : '', houseNum: h ? h.houseNum : '', street: h ? h.street : '',
      barangay: h ? h.barangay : 'Brgy. Banlag', purok: h ? h.purok : PUROKS[0],
      contact: h ? h.contact : '', dateReg: h ? h.dateReg : today(), remarks: h ? h.remarks : '',
    }
    const data = hhForm.data
    const setField = (k, v) => setHhForm({ ...hhForm, data: { ...data, [k]: v } })

    const save = thenMembers => {
      if (!data.head.trim()) { toast('err', 'Household head required', 'Enter the full name of the household head.'); return }
      let newId = null
      update(d => {
        if (h) {
          Object.assign(d.households.find(x => x.id === h.id), data)
        } else {
          const hh = Object.assign({ id: padId(d.counters.hh, 'HH-') }, data)
          d.households.push(hh); d.counters.hh++
          newId = hh.id
        }
      })
      addActivity('household', h ? 'Household information updated' : 'Household Added — newly registered', data.head)
      setHhForm(null)
      if (thenMembers && newId) {
        toast('ok', 'Household saved', 'Now register the first members of ' + newId + '.')
        setMemForm({ resId: null, hhId: newId })
      } else if (h) {
        toast('ok', 'Household updated', 'Changes saved for ' + h.id + '.')
      } else {
        toast('ok', 'Household registered', 'Household ' + newId + ' (' + data.head + ') saved.')
      }
    }

    return <Modal modal={{
      title: h ? 'Edit Household' : 'Register New Household',
      sub: h ? 'Update household information — ' + h.id : 'The Household ID is generated automatically',
      icon: h ? 'edit' : 'home',
      body: (
        <form className="form-grid" onSubmit={e => { e.preventDefault(); save(false) }}>
          <div className="full f-note"><Icon name="info" />Fields marked <span className="req">*</span> are required. Number of Members is computed automatically from registered residents.</div>
          <div><label>Household ID</label><input value={nextId} readOnly /><div className="auto-fill"><Icon name="lock" />Automatically generated</div></div>
          <div><label>Household Head <span className="req">*</span></label><input required value={data.head} onChange={e => setField('head', e.target.value)} placeholder="Full name of household head" /></div>
          <div><label>House Number</label><input value={data.houseNum} onChange={e => setField('houseNum', e.target.value)} placeholder="e.g. BLK 4 LT 12" /></div>
          <div><label>Street / Location <span className="req">*</span></label><input required value={data.street} onChange={e => setField('street', e.target.value)} placeholder="Street or sitio" /></div>
          <div><label>Barangay</label><input value={data.barangay} onChange={e => setField('barangay', e.target.value)} /></div>
          <div><label>Purok / Area <span className="req">*</span></label>
            <select value={data.purok} onChange={e => setField('purok', e.target.value)}>
              {PUROKS.map(p => <option key={p}>{p}</option>)}
            </select></div>
          <div><label>Contact Number</label><input value={data.contact} onChange={e => setField('contact', e.target.value)} placeholder="09XX XXX XXXX" /></div>
          <div><label>Number of Members</label><input value={h ? hhMembers(h.id) : 0} readOnly /><div className="auto-fill"><Icon name="users" />Auto-updated from member records</div></div>
          <div><label>Date Registered</label><input type="date" value={data.dateReg} onChange={e => setField('dateReg', e.target.value)} /></div>
          <div className="full"><label>Remarks</label><textarea rows={2} value={data.remarks} onChange={e => setField('remarks', e.target.value)} placeholder="Additional household information" /></div>
        </form>
      ),
      footer: (
        <>
          <button className="btn btn-line" onClick={() => setHhForm(null)}><Icon name="x" />Cancel</button>
          {!h && <button className="btn btn-soft" onClick={() => save(true)}><Icon name="adduser" />Save &amp; Add Members</button>}
          <button className="btn btn-pri" onClick={() => save(false)}><Icon name="save" />Save Household</button>
        </>
      ),
    }} onClose={() => setHhForm(null)} />
  }

  /* ---------- Household detail modal ---------- */
  if (hhDetail) {
    const h = db.households.find(x => x.id === hhDetail)
    if (!h) { setHhDetail(null); return null }
    const members = db.residents.filter(r => r.hhId === hhDetail)
      .sort((a, b) => (a.relation === 'Household Head' ? -1 : 0) - (b.relation === 'Household Head' ? -1 : 0))
    const recs = db.records.filter(r => r.hhId === hhDetail)
    const mons = db.monitoring.filter(m => m.hhId === hhDetail)
    return <Modal modal={{
      title: 'Household Profile',
      sub: 'Household ID ' + h.id + ' · ' + h.purok,
      icon: 'home',
      body: (
        <div>
          <div className="detail-grid" style={{ marginBottom: 14 }}>
            <DV k="Household ID" v={h.id} mono />
            <DV k="Household Head" v={h.head} />
            <DV k="Complete Address" v={hhAddress(h)} />
            <DV k="Purok / Area" v={<span className="tag">{h.purok}</span>} />
            <DV k="Contact Number" v={h.contact} />
            <DV k="Registration Date" v={fmtDate(h.dateReg)} />
            <DV k="Total Members" v={<b>{members.length}</b> + ' registered residents'} />
            <DV k="Linked Records" v={recs.length + ' health records · ' + mons.length + ' monitoring'} />
          </div>
          {h.remarks && <div className="f-note"><Icon name="info" />{h.remarks}</div>}
          <div className="f-hr">HOUSEHOLD MEMBERS</div>
          <div className="table-scroll" style={{ margin: '10px -4px 0' }}>
            <table className="tbl" style={{ minWidth: 640 }}>
              <thead><tr>
                <th>Resident ID</th><th>Full Name</th><th>Birthdate</th><th>Age</th><th>Sex</th><th>Relationship</th><th>Civil Status</th><th>Occupation</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {members.length ? members.map(r => (
                  <tr className="click" key={r.id} onClick={() => setMemProfile(r.id)}>
                    <td className="idc">{r.id}</td><td><b>{r.name}</b></td>
                    <td>{fmtDate(r.birthdate)}</td><td>{age(r.birthdate)}</td><td>{r.sex}</td>
                    <td><span className="tag">{r.relation}</span></td>
                    <td>{r.civil}</td><td>{r.occupation}</td>
                    <td>
                      <div className="actions">
                        <button className="icon-btn" title="View resident profile" onClick={e => { e.stopPropagation(); setMemProfile(r.id) }}><Icon name="eye" /></button>
                        <button className="icon-btn" title="Edit member" onClick={e => { e.stopPropagation(); setHhDetail(null); setMemForm({ resId: r.id, hhId: h.id }) }}><Icon name="edit" /></button>
                        <button className="icon-btn del" title="Remove member" onClick={e => { e.stopPropagation(); removeMember(r.id) }}><Icon name="trash" /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={9}><div className="tbl-empty"><Icon name="users" /><b>No members yet</b><span>Register residents under this household.</span></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-line" onClick={() => setHhDetail(null)}><Icon name="chevL" />Return to List</button>
          <button className="btn btn-ghost" onClick={() => { setHhDetail(null); go('records') }}><Icon name="health" />View Health Records</button>
          <button className="btn btn-ghost" onClick={() => { setHhDetail(null); setMemForm({ resId: null, hhId: h.id }) }}><Icon name="adduser" />Add Member</button>
          <button className="btn btn-pri" onClick={() => { setHhDetail(null); setHhForm({ id: h.id }) }}><Icon name="edit" />Edit Household</button>
        </>
      ),
    }} onClose={() => setHhDetail(null)} />
  }

  /* ---------- Member form modal ---------- */
  if (memForm) {
    const r = memForm.resId ? db.residents.find(x => x.id === memForm.resId) : null
    const hh = memForm.hhId ? db.households.find(x => x.id === memForm.hhId) : (r ? db.households.find(x => x.id === r.hhId) : null)
    const nextRes = r ? r.id : padId(db.counters.res, 'RES-')
    if (!memForm.data) memForm.data = {
      name: r ? r.name : '', birthdate: r ? r.birthdate : '', sex: r ? r.sex : 'Male',
      relation: r ? r.relation : 'Son', civil: r ? r.civil : 'Single',
      occupation: r ? r.occupation : '', contact: r ? r.contact : '', remarks: r ? r.remarks : '',
    }
    const data = memForm.data
    const setField = (k, v) => setMemForm({ ...memForm, data: { ...data, [k]: v } })
    function saveMember() {
      if (!data.name.trim() || !data.birthdate) { toast('err', 'Missing information', 'Full name and birthdate are required.'); return }
      if (r) {
        update(d => { Object.assign(d.residents.find(x => x.id === r.id), data) })
        addActivity('member', 'Resident information updated', r.name)
        toast('ok', 'Resident updated', r.name + "'s profile was saved.")
        setMemForm(null)
        if (hhDetail) force(v => v + 1)
      } else {
        let newId = ''
        update(d => {
          const res = Object.assign({ id: padId(d.counters.res, 'RES-'), hhId: memForm.hhId }, data)
          d.residents.push(res); d.counters.res++
          newId = res.id
        })
        addActivity('member', 'Resident Registered — new household member', data.name)
        toast('ok', 'Resident registered', data.name + ' (' + newId + ') added to ' + memForm.hhId + '.')
        setMemForm(null)
      }
    }
    return <Modal modal={{
      title: r ? 'Edit Resident — ' + r.name : 'Register New Resident',
      sub: hh ? 'Under household ' + hh.id + ' · ' + hh.head : 'Resident ID is generated automatically',
      icon: r ? 'edit' : 'adduser',
      body: (
        <form className="form-grid" onSubmit={e => { e.preventDefault(); saveMember() }}>
          <div className="full f-note"><Icon name="info" />Age is computed automatically from the birthdate. Household ID is linked automatically.</div>
          <div><label>Resident ID</label><input value={nextRes} readOnly /></div>
          <div><label>Household ID</label><input value={hh ? hh.id : ''} readOnly /></div>
          <div><label>Full Name <span className="req">*</span></label><input required value={data.name} onChange={e => setField('name', e.target.value)} placeholder="Complete resident name" /></div>
          <div><label>Birthdate <span className="req">*</span></label><input type="date" required max={today()} value={data.birthdate} onChange={e => setField('birthdate', e.target.value)} /></div>
          <div><label>Age</label><input readOnly value={data.birthdate ? age(data.birthdate) : ''} /><div className="auto-fill"><Icon name="pill" />Auto-computed from birthdate</div></div>
          <div><label>Sex <span className="req">*</span></label>
            <select value={data.sex} onChange={e => setField('sex', e.target.value)}><option>Male</option><option>Female</option></select></div>
          <div><label>Relationship to Head</label>
            <select value={data.relation} onChange={e => setField('relation', e.target.value)}>
              {RELATIONS.map(o => <option key={o}>{o}</option>)}
            </select></div>
          <div><label>Civil Status</label>
            <select value={data.civil} onChange={e => setField('civil', e.target.value)}>
              {CIVIL.map(o => <option key={o}>{o}</option>)}
            </select></div>
          <div><label>Occupation</label><input value={data.occupation} onChange={e => setField('occupation', e.target.value)} placeholder="Current occupation" /></div>
          <div><label>Contact Number</label><input value={data.contact} onChange={e => setField('contact', e.target.value)} placeholder="Resident contact number" /></div>
          <div className="full"><label>Remarks</label><textarea rows={2} value={data.remarks} onChange={e => setField('remarks', e.target.value)} placeholder="Additional resident information" /></div>
        </form>
      ),
      footer: (
        <>
          <button className="btn btn-line" onClick={() => setMemForm(null)}><Icon name="x" />Cancel</button>
          <button className="btn btn-pri" type="submit" onClick={saveMember}><Icon name="save" />{r ? 'Save Changes' : 'Save Resident'}</button>
        </>
      ),
    }} onClose={() => setMemForm(null)} />
  }

  /* ---------- Member profile modal ---------- */
  if (memProfile) {
    const r = db.residents.find(x => x.id === memProfile)
    if (!r) { setMemProfile(null); return null }
    const hh = db.households.find(x => x.id === r.hhId)
    const recs = db.records.filter(x => x.resId === r.id)
    const mons = db.monitoring.filter(m => m.resId === r.id).sort((a, b) => (a.nextSched < b.nextSched ? -1 : 1))
    const cats = [...new Set(recs.map(x => x.cat))]
    return <Modal modal={{
      title: 'Resident Profile',
      sub: 'Resident ID ' + r.id + ' · Household ' + r.hhId,
      icon: 'user',
      body: (
        <div>
          <div className="detail-grid" style={{ marginBottom: 6 }}>
            <DV k="Full Name" v={r.name} />
            <DV k="Birthdate" v={fmtDate(r.birthdate)} />
            <DV k="Age" v={age(r.birthdate) + ' (' + ageYears(r.birthdate) + ' years)'} />
            <DV k="Sex" v={r.sex} />
            <DV k="Relationship" v={<span className="tag">{r.relation}</span>} />
            <DV k="Civil Status" v={r.civil} />
            <DV k="Occupation" v={r.occupation || '—'} />
            <DV k="Contact Number" v={r.contact || '—'} />
            <DV k="Household" v={hh ? hh.id + ' — ' + hh.head : r.hhId} />
            <DV k="Household Address" v={hh ? hhAddress(hh) : '—'} />
          </div>
          {r.remarks && <div className="f-note"><Icon name="info" />{r.remarks}</div>}
          <div className="f-hr">HEALTH SUMMARY</div>
          <div className="detail-grid" style={{ marginTop: 10 }}>
            <DV k="Health Records" v={recs.length + ' record(s): ' + (cats.join(', ') || 'none')} />
            <DV k="Monitoring" v={mons.length ? mons.length + ' schedule(s) — next: ' + fmtDate(mons[0].nextSched) : 'No active monitoring'} />
          </div>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-line" onClick={() => setMemProfile(null)}><Icon name="x" />Close</button>
          <button className="btn btn-ghost" onClick={() => { setMemProfile(null); setMemForm({ resId: r.id, hhId: r.hhId }) }}><Icon name="edit" />Edit Member</button>
          <button className="btn btn-pri" onClick={() => { setMemProfile(null); window.dispatchEvent(new CustomEvent('open-record-form', { detail: { resId: r.id } })) }}><Icon name="health" />Add Health Record</button>
        </>
      ),
    }} onClose={() => setMemProfile(null)} />
  }

  /* ---------- Household picker (register resident) ---------- */
  if (pickerOn) {
    return <Modal modal={{
      title: 'Register Resident',
      sub: 'Select the household for the new resident',
      icon: 'adduser',
      size: 'sm',
      body: (
        <div>
          <label>Household</label>
          <select style={{ padding: '11px 12px 11px 12px', paddingRight: 34 }} value={pickHH} onChange={e => setPickHH(e.target.value)}>
            {db.households.map(h => <option key={h.id} value={h.id}>{h.id + ' — ' + h.head + ' (' + h.purok + ')'}</option>)}
          </select>
        </div>
      ),
      footer: (
        <>
          <button className="btn btn-line" onClick={() => setPickerOn(false)}><Icon name="x" />Cancel</button>
          <button className="btn btn-pri" onClick={() => { setPickerOn(false); setMemForm({ resId: null, hhId: pickHH }) }}><Icon name="chevR" />Continue</button>
        </>
      ),
    }} onClose={() => setPickerOn(false)} />
  }

  return null
}

