import { useMemo, useState } from 'react'
import { registerPayment, saveOrder } from '../db/actions'
import { useIngredientMap, useOrders, useProducts, useSettings } from '../db/hooks'
import type { DeliveryType, Order, OrderItem } from '../db/types'
import { PAYMENT_METHODS } from '../lib/categories'
import { addDays, todayISO } from '../lib/dates'
import { formatBRL } from '../lib/money'
import { orderTotal } from '../lib/orders'
import { sellingPrice } from '../lib/pricing'
import { Field, MoneyInput, Stepper } from './Fields'
import { useFeedback } from './Feedback'
import { Icon } from './Icon'
import { Modal } from './Modal'
import { ProductIcon } from './ProductIcon'

export function OrderForm({ initial, onClose }: { initial?: Order; onClose: () => void }) {
  const { toast } = useFeedback()
  const products = (useProducts() ?? []).filter((p) => p.active)
  const ingMap = useIngredientMap()
  const settings = useSettings()
  const pastOrders = useOrders() ?? []

  const [customer, setCustomer] = useState(initial?.customerName ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [date, setDate] = useState(initial?.date ?? addDays(todayISO(), 1))
  const [time, setTime] = useState(initial?.time ?? '')
  const [delivery, setDelivery] = useState<DeliveryType>(initial?.delivery ?? 'retirada')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [items, setItems] = useState<OrderItem[]>(initial?.items ?? [])
  const [fee, setFee] = useState<number | null>(initial?.deliveryFee || null)
  const [discount, setDiscount] = useState<number | null>(initial?.discount || null)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [paidNow, setPaidNow] = useState<number | null>(null)
  const [method, setMethod] = useState(PAYMENT_METHODS[0])

  const customers = useMemo(() => {
    const m = new Map<string, Order>()
    for (const o of [...pastOrders].sort((a, b) => a.createdAt - b.createdAt)) m.set(o.customerName.toLowerCase(), o)
    return m
  }, [pastOrders])

  const total = orderTotal({ items, deliveryFee: fee ?? 0, discount: discount ?? 0 })
  const valid = customer.trim() !== '' && items.length > 0 && items.every((i) => i.qty > 0 && i.name.trim() !== '')

  function addProduct(id: number) {
    const p = products.find((x) => x.id === id)!
    setItems((cur) => {
      const idx = cur.findIndex((i) => i.productId === id)
      if (idx >= 0) return cur.map((i, n) => (n === idx ? { ...i, qty: i.qty + 1 } : i))
      return [...cur, { productId: id, name: p.name, qty: 1, unitPrice: sellingPrice(p, ingMap, settings) }]
    })
  }

  function onCustomerBlur() {
    const known = customers.get(customer.trim().toLowerCase())
    if (known && !initial) {
      if (!phone) setPhone(known.phone)
      if (!address && known.address) setAddress(known.address)
    }
  }

  const patchItem = (i: number, patch: Partial<OrderItem>) =>
    setItems((cur) => cur.map((it, n) => (n === i ? { ...it, ...patch } : it)))

  async function save() {
    const order: Order = {
      ...(initial ?? { status: 'novo', createdAt: Date.now() }),
      customerName: customer.trim(),
      phone: phone.trim(),
      items,
      date,
      time,
      delivery,
      address: delivery === 'entrega' ? address.trim() : '',
      deliveryFee: fee ?? 0,
      discount: discount ?? 0,
      notes: notes.trim(),
    } as Order
    const id = await saveOrder(order)
    if (!initial && (paidNow ?? 0) > 0) await registerPayment({ ...order, id }, paidNow!, method)
    toast(initial ? 'Encomenda atualizada ✓' : 'Encomenda anotada! 🥖')
    onClose()
  }

  return (
    <Modal
      wide
      title={initial ? 'Editar encomenda' : 'Nova encomenda'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={!valid} onClick={save}>Salvar · {formatBRL(total)}</button>
        </>
      }
    >
      <div className="grid2">
        <Field label="Nome do cliente" htmlFor="o-name">
          <input id="o-name" className="input" list="customers" value={customer} onChange={(e) => setCustomer(e.target.value)} onBlur={onCustomerBlur} placeholder="Quem encomendou?" autoFocus={!initial} />
          <datalist id="customers">{[...customers.values()].map((o) => <option key={o.customerName} value={o.customerName} />)}</datalist>
        </Field>
        <Field label="WhatsApp" htmlFor="o-phone">
          <input id="o-phone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 90000-0000" />
        </Field>
      </div>

      <div className="grid2">
        <Field label="Para quando?" htmlFor="o-date">
          <input id="o-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="row" style={{ gap: 6 }}>
            {[['Hoje', 0], ['Amanhã', 1], ['+2 dias', 2]].map(([l, d]) => (
              <button key={l} type="button" className={`chip${date === addDays(todayISO(), d as number) ? ' on' : ''}`} onClick={() => setDate(addDays(todayISO(), d as number))}>{l}</button>
            ))}
          </div>
        </Field>
        <Field label="Horário (opcional)" htmlFor="o-time">
          <input id="o-time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>

      <div className="field">
        <span className="label">Como o cliente recebe?</span>
        <div className="seg" style={{ maxWidth: 360 }}>
          <button type="button" className={delivery === 'retirada' ? 'on' : ''} onClick={() => setDelivery('retirada')}>🏠 Retira</button>
          <button type="button" className={delivery === 'entrega' ? 'on' : ''} onClick={() => setDelivery('entrega')}>🛵 Entrega</button>
        </div>
      </div>
      {delivery === 'entrega' && (
        <div className="grid2">
          <Field label="Endereço" htmlFor="o-addr"><input id="o-addr" className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro" /></Field>
          <Field label="Taxa de entrega" htmlFor="o-fee"><MoneyInput id="o-fee" value={fee} onChange={setFee} /></Field>
        </div>
      )}

      <h3>O que vai nessa encomenda?</h3>
      {products.length > 0 ? (
        <div className="field">
          <span className="hint">Toque para adicionar (toque de novo para somar mais um)</span>
          <div className="chips" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
            {products.map((p) => (
              <button key={p.id} type="button" className="chip" onClick={() => addProduct(p.id!)}>
                <ProductIcon icon={p.emoji} /> {p.name} · {formatBRL(sellingPrice(p, ingMap, settings))}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="hint">Dica: cadastre seus produtos em “Preços” para adicionar com um toque. Por enquanto use “Outro item”.</p>
      )}

      <div className="stack" style={{ gap: 10 }}>
        {items.map((it, i) => (
          <div className="recipe-line" key={i}>
            <div className="rl-top">
              <input className="input" aria-label="Item" value={it.name} onChange={(e) => patchItem(i, { name: e.target.value })} placeholder="Nome do item" />
              <button className="btn ghost icon-btn" aria-label="Remover item" onClick={() => setItems((c) => c.filter((_, n) => n !== i))}><Icon name="trash" /></button>
            </div>
            <div className="rl-bottom">
              <Stepper value={it.qty} onChange={(q) => patchItem(i, { qty: q })} />
              <div className="grow"><MoneyInput ariaLabel="Preço de cada" value={it.unitPrice || null} onChange={(n) => patchItem(i, { unitPrice: n ?? 0 })} /></div>
              <b style={{ minWidth: 80, textAlign: 'right' }}>{formatBRL(it.qty * it.unitPrice)}</b>
            </div>
          </div>
        ))}
        <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setItems((c) => [...c, { productId: null, name: '', qty: 1, unitPrice: 0 }])}>
          <Icon name="plus" /> Outro item
        </button>
      </div>

      <div className="grid2">
        <Field label="Desconto" htmlFor="o-disc"><MoneyInput id="o-disc" value={discount} onChange={setDiscount} /></Field>
        {!initial && (
          <Field label="Já pagou algo? (sinal)" htmlFor="o-paid"><MoneyInput id="o-paid" value={paidNow} onChange={setPaidNow} /></Field>
        )}
      </div>
      {!initial && (paidNow ?? 0) > 0 && (
        <Field label="Forma de pagamento" htmlFor="o-method">
          <select id="o-method" className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
      )}
      <Field label="Observações" htmlFor="o-notes">
        <textarea id="o-notes" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: sem sal, embalar para presente…" />
      </Field>
    </Modal>
  )
}
