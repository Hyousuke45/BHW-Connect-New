// Shared UI primitives: toasts, confirm dialog, modal, status pill, CSV download
import { useEffect, useRef, useState } from 'react'
import Icon from './components/Icon'
import { statusClass } from './utils'

export function ToastBox({ toasts, dismiss }) {
  return (
    <div id="toastBox">
      {toasts.map(t => (
        <div key={t.id} className={'toast ' + t.kind}>
          <Icon name={t.kind === 'ok' ? 'okc' : t.kind === 'err' || t.kind === 'warn' ? 'warn' : 'info'} />
          <div><b>{t.title}</b>{t.msg ? <span>{t.msg}</span> : null}</div>
          <button className="tx" aria-label="Dismiss" onClick={() => dismiss(t.id)}><Icon name="x" /></button>
        </div>
      ))}
    </div>
  )
}

export function ConfirmDialog({ confirm, onClose }) {
  if (!confirm) return null
  return (
    <div className="confirm-ov" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={'confirm-card ' + (confirm.kind || 'info')}>
        <div className="cf-ico"><Icon name={confirm.kind === 'danger' ? 'trash' : confirm.kind === 'warn' ? 'warn' : 'info'} /></div>
        <h4>{confirm.title}</h4>
        <p>{confirm.message}</p>
        <div className="cf-btns">
          <button className="btn btn-line" onClick={onClose}>Cancel</button>
          <button className={'btn ' + (confirm.kind === 'danger' ? 'btn-danger' : 'btn-pri')} onClick={() => { onClose(); confirm.onOK && confirm.onOK() }}>
            {confirm.okLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Generic modal shell: {title, sub, icon, size, body, footer}
export function Modal({ modal, onClose }) {
  const boxRef = useRef(null)
  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = 0 }, [modal])
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  if (!modal) return null
  return (
    <div className="modal-ov" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={'modal' + (modal.size === 'sm' ? ' sm' : '')} ref={boxRef}>
        <div className="modal-h">
          <span className="mh-ico"><Icon name={modal.icon || 'info'} /></span>
          <div>
            <h3>{modal.title}</h3>
            {modal.sub ? <p>{modal.sub}</p> : null}
          </div>
          <button className="modal-x" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal-b">{modal.body}</div>
        {modal.footer ? <div className="modal-f">{modal.footer}</div> : null}
      </div>
    </div>
  )
}

export function StatusPill({ s }) {
  return <span className={'status-pill ' + statusClass(s)}><span className="dot"></span>{s}</span>
}

export function DV({ k, v, mono }) {
  return <div className="dv"><div className="k">{k}</div><div className={'v' + (mono ? ' mono' : '')}>{v}</div></div>
}

// ---------- CSV download ----------
function csvEsc(v) {
  v = String(v == null ? '' : v)
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
}
export function downloadCSV(name, rows) {
  const csv = '\uFEFF' + rows.map(r => r.map(csvEsc).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name.replace(/[^\w-]+/g, '_') + '.csv'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 400)
}

// Animated count-up for stat cards (subtle, honors reduced motion)
export function useCountUp(target) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const dur = 700
    const t0 = performance.now()
    let raf
    const step = ts => {
      const p = Math.min(1, (ts - t0) / dur)
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return val.toLocaleString()
}
