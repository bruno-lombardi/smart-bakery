import type { Order, OrderStatus, Transaction } from '../db/types'
import { round2 } from './money'

export const STATUS_LABEL: Record<OrderStatus, string> = {
  novo: 'Novo',
  producao: 'Em produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export const STATUS_FLOW: OrderStatus[] = ['novo', 'producao', 'pronto', 'entregue']

export const NEXT_ACTION: Partial<Record<OrderStatus, string>> = {
  novo: 'Começar a produzir',
  producao: 'Marcar como pronto',
  pronto: 'Marcar como entregue',
}

export function nextStatus(s: OrderStatus): OrderStatus | null {
  const i = STATUS_FLOW.indexOf(s)
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null
}

export const itemsTotal = (o: Pick<Order, 'items'>) =>
  round2(o.items.reduce((s, i) => s + i.qty * i.unitPrice, 0))

export const orderTotal = (o: Pick<Order, 'items' | 'deliveryFee' | 'discount'>) =>
  round2(Math.max(0, itemsTotal(o) + (o.deliveryFee || 0) - (o.discount || 0)))

export const orderPaid = (orderId: number, txs: Transaction[]) =>
  round2(txs.filter((t) => t.orderId === orderId && t.type === 'entrada').reduce((s, t) => s + t.amount, 0))

export type PaymentState = 'pago' | 'parcial' | 'pendente'

export function paymentState(total: number, paid: number): PaymentState {
  if (total > 0 && paid >= total - 0.005) return 'pago'
  if (paid > 0) return 'parcial'
  return total === 0 ? 'pago' : 'pendente'
}

export const PAYMENT_LABEL: Record<PaymentState, string> = {
  pago: 'Pago',
  parcial: 'Pago parcial',
  pendente: 'A receber',
}

export const isActive = (o: Pick<Order, 'status'>) => o.status !== 'cancelado'

/** Soma o que precisa ser produzido, por produto. */
export function productionList(orders: Order[]): { name: string; qty: number }[] {
  const map = new Map<string, number>()
  for (const o of orders) {
    if (o.status === 'cancelado' || o.status === 'entregue') continue
    for (const i of o.items) map.set(i.name, (map.get(i.name) ?? 0) + i.qty)
  }
  return [...map.entries()].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty)
}

export function whatsappLink(phone: string, text?: string): string | null {
  let digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  if (digits.length <= 11) digits = `55${digits}`
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
