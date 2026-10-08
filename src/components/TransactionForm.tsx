import { useState } from 'react'
import { db } from '../db/db'
import type { Transaction, TxType } from '../db/types'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS } from '../lib/categories'
import { todayISO } from '../lib/dates'
import { Field, MoneyInput } from './Fields'
import { useFeedback } from './Feedback'
import { Modal } from './Modal'

export function TransactionForm({ initial, type: initialType, onClose }: { initial?: Transaction; type?: TxType; onClose: () => void }) {
  const { toast } = useFeedback()
  const [type, setType] = useState<TxType>(initial?.type ?? initialType ?? 'saida')
  const cats = type === 'entrada' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const [amount, setAmount] = useState<number | null>(initial?.amount ?? null)
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? cats[0])
  const switchType = (t: TxType) => {
    setType(t)
    setCategory((t === 'entrada' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0])
  }
  const [method, setMethod] = useState(initial?.method ?? PAYMENT_METHODS[0])
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const valid = (amount ?? 0) > 0

  async function save() {
    const data: Transaction = {
      ...(initial ?? { orderId: null, createdAt: Date.now() }),
      type,
      date,
      amount: amount!,
      description: description.trim() || category,
      category,
      method,
    } as Transaction
    if (initial?.id != null) await db.transactions.put(data)
    else await db.transactions.add(data)
    toast(type === 'entrada' ? 'Entrada registrada 💰' : 'Saída registrada ✓')
    onClose()
  }

  return (
    <Modal
      small
      title={`${initial ? 'Editar' : 'Nova'} ${type === 'entrada' ? 'entrada' : 'saída'}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className={`btn ${type === 'entrada' ? 'green' : 'primary'}`} disabled={!valid} onClick={save}>Salvar</button>
        </>
      }
    >
      {!initial && (
        <div className="seg">
          <button type="button" className={type === 'entrada' ? 'on' : ''} onClick={() => switchType('entrada')}>💰 Entrou</button>
          <button type="button" className={type === 'saida' ? 'on' : ''} onClick={() => switchType('saida')}>🧾 Saiu</button>
        </div>
      )}
      <Field label="Valor" htmlFor="t-amt"><MoneyInput id="t-amt" value={amount} onChange={setAmount} /></Field>
      <Field label="Descrição" htmlFor="t-desc">
        <input id="t-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type === 'saida' ? 'Ex.: Saco de farinha 5kg' : 'Ex.: Venda na feirinha'} />
      </Field>
      <div className="grid2">
        <Field label="Categoria" htmlFor="t-cat">
          <select id="t-cat" className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {[...new Set([...cats, category])].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Forma" htmlFor="t-method">
          <select id="t-method" className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Data" htmlFor="t-date"><input id="t-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
    </Modal>
  )
}
