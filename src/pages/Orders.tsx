import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOrders, useTransactions } from '../db/hooks'
import type { Order } from '../db/types'
import { EmptyState } from '../components/Brand'
import { Icon } from '../components/Icon'
import { OrderCard } from '../components/OrderCard'
import { OrderForm } from '../components/OrderForm'
import { PaymentForm } from '../components/PaymentForm'
import { formatDay, formatLongDay, todayISO } from '../lib/dates'
import { orderPaid, orderTotal, productionList } from '../lib/orders'

type Filter = 'abertas' | 'hoje' | 'receber' | 'entregues' | 'todas'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'abertas', label: 'Em aberto' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'receber', label: 'A receber' },
  { id: 'entregues', label: 'Entregues' },
  { id: 'todas', label: 'Todas' },
]

export default function Orders() {
  const orders = useOrders()
  const txs = useTransactions()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('abertas')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Order | 'new' | null>(params.get('nova') ? 'new' : null)
  const [paying, setPaying] = useState<{ order: Order; remaining: number } | null>(null)

  const filtered = useMemo(() => {
    if (!orders || !txs) return []
    const today = todayISO()
    const q = query.trim().toLowerCase()
    return orders
      .filter((o) => {
        if (q && !o.customerName.toLowerCase().includes(q) && !o.items.some((i) => i.name.toLowerCase().includes(q))) return false
        const open = o.status !== 'entregue' && o.status !== 'cancelado'
        switch (filter) {
          case 'abertas': return open
          case 'hoje': return o.date === today && o.status !== 'cancelado'
          case 'receber': return o.status !== 'cancelado' && orderTotal(o) - orderPaid(o.id!, txs) > 0.004
          case 'entregues': return o.status === 'entregue'
          default: return true
        }
      })
      .sort((a, b) => (filter === 'entregues' || filter === 'todas' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)) || a.time.localeCompare(b.time))
  }, [orders, txs, filter, query])

  const groups = useMemo(() => {
    const m = new Map<string, Order[]>()
    for (const o of filtered) m.set(o.date, [...(m.get(o.date) ?? []), o])
    return [...m.entries()]
  }, [filtered])

  const production = useMemo(() => {
    const today = todayISO()
    return productionList((orders ?? []).filter((o) => o.date === today))
  }, [orders])

  const closeForm = () => {
    setEditing(null)
    if (params.get('nova')) setParams({}, { replace: true })
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Encomendas</h1>
          <p>Tudo que precisa sair do forno, organizado por dia.</p>
        </div>
        <button className="btn primary" onClick={() => setEditing('new')}><Icon name="plus" /> Nova encomenda</button>
      </div>

      <div className="chips" role="tablist" aria-label="Filtros">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={filter === f.id} className={`chip${filter === f.id ? ' on' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>
      <input className="input" type="search" placeholder="🔍 Buscar por cliente ou produto" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar" style={{ marginBottom: 6 }} />

      {filter === 'hoje' && production.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginBottom: 8 }}>Para assar hoje 🔥</h3>
          <div className="prod-list">
            {production.map((p) => <div className="prod-row" key={p.name}><span>{p.name}</span><span className="qty">{p.qty}</span></div>)}
          </div>
        </div>
      )}

      {orders && groups.length === 0 ? (
        <div className="card" style={{ marginTop: 12 }}>
          <EmptyState
            title={orders.length === 0 ? 'Nenhuma encomenda ainda' : 'Nada por aqui'}
            text={orders.length === 0 ? 'Quando alguém pedir pãezinhos, anote aqui e o painel cuida do resto.' : 'Tente outro filtro ou outra busca.'}
            action={orders.length === 0 ? <button className="btn primary" onClick={() => setEditing('new')}><Icon name="plus" /> Anotar primeira encomenda</button> : undefined}
          />
        </div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {groups.map(([date, list]) => (
            <section key={date} className="stack" style={{ gap: 12 }}>
              <div className="day-head">{formatDay(date)} <span className="small muted" style={{ fontFamily: 'var(--font-body)', fontWeight: 600 }}>{['Hoje', 'Amanhã', 'Ontem'].includes(formatDay(date)) ? formatLongDay(date) : ''}</span></div>
              {list.map((o) => (
                <OrderCard key={o.id} order={o} txs={txs ?? []} onEdit={() => setEditing(o)} onPay={(remaining) => setPaying({ order: o, remaining })} />
              ))}
            </section>
          ))}
        </div>
      )}

      {editing && <OrderForm initial={editing === 'new' ? undefined : editing} onClose={closeForm} />}
      {paying && <PaymentForm order={paying.order} remaining={paying.remaining} onClose={() => setPaying(null)} />}
    </div>
  )
}

