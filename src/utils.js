// Date / formatting utilities (ported from the original app engine)
const MON_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function fmtDate(d) {
  if (!d) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const p = d.split('-')
    return p[2] + ' ' + MON_ABBR[+p[1] - 1] + ' ' + p[0]
  }
  return d
}
export function monAbbr(m) { return MON_ABBR[m] }
export function today() { return new Date().toISOString().slice(0, 10) }
export function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
export function daysFromToday(iso) {
  return Math.round((new Date(iso + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000)
}
export function age(bd) {
  if (!bd) return null
  const d = daysFromToday(bd)
  const y = Math.floor(-d / 365.25)
  if (y >= 0 && d <= 0) return y + (y === 1 ? ' yr' : ' yrs')
  const m = Math.floor(-d / 30.44)
  if (m > 0 && d <= 0) return m + ' mo'
  if (d > 0) return Math.floor(d / 30.44) + ' mo (exp)'
  return 'newborn'
}
export function ageYears(bd) {
  if (!bd) return 0
  return Math.max(0, Math.floor(-daysFromToday(bd) / 365.25))
}
export function initials(n) {
  const p = String(n || '?').trim().split(/\s+/)
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}
export function padId(n, prefix) { return prefix + String(n).padStart(4, '0') }
export function nowTime() {
  const d = new Date()
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}
export function todayLong() {
  const d = new Date()
  return DAYS[d.getDay()] + ', ' + MONTHS_FULL[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()
}
export function timeAgo(d, t) {
  const h = String(t || '09:00').split(':')
  const dt = new Date(d + 'T' + h[0] + ':' + h[1] + ':00')
  const mins = Math.max(0, Math.round((Date.now() - dt.getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  const dys = Math.floor(hrs / 24)
  if (dys < 7) return dys + 'd ago'
  return fmtDate(d)
}
export function uid() { return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
export function rnd(n) { return Math.floor(Math.random() * n) }
export function pick(a) { return a[Math.floor(Math.random() * a.length)] }

export function monStatusOf(next, status) {
  if (status === 'Completed') return 'Completed'
  const dd = daysFromToday(next)
  if (dd < 0) return 'Overdue'
  if (dd <= 7) return 'Due Soon'
  return 'On Track'
}
export function statusClass(s) {
  switch (s) {
    case 'On Track': return 'sp-on'
    case 'Due Soon': return 'sp-due'
    case 'Overdue': return 'sp-od'
    case 'Completed': return 'sp-comp'
    case 'Active': return 'sp-active'
    case 'Under Observation': return 'sp-obs'
    case 'Referred': return 'sp-ref'
    case 'Follow-up Required': return 'sp-fu'
    case 'Resolved': return 'sp-res'
    case 'Scheduled': return 'sp-sched'
    case 'Pending': return 'sp-pend'
    case 'Missed Schedule': return 'sp-missed'
    default: return 'sp-active'
  }
}
export function hhAddress(h) { return (h.houseNum ? h.houseNum + ', ' : '') + h.street + ', ' + h.barangay }
