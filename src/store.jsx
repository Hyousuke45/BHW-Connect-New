// Central store: DB state in React, persisted to localStorage (offline-first)
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { seedData } from './seed'
import { uid, today, nowTime } from './utils'

const LS_KEY = 'bhwConnectDB'

function loadDB() {
  try {
    const s = localStorage.getItem(LS_KEY)
    if (s) return JSON.parse(s)
  } catch (e) { /* ignore */ }
  return null
}

const StoreCtx = createContext(null)

export function StoreProvider({ children }) {
  const [db, setDb] = useState(() => {
    let d = loadDB()
    if (!d || !d.households || !d.households.length) d = seedData()
    // migrate single-user DBs to the multi-account list
    if (!d.users || !d.users.length) {
      const s = seedData()
      d.users = s.users
      if (d.user && d.user.username) {
        const mine = d.users.find(u => u.username === d.user.username)
        if (mine) d.user = mine // keep old edits (name/contact/email) via spread below
        d.users = d.users.map(u => u.username === d.user.username ? { ...u, ...d.user } : u)
      } else {
        d.user = d.users[0]
      }
    }
    if (!d.user || !d.users.find(u => u.username === d.user.username)) d.user = d.users[0]
    if (!d.report || !Object.keys(d.report).length) {
      const s = seedData()
      d.report = s.report
    }
    if (!d.notifs) d.notifs = []
    if (!d.activities) d.activities = []
    if (!d.accountActs) d.accountActs = []
    return d
  })

  // persist on every change
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch (e) { /* ignore */ }
  }, [db])

  const update = useCallback(mutator => {
    setDb(prev => {
      const next = structuredClone(prev) // clone so React sees a new object
      mutator(next)
      return next
    })
  }, [])

  const resetDB = useCallback(() => {
    localStorage.removeItem(LS_KEY)
    setDb(seedData())
  }, [])

  // ---------- activity logger ----------
  const addActivity = useCallback((type, desc, resName) => {
    update(d => {
      if (!d.activities) d.activities = []
      d.activities.unshift({ id: uid(), type, desc, resName: resName || '', date: today(), time: nowTime() })
      d.activities = d.activities.slice(0, 60)
    })
  }, [update])

  const logAccountActivity = useCallback(desc => {
    update(d => {
      if (!d.accountActs) d.accountActs = []
      d.accountActs.unshift({ date: today(), time: nowTime(), desc })
      d.accountActs = d.accountActs.slice(0, 10)
    })
  }, [update])

  const value = useMemo(() => ({ db, update, resetDB, addActivity, logAccountActivity }), [db, update, resetDB, addActivity, logAccountActivity])
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

// ---------- toasts ----------
let toastSeq = 0
export function useToasts() {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})
  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout) }, [])
  const dismiss = useCallback(id => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])
  const toast = useCallback((kind, title, msg, ms = 3800) => {
    const id = ++toastSeq
    setToasts(ts => [...ts.slice(-3), { id, kind, title, msg }])
    timers.current[id] = setTimeout(() => dismiss(id), ms)
  }, [dismiss])
  return { toasts, toast, dismiss }
}

// ToastBox is rendered once at App level; a module-level bridge lets any
// component fire toasts without prop drilling.
let toastFn = null
export function setToastFn(fn) { toastFn = fn }
export function toast(kind, title, msg, ms) { if (toastFn) toastFn(kind, title, msg, ms) }
