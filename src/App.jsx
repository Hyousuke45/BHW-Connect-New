// App root: login gate + shell + page routing
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import './styles.css'
import { StoreProvider, useStore, setToastFn } from './store'
import { ToastBox, ConfirmDialog, Modal } from './ui'
import Icon from './components/Icon'
import LoginPage from './pages/LoginPage'
import Shell from './pages/Shell'
import Dashboard from './pages/Dashboard'
import Households from './pages/Households'
import Records from './pages/Records'
import Monitoring from './pages/Monitoring'
import Reports from './pages/Reports'
import Account from './pages/Account'
import { useToasts } from './store'

// Navigation context: page + helpers to switch pages and open modals/confirms
export const NavCtx = createContext(null)
export function useNav() { return useContext(NavCtx) }

function InnerApp() {
  const [page, setPage] = useState('dashboard')
  const [loggedIn, setLoggedIn] = useState(false)
  const [modal, setModal] = useState(null) // {title, sub, icon, size, body, footer}
  const [confirm, setConfirm] = useState(null) // {kind, title, message, okLabel, onOK}
  const { toasts, toast, dismiss } = useToasts()
  const { db, logAccountActivity } = useStore()

  useEffect(() => { setToastFn(toast) }, [toast])

  const doLogout = () => {
    logAccountActivity('Logged out')
    setLoggedIn(false)
  }


  const go = useCallback(p => { setPage(p) }, [])
  // openModal dedupes identical content — child components call it during render,
  // so a no-op re-set converges instead of looping forever.
  const openModal = useCallback(m => {
    setModal(prev => {
      if (prev && m && prev._key && m._key && prev._key === m._key) return prev
      return m
    })
  }, [])
  const closeModal = useCallback(() => setModal(null), [])
  const confirmDialog = useCallback(c => setConfirm(c), [])
  const closeConfirm = useCallback(() => setConfirm(null), [])

  // Signed-in helper exposed to pages
  const nav = useMemo(() => ({
    page, go, openModal, closeModal, confirmDialog, toast,
  }), [page, go, openModal, closeModal, confirmDialog, toast])

  if (!loggedIn) {
    return (
      <>
        <LoginPage onLogin={() => setLoggedIn(true)} />
        <ToastBox toasts={toasts} dismiss={dismiss} />
      </>
    )
  }

  return (
    <>
      <NavCtx.Provider value={nav}>
        <Shell page={page} onNavigate={go} onLogout={doLogout} />
      </NavCtx.Provider>
      <Modal modal={modal} onClose={closeModal} />
      <ConfirmDialog confirm={confirm} onClose={closeConfirm} />
      <ToastBox toasts={toasts} dismiss={dismiss} />
    </>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <InnerApp />
    </StoreProvider>
  )
}
