import { db } from './db'
import type { Order, OrderStatus, Transaction } from './types'
import { todayISO } from '../lib/dates'
import { orderPaid, orderTotal } from '../lib/orders'
import { round2 } from '../lib/money'

export async function saveOrder(order: Order): Promise<number> {
  if (order.id != null) {
    await db.orders.put(order)
    return order.id
  }
  return (await db.orders.add(order)) as number
}

export async function setOrderStatus(id: number, status: OrderStatus) {
  await db.orders.update(id, { status })
}

export async function deleteOrder(id: number) {
  await db.transaction('rw', db.orders, db.transactions, async () => {
    await db.transactions.where('orderId').equals(id).delete()
    await db.orders.delete(id)
  })
}

export async function registerPayment(
  order: Order,
  amount: number,
  method: string,
  date = todayISO(),
): Promise<void> {
  const tx: Transaction = {
    type: 'entrada',
    date,
    description: `Encomenda de ${order.customerName}`,
    category: 'Vendas',
    amount: round2(amount),
    method,
    orderId: order.id!,
    createdAt: Date.now(),
  }
  await db.transactions.add(tx)
}

/** Valor que ainda falta receber da encomenda. */
export async function remainingToPay(order: Order): Promise<number> {
  const txs = await db.transactions.where('orderId').equals(order.id!).toArray()
  return round2(Math.max(0, orderTotal(order) - orderPaid(order.id!, txs)))
}
