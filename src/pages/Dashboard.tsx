import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BunArt } from '../components/Brand'
import { MonthlyChart, HBars } from '../components/Charts'
import { useFeedback } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { OrderCard } from '../components/OrderCard'
import { OrderForm } from '../components/OrderForm'
import { PaymentForm } from '../components/PaymentForm'
import { TransactionForm } from '../components/TransactionForm'
import { loadExamples } from '../db/seed'
import { useIngredientMap, useOrders, useProducts, useSettings, useTransactions } from '../db/hooks'
import type { Order } from '../db/types'
import { addDays, currentMonthKey, formatLongDay, greeting, monthLabel, todayISO } from '../lib/dates'
import { formatBRL, formatBRLShort } from '../lib/money'
import { productionList } from '../lib/orders'
import { estimatedProfit, lastMonths, monthStats, topProducts } from '../lib/stats'

const PHRASES = [
  'Hoje tem pãozinho macio saindo do forno 🥖',
  'Massa fofinha, coração quentinho 💛',
  'Cada pão carrega um pedacinho de carinho',
  'Fermentou, cresceu, vai conquistar o dia de alguém',
  'Pão artesanal: feito devagar, comido com alegria',
  'Que cheirinho bom de pão novo! 🍞',
]

type Range = 'hoje' | 'amanha' | 'semana'

