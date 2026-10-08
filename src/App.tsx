import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { BrandLockup } from './components/Brand'
import { useFeedback } from './components/Feedback'
import { Icon } from './components/Icon'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Products from './pages/Products'
import Cashflow from './pages/Cashflow'
import SettingsPage from './pages/Settings'

const NAV = [
  { to: '/', label: 'Início', icon: 'home', end: true },
  { to: '/encomendas', label: 'Encomendas', icon: 'orders' },
  { to: '/produtos', label: 'Preços', icon: 'tag' },
  { to: '/caixa', label: 'Caixa', icon: 'wallet' },
  { to: '/ajustes', label: 'Ajustes', icon: 'settings' },
]

function NavLinks() {
  return (
    <>
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}>
          <Icon name={n.icon} />
          <span>{n.label}</span>
        </NavLink>
      ))}
    </>
  )
}

function PwaStatus() {
  const { toast } = useFeedback()
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (offlineReady) {
      toast('Pronto! Agora o painel funciona mesmo sem internet 🍞')
      setOfflineReady(false)
    }
  }, [offlineReady, setOfflineReady, toast])

  useEffect(() => {
    if (needRefresh) {
      toast('Tem uma versão novinha do painel.', { label: 'Atualizar', run: () => void updateServiceWorker(true) })
      setNeedRefresh(false)
    }
  }, [needRefresh, setNeedRefresh, toast, updateServiceWorker])

  return null
}

export default function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <BrandLockup />
        <NavLinks />
        <div className="side-foot">Feito com carinho 🥖<br />Seus dados ficam só neste aparelho.</div>
      </aside>
      <main className="main">
        <header className="topbar"><BrandLockup /></header>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/encomendas" element={<Orders />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/caixa" element={<Cashflow />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="bottomnav" aria-label="Menu principal"><NavLinks /></nav>
      <PwaStatus />
    </div>
  )
}
