import { useMemo, useState } from 'react'
import { db } from '../db/db'
import { useOrders, useTransactions } from '../db/hooks'
import type { Transaction, TxType } from '../db/types'
import { EmptyState } from '../components/Brand'
import { HBars } from '../components/Charts'
import { useFeedback } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { TransactionForm } from '../components/TransactionForm'
import { addMonths, currentMonthKey, formatDay, monthKey, monthLabel } from '../lib/dates'
import { formatBRL } from '../lib/money'
import { monthStats } from '../lib/stats'

type Filter = 'todos' | TxType

export default function Cashflow() {
  const txs = useTransactions()
  const orders = useOrders()
  const { confirm, toast } = useFeedback()
  const [month, setMonth] = useState(currentMonthKey())
  const [filter, setFilter] = useState<Filter>('todos')
  const [form, setForm] = useState<{ tx?: Transaction; type?: TxType } | null>(null)

  const stats = useMemo(() => monthStats(month, orders ?? [], txs ?? []), [month, orders, txs])
  const monthTx = useMemo(
    () => (txs ?? []).filter((t) => monthKey(t.date) === month && (filter === 'todos' || t.type === filter)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [txs, month, filter],
  )
  const byDay = useMemo(() => {
    const m = new Map<string, Transaction[]>()
    for (const t of monthTx) m.set(t.date, [...(m.get(t.date) ?? []), t])
    return [...m.entries()]
  }, [monthTx])

  const expenseByCat = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of txs ?? []) if (t.type === 'saida' && monthKey(t.date) === month) m.set(t.category, (m.get(t.category) ?? 0) + t.amount)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, display: formatBRL(value) }))
  }, [txs, month])

  async function remove(t: Transaction) {
    if (!(await confirm({ title: 'Excluir lançamento?', text: `${t.description} · ${formatBRL(t.amount)}`, confirmLabel: 'Excluir', danger: true }))) return
    await db.transactions.delete(t.id!)
    toast('Lançamento excluído')
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Caixa</h1>
          <p>O que entrou e o que saiu, sem complicação.</p>
        </div>
        <div className="row">
          <button className="btn green" onClick={() => setForm({ type: 'entrada' })}><Icon name="arrowUp" /> Entrada</button>
          <button className="btn primary" onClick={() => setForm({ type: 'saida' })}><Icon name="arrowDown" /> Saída</button>
        </div>
      </div>

      <div className="row spread card" style={{ padding: '8px 10px', marginBottom: 12 }}>
        <button className="btn ghost icon-btn" aria-label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))}><Icon name="back" /></button>
        <div className="eyebrow" style={{ textTransform: 'capitalize', fontSize: '1.05rem' }}>{monthLabel(month)}</div>
        <button className="btn ghost icon-btn" aria-label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))}><Icon name="next" /></button>
      </div>

      <div className="kpis">
        <div className="kpi good"><div className="k-label">Entrou</div><div className="k-value">{formatBRL(stats.received)}</div></div>
        <div className="kpi"><div className="k-label">Saiu</div><div className="k-value" style={{ color: 'var(--maroon)' }}>{formatBRL(stats.expenses)}</div></div>
        <div className={`kpi accent`} style={{ gridColumn: 'span 2' }}>
          <div className="k-label">Saldo do mês</div>
          <div className="k-value">{formatBRL(stats.balance)}</div>
          {stats.toReceive > 0 && <div className="k-sub">+ {formatBRL(stats.toReceive)} ainda a receber de encomendas</div>}
        </div>
      </div>

      {expenseByCat.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Para onde foi o dinheiro</h3>
          <HBars rows={expenseByCat} />
        </div>
      )}

      <div className="section-title"><h2>Lançamentos</h2></div>
      <div className="chips">
        {(['todos', 'entrada', 'saida'] as Filter[]).map((f) => (
          <button key={f} className={`chip${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>{f === 'todos' ? 'Todos' : f === 'entrada' ? 'Entradas' : 'Saídas'}</button>
        ))}
      </div>

      {byDay.length === 0 ? (
        <div className="card"><EmptyState title="Nenhum lançamento neste mês" text="Anote o que comprou e o que recebeu. Pagamentos de encomendas entram sozinhos aqui." /></div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {byDay.map(([date, list]) => (
            <section key={date} className="stack" style={{ gap: 8 }}>
              <div className="day-head">{formatDay(date)}</div>
              {list.map((t) => (
                <div className="item" key={t.id} style={{ cursor: 'default' }}>
                  <div className="emoji">{t.type === 'entrada' ? '💰' : '🧾'}</div>
                  <div className="grow">
                    <div className="title">{t.description}</div>
                    <div className="small muted">{t.category} · {t.method}{t.orderId ? ' · encomenda' : ''}</div>
                  </div>
                  <div className={`amount ${t.type === 'entrada' ? 'in' : 'out'}`}>{t.type === 'entrada' ? '+' : '−'}{formatBRL(t.amount)}</div>
                  <div className="row" style={{ gap: 0 }}>
                    <button className="btn ghost icon-btn" aria-label="Editar" onClick={() => setForm({ tx: t })}><Icon name="edit" /></button>
                    <button className="btn ghost icon-btn" aria-label="Excluir" onClick={() => remove(t)}><Icon name="trash" /></button>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      {form && <TransactionForm initial={form.tx} type={form.type} onClose={() => setForm(null)} />}
    </div>
  )
}
