import { useState } from 'react'
import { registerPayment } from '../db/actions'
import type { Order } from '../db/types'
import { PAYMENT_METHODS } from '../lib/categories'
import { todayISO } from '../lib/dates'
import { formatBRL } from '../lib/money'
import { Field, MoneyInput } from './Fields'
import { useFeedback } from './Feedback'
import { Modal } from './Modal'

export function PaymentForm({ order, remaining, onClose }: { order: Order; remaining: number; onClose: () => void }) {
  const { toast } = useFeedback()
  const [amount, setAmount] = useState<number | null>(remaining)
  const [method, setMethod] = useState(PAYMENT_METHODS[0])
  const [date, setDate] = useState(todayISO())
  const valid = (amount ?? 0) > 0

  async function save() {
    await registerPayment(order, amount!, method, date)
    toast(`Recebido ${formatBRL(amount!)} de ${order.customerName} 💰`)
    onClose()
  }

  return (
    <Modal
      small
      title="Receber pagamento"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn green" disabled={!valid} onClick={save}>Registrar</button>
        </>
      }
    >
      <p>
        <b>{order.customerName}</b> ainda deve <b>{formatBRL(remaining)}</b>.
      </p>
      <Field label="Quanto recebeu?" htmlFor="pay-amt"><MoneyInput id="pay-amt" value={amount} onChange={setAmount} /></Field>
      <div className="grid2">
        <Field label="Forma" htmlFor="pay-method">
          <select id="pay-method" className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Data" htmlFor="pay-date"><input id="pay-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}