export default function Dashboard() {
  const orders = useOrders()
  const txs = useTransactions()
  const products = useProducts()
  const ingMap = useIngredientMap()
  const settings = useSettings()
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const [range, setRange] = useState<Range>('hoje')
  const [editing, setEditing] = useState<Order | 'new' | null>(null)
  const [paying, setPaying] = useState<{ order: Order; remaining: number } | null>(null)
  const [cash, setCash] = useState(false)
  const phrase = useMemo(() => PHRASES[new Date().getDate() % PHRASES.length], [])

  const month = currentMonthKey()
  const today = todayISO()

  const stats = useMemo(() => monthStats(month, orders ?? [], txs ?? []), [month, orders, txs])
  const profit = useMemo(() => estimatedProfit(month, orders ?? [], products ?? [], ingMap, settings), [month, orders, products, ingMap, settings])
  const months = useMemo(() => lastMonths(6, month, orders ?? [], txs ?? []), [month, orders, txs])
  const top = useMemo(() => topProducts(month, orders ?? []), [month, orders])

  const upcoming = useMemo(() => {
    const limit = addDays(today, 7)
    return (orders ?? [])
      .filter((o) => o.status !== 'entregue' && o.status !== 'cancelado' && o.date <= limit)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  }, [orders, today])

  const production = useMemo(() => {
    const [from, to] = range === 'hoje' ? [today, today] : range === 'amanha' ? [addDays(today, 1), addDays(today, 1)] : [today, addDays(today, 6)]
    return productionList((orders ?? []).filter((o) => o.date >= from && o.date <= to))
  }, [orders, range, today])

  if (!orders || !txs || !products) return <div className="splash"><div><BunArt /><div>Assando o painel…</div></div></div>

  const empty = orders.length === 0 && products.length === 0 && txs.length === 0
  const lastBackupDays = settings.lastBackupAt ? Math.floor((Date.now() - settings.lastBackupAt) / 86_400_000) : null
  const needsBackup = !empty && (lastBackupDays == null || lastBackupDays >= 14)
  const goalPct = settings.monthlyGoal > 0 ? Math.min(100, (stats.revenue / settings.monthlyGoal) * 100) : 0
  const firstName = settings.ownerName.split(' ')[0]

  return (
    <div className="stack" style={{ gap: 18 }}>
      <section className="card frame hero">
        <div className="copy">
          <div className="eyebrow">{formatLongDay(today)}</div>
          <h1>{greeting()}, {firstName}!</h1>
          <p className="phrase">{phrase}</p>
        </div>
        <BunArt className="art" />
        <div className="actions">
          <button className="btn primary" onClick={() => setEditing('new')}><Icon name="plus" /> Nova encomenda</button>
          <button className="btn" onClick={() => setCash(true)}><Icon name="wallet" /> Lançar no caixa</button>
        </div>
      </section>

      {empty && (
        <section className="card">
          <h2>Vamos começar? 🥖</h2>
          <p className="muted" style={{ margin: '6px 0 14px' }}>Em poucos passinhos o painel já ajuda no seu dia a dia:</p>
          <ol className="stack" style={{ gap: 10, paddingLeft: 20, margin: 0 }}>
            <li><b>Cadastre seus insumos</b> (farinha, fermento…) e <b>monte a receita</b> de cada pão em <Link to="/produtos">Preços</Link>.</li>
            <li><b>Anote as encomendas</b> em <Link to="/encomendas">Encomendas</Link>.</li>
            <li><b>Registre o que entra e sai</b> no <Link to="/caixa">Caixa</Link>.</li>
          </ol>
          <div className="row wrap" style={{ marginTop: 16 }}>
            <button className="btn primary" onClick={() => navigate('/produtos')}>Começar pelos preços</button>
            <button className="btn" onClick={async () => { await loadExamples(); toast('Exemplos carregados! Pode explorar e depois apagar 🍞') }}>Ver com exemplos prontos</button>
          </div>
        </section>
      )}

      {needsBackup && (
        <div className="notice">
          <span className="em">💾</span>
          <div className="grow">
            <b>Hora de guardar uma cópia de segurança.</b>
            <div className="small">Seus dados ficam só neste aparelho. {lastBackupDays == null ? 'Você ainda não fez nenhum backup.' : `O último backup foi há ${lastBackupDays} dias.`}</div>
            <Link to="/ajustes" className="bold small">Fazer backup agora →</Link>
          </div>
        </div>
      )}

      <section>
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>Seu mês</h2><span className="eyebrow" style={{ textTransform: 'capitalize' }}>{monthLabel(month)}</span>
        </div>
        <div className="kpis">
          <div className="kpi accent"><span className="k-emoji">🥖</span><div className="k-label">Faturamento estimado</div><div className="k-value">{formatBRL(stats.revenue)}</div><div className="k-sub">soma das encomendas do mês</div></div>
          <div className="kpi"><span className="k-emoji">📋</span><div className="k-label">Encomendas</div><div className="k-value">{stats.orders}</div><div className="k-sub">{stats.unitsSold} pãezinhos</div></div>
          <div className="kpi"><span className="k-emoji">🧺</span><div className="k-label">Ticket médio</div><div className="k-value">{formatBRL(stats.avgTicket)}</div><div className="k-sub">por encomenda</div></div>
          <div className="kpi good"><span className="k-emoji">💰</span><div className="k-label">Já recebido</div><div className="k-value">{formatBRL(stats.received)}</div><div className="k-sub">entradas no caixa</div></div>
          <div className={`kpi${stats.toReceive > 0 ? ' warn' : ''}`}><span className="k-emoji">⏳</span><div className="k-label">A receber</div><div className="k-value">{formatBRL(stats.toReceive)}</div><div className="k-sub">de encomendas</div></div>
          <div className={`kpi${stats.balance >= 0 ? ' good' : ' warn'}`}><span className="k-emoji">🏦</span><div className="k-label">Saldo do caixa</div><div className="k-value">{formatBRL(stats.balance)}</div><div className="k-sub">saídas: {formatBRL(stats.expenses)}</div></div>
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <div className="row spread wrap">
            <div>
              <div className="k-label bold muted small" style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>Lucro estimado das encomendas</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: profit >= 0 ? 'var(--green)' : 'var(--orange)' }}>{formatBRL(profit)}</div>
            </div>
            <p className="small muted" style={{ maxWidth: 320 }}>Calculado com o custo atual dos seus produtos, já descontando as despesas gerais.</p>
          </div>
          {settings.monthlyGoal > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="row spread small bold"><span>Meta do mês: {formatBRLShort(settings.monthlyGoal)}</span><span>{Math.round(goalPct)}%</span></div>
              <div className="progress" style={{ marginTop: 6 }}><div style={{ width: `${goalPct}%` }} /></div>
              {goalPct >= 100 && <p className="small bold" style={{ color: 'var(--green)', marginTop: 6 }}>Meta batida! Parabéns, {firstName}! 🎉</p>}
            </div>
          )}
        </div>
      </section>

      <div className="two-col">
        <section>
          <div className="section-title" style={{ marginTop: 0 }}><h2>Próximas entregas</h2><Link to="/encomendas" className="bold small">Ver todas</Link></div>
          {upcoming.length === 0 ? (
            <div className="card muted">Nenhuma entrega para os próximos 7 dias. Que tal divulgar seus pãezinhos? 📣</div>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {upcoming.slice(0, 4).map((o) => (
                <div key={o.id}>
                  <div className="day-head" style={{ margin: '0 0 6px' }}>{o.date === today ? 'Hoje' : o.date === addDays(today, 1) ? 'Amanhã' : formatLongDay(o.date)}</div>
                  <OrderCard order={o} txs={txs} onEdit={() => setEditing(o)} onPay={(remaining) => setPaying({ order: o, remaining })} />
                </div>
              ))}
              {upcoming.length > 4 && <Link to="/encomendas" className="btn block">Ver mais {upcoming.length - 4} encomendas</Link>}
            </div>
          )}
        </section>

        <div className="stack">
          <section>
            <div className="section-title" style={{ marginTop: 0 }}><h2>O que assar 🔥</h2></div>
            <div className="card">
              <div className="chips">
                {([['hoje', 'Hoje'], ['amanha', 'Amanhã'], ['semana', '7 dias']] as [Range, string][]).map(([id, l]) => (
                  <button key={id} className={`chip${range === id ? ' on' : ''}`} onClick={() => setRange(id)}>{l}</button>
                ))}
              </div>
              {production.length === 0 ? <p className="muted">Nada para produzir neste período 😌</p> : (
                <div className="prod-list">{production.map((p) => <div className="prod-row" key={p.name}><span>{p.name}</span><span className="qty">{p.qty}</span></div>)}</div>
              )}
            </div>
          </section>

          <section>
            <div className="section-title" style={{ marginTop: 0 }}><h2>Últimos meses</h2></div>
            <div className="card">
              <div className="legend" style={{ marginBottom: 8 }}><span><i style={{ background: '#b8352a' }} />Faturamento</span><span><i style={{ background: '#e9a82b' }} />Despesas</span></div>
              <MonthlyChart data={months} />
            </div>
          </section>

          {top.length > 0 && (
            <section>
              <div className="section-title" style={{ marginTop: 0 }}><h2>Campeões do mês 🏆</h2></div>
              <div className="card"><HBars rows={top.map((t) => ({ label: t.name, value: t.revenue, display: `${t.qty} un · ${formatBRL(t.revenue)}` }))} /></div>
            </section>
          )}
        </div>
      </div>

      {editing && <OrderForm initial={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {paying && <PaymentForm order={paying.order} remaining={paying.remaining} onClose={() => setPaying(null)} />}
      {cash && <TransactionForm type="saida" onClose={() => setCash(false)} />}
    </div>
  )
}
