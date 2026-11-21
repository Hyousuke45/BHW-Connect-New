// BHW Monthly Report: worksheets rebuilt from excels.xlsx — by BHW or by month
// mode, editable cells with live totals, CSV export
import React, { useState } from 'react'
import Icon from '../components/Icon'
import { useStore, toast } from '../store'
import { downloadCSV } from '../ui'
import { REP_SHEETS, BHW_NAMES, MONTHS } from '../constants'

export default function Reports() {
  const { db, update } = useStore()
  const curMonth = MONTHS[new Date().getMonth()]
  const [month, setMonth] = useState(curMonth)
  const [sheet, setSheet] = useState('vitA')
  const [bhw, setBhw] = useState('all')
  const [mode, setMode] = useState('purok')

  const def = REP_SHEETS[sheet]
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  // columns: BHW names (purok mode) or months (month mode)
  const cols = mode === 'purok' ? (bhw === 'all' ? BHW_NAMES : [bhw]) : MONTHS
  const colHeaders = cols

  // data accessors on the store's report map
  const mkeyOf = (mode === 'purok') ? (col => month + '__' + col) : (col => col)
  const getVal = (mkey, key) => {
    const m = db.report[mkey]
    if (!m) return 0
    const sd = m[sheet]
    if (!sd) return 0
    const v = sd[key]
    return v == null ? 0 : v
  }
  const setVal = (mkey, key, v) => {
    update(d => {
      if (!d.report[mkey]) d.report[mkey] = {}
      if (!d.report[mkey][sheet]) d.report[mkey][sheet] = {}
      d.report[mkey][sheet][key] = v
    })
  }

  const exportCSV = () => {
    const rows = [
      ['BHW MONTHLY REPORT', def.title],
      [db.reportBHS || 'BHS: BANLAG', 'RHM: ' + (db.reportRHM || 'SHEILA MAE I. UY, RM')],
      [month, 'Mode: ' + (mode === 'purok' ? 'By BHW' : 'By Month')],
      [],
    ]
    const header = ['#', 'TARGET GROUP / ITEM'].concat(cols.map(String)).concat(['TOTAL'])
    rows.push(header)
    def.groups.forEach(gr => {
      rows.push(['', gr.name].concat(cols.map(() => '')).concat(['']))
      gr.rows.forEach((row, i) => {
        const vals = cols.map(c => getVal(mkeyOf(c), row[1]))
        const tot = vals.reduce((a, b) => a + b, 0)
        rows.push([String(i + 1), row[0]].concat(vals.map(String)).concat([String(tot)]))
      })
    })
    downloadCSV('BHW_MonthlyReport_' + sheet + '_' + month, rows)
  }

  const nrows = def.groups.reduce((a, g) => a + g.rows.length, 0)

  return (
    <section>
      <div className="rep-head-band">
        <div className="rhb-logo"><img src="/logo.jpg" alt="logo" /></div>
        <div>
          <div className="rhb-t">BHW MONTHLY REPORT</div>
          <div className="rhb-s">{(db.reportBHS || 'BHS: BANLAG') + ' · RHM: ' + (db.reportRHM || 'SHEILA MAE I. UY, RM') + ' · ' + month}</div>
        </div>
        <button className="btn btn-pri" onClick={exportCSV}><Icon name="export" />Export CSV</button>
      </div>

      <div className="rep-meta">
        <div className="rm"><label>Report Month</label>
          <select value={month} onChange={e => setMonth(e.target.value)}>
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select></div>
        <div className="rm"><label>Worksheet</label>
          <select value={sheet} onChange={e => setSheet(e.target.value)}>
            {Object.keys(REP_SHEETS).map(k => <option key={k} value={k}>{REP_SHEETS[k].title}</option>)}
          </select></div>
        <div className="rm"><label>BHW (reporting)</label>
          <select value={bhw} onChange={e => setBhw(e.target.value)} disabled={mode !== 'purok'}>
            <option value="all">All BHWs (consolidated)</option>
            {BHW_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
          </select></div>
        <div className="rm"><label>Mode</label>
          <select value={mode} onChange={e => setMode(e.target.value)}>
            <option value="purok">By Purok (all BHWs)</option>
            <option value="month">By Month (Jan–Dec)</option>
          </select></div>
      </div>

      <div className="sheet-wrap sec-gap" style={{ marginTop: 0 }}>
        <div className="ws-toolbar">
          <div className="ws-name-box"><Icon name="sheet" /><span className="ws-name">{def.title}</span></div>
          <div className="ws-tool" onClick={() => toast('ok', 'Saved', 'Report values are stored locally as you type.')}>
            <Icon name="save" />Save Changes</div>
          <span className="ws-hint" style={{ marginLeft: 'auto' }}>Cells auto-total (TOTAL column). Type numbers directly into cells.</span>
        </div>
        <div className="ws-body" style={{ maxHeight: '66vh' }}>
          <table className="grid-table">
            <thead><tr>
              <th className="rownum">#</th>
              <th style={{ minWidth: 280 }}>TARGET GROUP / ITEM</th>
              {colHeaders.map((ch, i) => (
                <th key={ch} style={{ minWidth: 78, textAlign: 'center' }}>{ch}<span className="col-letter">{letters[i + 1]}</span></th>
              ))}
              <th style={{ minWidth: 70, textAlign: 'center' }}>TOTAL</th>
            </tr></thead>
            <tbody>
              {def.groups.map(gr => (
                <React.Fragment key={gr.name}>
                  <tr><td className="group-cell" colSpan={cols.length + 3}>{gr.name}</td></tr>
                  {gr.rows.map(row => {
                    const [label, key] = row
                    const vals = cols.map(c => getVal(mkeyOf(c), key))
                    const tot = vals.reduce((a, b) => a + b, 0)
                    return (
                      <tr className="data-row" key={key}>
                        <td className="rownum"></td>
                        <td className="label-cell"><span className="lab">{label}</span></td>
                        {cols.map(c => {
                          const mkey = mkeyOf(c)
                          return (
                            <td className="cell editable" key={mkey}>
                              <input type="number" min="0" step="1" value={getVal(mkey, key)}
                                onChange={e => { const v = parseInt(e.target.value, 10) || 0; setVal(mkey, key, v) }} />
                            </td>
                          )
                        })}
                        <td className="tot-cell">{tot}</td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              ))}
              <tr>
                <td className="group-cell" style={{ background: 'var(--g600)' }}>TOTAL</td>
                <td className="label-cell" style={{ background: 'var(--g025)' }}><span className="lab"><b>All items</b></span></td>
                {cols.map(c => {
                  const sum = def.groups.reduce((a, gr) => a + gr.rows.reduce((b, row) => b + getVal(mkeyOf(c), row[1]), 0), 0)
                  return <td className="tot-cell" key={c}>{sum}</td>
                })}
                <td className="tot-cell" style={{ background: 'var(--g100)' }}>
                  {cols.reduce((a, c) => a + def.groups.reduce((b, gr) => b + gr.rows.reduce((x, row) => x + getVal(mkeyOf(c), row[1]), 0), 0), 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="ws-foot">
          <div className="ws-status"><span className="dot saved"></span><span>Report values saved locally</span></div>
          <span className="ws-hint">{nrows + ' item(s) × ' + cols.length + ' column(s) · ' + def.title}</span>
        </div>
      </div>
    </section>
  )
}
