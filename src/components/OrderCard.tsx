import { deleteOrder, setOrderStatus } from '../db/actions'
import type { Order, Transaction } from '../db/types'
import { formatBRL } from '../lib/money'
import { NEXT_ACTION, PAYMENT_LABEL, STATUS_LABEL, nextStatus, orderPaid, orderTotal, paymentState, whatsappLink } from '../lib/orders'
import { useFeedback } from './Feedback'
import { Icon } from './Icon'

const CHEERS = [
  'Mais um pãozinho entregue com carinho! 🍞',
  'Que delícia! Cliente feliz, coração quentinho 💛',
  'Entregue! Pão macio faz o dia de alguém melhor 🥖',
]

export function OrderCard({
  order,
  txs,
  onEdit,
  onPay,
}: {
  order: Order
  txs: Transaction[]
  onEdit: () => void
  onPay: (remaining: number) => void
}) {
  const { toast, confirm } = useFeedback()
  const total = orderTotal(order)
  const paid = orderPaid(order.id!, txs)
  const pay = paymentState(total, paid)
  const remaining = Math.max(0, total - paid)
  const next = nextStatus(order.status)
  const closed = order.status === 'entregue' || order.status === 'cancelado'
  const wa = whatsappLink(order.phone, `Olá, ${order.customerName.split(' ')[0]}! Aqui é a Ana Paula, da Pães & Afeto 🥖 `)

  async function advance() {
    if (!next) return
    await setOrderStatus(order.id!, next)
    if (next === 'entregue') toast(CHEERS[Math.floor(Math.random() * CHEERS.length)])
  }

  async function cancel() {
    if (!(await confirm({ title: 'Cancelar encomenda?', text: `A encomenda de ${order.customerName} ficará como cancelada.`, confirmLabel: 'Cancelar encomenda', danger: true }))) return
    await setOrderStatus(order.id!, 'cancelado')
  }

  async function remove() {
    if (!(await confirm({ title: 'Excluir de vez?', text: 'A encomenda e os pagamentos dela no caixa serão apagados.', confirmLabel: 'Excluir', danger: true }))) return
    await deleteOrder(order.id!)
  }

  return (
    <article className={`order-card${closed ? ' done' : ''}`}>
      <div className="row spread wrap">
        <div>
          <div className="who">{order.customerName}</div>
          <div className="small muted">
            {order.time ? `🕐 ${order.time} · ` : ''}
            {order.delivery === 'entrega' ? '🛵 Entrega' : '🏠 Retirada'}
            {order.delivery === 'entrega' && order.address ? ` · ${order.address}` : ''}
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <span className={`badge ${order.status}`}>{STATUS_LABEL[order.status]}</span>
          {order.status !== 'cancelado' && <span className={`badge ${pay}`}>{PAYMENT_LABEL[pay]}</span>}
        </div>
      </div>

      <ul>
        {order.items.map((i, n) => (
          <li key={n}><span>{i.qty}× {i.name}</span><span className="muted">{formatBRL(i.qty * i.unitPrice)}</span></li>
        ))}
        {order.deliveryFee > 0 && <li className="muted"><span>Taxa de entrega</span><span>{formatBRL(order.deliveryFee)}</span></li>}
        {order.discount > 0 && <li className="muted"><span>Desconto</span><span>−{formatBRL(order.discount)}</span></li>}
      </ul>
      {order.notes && <p className="small muted">📝 {order.notes}</p>}

      <div className="row spread wrap">
        <div className="amount" style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--red)' }}>
          {formatBRL(total)}
          {pay === 'parcial' && <span className="small muted" style={{ fontFamily: 'var(--font-body)' }}> · falta {formatBRL(remaining)}</span>}
        </div>
        <div className="actions">
          {order.status !== 'cancelado' && remaining > 0.004 && (
            <button className="btn sm green" onClick={() => onPay(remaining)}>💰 Receber</button>
          )}
          {next && <button className="btn sm primary" onClick={advance}>{NEXT_ACTION[order.status]}</button>}
        </div>
      </div>

      <div className="row wrap" style={{ gap: 4, borderTop: '1.5px dashed var(--line)', paddingTop: 8 }}>
        {wa && <a className="btn ghost sm" href={wa} target="_blank" rel="noreferrer"><Icon name="whats" /> WhatsApp</a>}
        <button className="btn ghost sm" onClick={onEdit}><Icon name="edit" /> Editar</button>
        {order.status !== 'cancelado' && order.status !== 'entregue' && (
          <button className="btn ghost sm" onClick={cancel}>Cancelar</button>
        )}
        {order.status === 'cancelado' && <button className="btn ghost sm" onClick={() => setOrderStatus(order.id!, 'novo')}>Reativar</button>}
        <button className="btn ghost sm" onClick={remove} aria-label="Excluir encomenda"><Icon name="trash" /></button>
      </div>
    </article>
  )
}
