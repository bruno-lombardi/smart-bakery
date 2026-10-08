import type { Ingredient, Order, Product, Transaction } from '../db/types'
import { addMonths, monthKey, shortMonthLabel } from './dates'
import { round2 } from './money'
import { computeCost, sellingPrice } from './pricing'
import { isActive, orderPaid, orderTotal } from './orders'
import type { Settings } from '../db/types'

export interface MonthStats {
  /** Soma dos pedidos do mês (não cancelados), por data de entrega */
  revenue: number
  orders: number
  avgTicket: number
  /** Entradas registradas no caixa no mês */
  received: number
  expenses: number
  balance: number
  /** Pedidos do mês ainda não pagos por completo */
  toReceive: number
  unitsSold: number
}

export function monthStats(month: string, orders: Order[], txs: Transaction[]): MonthStats {
  const mo = orders.filter((o) => isActive(o) && monthKey(o.date) === month)
  const revenue = round2(mo.reduce((s, o) => s + orderTotal(o), 0))
  const mt = txs.filter((t) => monthKey(t.date) === month)
  const received = round2(mt.filter((t) => t.type === 'entrada').reduce((s, t) => s + t.amount, 0))
  const expenses = round2(mt.filter((t) => t.type === 'saida').reduce((s, t) => s + t.amount, 0))
  const toReceive = round2(
    mo.reduce((s, o) => s + Math.max(0, orderTotal(o) - orderPaid(o.id!, txs)), 0),
  )
  return {
    revenue,
    orders: mo.length,
    avgTicket: mo.length ? round2(revenue / mo.length) : 0,
    received,
    expenses,
    balance: round2(received - expenses),
    toReceive,
    unitsSold: mo.reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0), 0),
  }
}

export interface MonthPoint {
  key: string
  label: string
  revenue: number
  expenses: number
}

export function lastMonths(count: number, endMonth: string, orders: Order[], txs: Transaction[]): MonthPoint[] {
  const out: MonthPoint[] = []
  for (let i = count - 1; i >= 0; i--) {
    const key = addMonths(endMonth, -i)
    const s = monthStats(key, orders, txs)
    out.push({ key, label: shortMonthLabel(key), revenue: s.revenue, expenses: s.expenses })
  }
  return out
}

export interface TopProduct {
  name: string
  qty: number
  revenue: number
}

export function topProducts(month: string, orders: Order[], limit = 5): TopProduct[] {
  const map = new Map<string, TopProduct>()
  for (const o of orders) {
    if (!isActive(o) || monthKey(o.date) !== month) continue
    for (const i of o.items) {
      const cur = map.get(i.name) ?? { name: i.name, qty: 0, revenue: 0 }
      cur.qty += i.qty
      cur.revenue += i.qty * i.unitPrice
      map.set(i.name, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}

/** Lucro estimado dos pedidos do mês a partir do custo atual dos produtos. */
export function estimatedProfit(
  month: string,
  orders: Order[],
  products: Product[],
  ingredients: Map<number, Ingredient>,
  s: Pick<Settings, 'hourlyRate' | 'overheadPct' | 'roundTo' | 'defaultMarginPct'>,
): number {
  const byId = new Map(products.map((p) => [p.id!, p]))
  let profit = 0
  for (const o of orders) {
    if (!isActive(o) || monthKey(o.date) !== month) continue
    for (const i of o.items) {
      const p = i.productId != null ? byId.get(i.productId) : undefined
      if (!p) {
        // item avulso, sem receita: assume a margem padrão
        profit += i.qty * i.unitPrice * (s.defaultMarginPct / 100)
        continue
      }
      const unitCost = computeCost(p, ingredients, s.hourlyRate).unitCost
      const overhead = i.unitPrice * (s.overheadPct / 100)
      profit += i.qty * (i.unitPrice - unitCost - overhead)
    }
    profit += (o.deliveryFee || 0) - (o.discount || 0)
  }
  return round2(profit)
}

export { sellingPrice }
