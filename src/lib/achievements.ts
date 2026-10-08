import type { Order, Product, Settings, Transaction } from '../db/types'
import { parseISODate, toISODate } from './dates'
import type { Econ } from './goals'
import { isActive, orderTotal } from './orders'

export interface Achievement {
  id: string
  emoji: string
  title: string
  desc: string
  unlocked: boolean
}

export interface AchievementInput {
  settings: Pick<Settings, 'monthlyProfitGoal' | 'lastBackupAt' | 'celebrated'>
  products: Product[]
  econs: Econ[]
  orders: Order[]
  txs: Transaction[]
  today: string
}

/** Segunda-feira da semana, em ISO. */
function weekStart(iso: string): string {
  const d = parseISODate(iso)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return toISODate(d)
}

/** Semanas seguidas com pelo menos uma encomenda (contando a semana atual ou a anterior como "viva"). */
export function weeklyStreak(orders: Order[], today: string): number {
  const weeks = new Set(orders.filter(isActive).map((o) => weekStart(o.date)))
  let cursor = weekStart(today)
  if (!weeks.has(cursor)) {
    const prev = parseISODate(cursor)
    prev.setDate(prev.getDate() - 7)
    cursor = toISODate(prev)
  }
  let n = 0
  while (weeks.has(cursor)) {
    n++
    const d = parseISODate(cursor)
    d.setDate(d.getDate() - 7)
    cursor = toISODate(d)
  }
  return n
}

export function computeAchievements({ settings, products, econs, orders, txs, today }: AchievementInput): Achievement[] {
  const active = orders.filter(isActive)
  const celebrated = settings.celebrated ?? []
  const revenue = active.reduce((s, o) => s + orderTotal(o), 0)
  const counts = new Map<string, number>()
  for (const o of active) {
    const k = o.customerName.trim().toLowerCase()
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const hasRepeat = [...counts.values()].some((n) => n >= 2)
  const hasMilestone = (pct: number) => celebrated.some((c) => c.startsWith('m:') && c.endsWith(`:${pct}`))

  const defs: [string, string, string, string, boolean][] = [
    ['goal_set', '🎯', 'Sonhar grande', 'Definiu a meta de lucro do mês', settings.monthlyProfitGoal > 0],
    ['first_product', '📖', 'Receita na mão', 'Cadastrou o primeiro produto', products.length > 0],
    ['healthy_prices', '💎', 'Preço de quem sabe', '3 ou mais produtos com lucro saudável', econs.length >= 3 && econs.every((e) => e.health === 'saudavel')],
    ['first_order', '📋', 'Primeira encomenda', 'Anotou a primeira encomenda', active.length > 0],
    ['first_delivery', '🛵', 'Entrega com carinho', 'Entregou a primeira encomenda', active.some((o) => o.status === 'entregue')],
    ['orders_10', '🥖', 'Forno aceso', '10 encomendas anotadas', active.length >= 10],
    ['repeat_customer', '💛', 'Cliente que volta', 'Um cliente já encomendou 2 vezes', hasRepeat],
    ['revenue_1000', '💰', 'Primeiro mil', 'R$ 1.000 em encomendas', revenue >= 1000],
    ['streak_4', '🔥', 'Mês de fogo', '4 semanas seguidas com encomendas', weeklyStreak(orders, today) >= 4],
    ['cash_5', '🧾', 'Caixa em dia', '5 lançamentos no caixa', txs.length >= 5],
    ['backup', '🔒', 'Dados seguros', 'Fez um backup', settings.lastBackupAt != null],
    ['goal_50', '⭐', 'Meio caminho andado', 'Chegou a 50% da meta', hasMilestone(50)],
    ['goal_100', '🏆', 'Meta batida!', 'Bateu a meta de lucro do mês', hasMilestone(100)],
  ]
  return defs.map(([id, emoji, title, desc, unlocked]) => ({ id, emoji, title, desc, unlocked: unlocked || celebrated.includes(id) }))
}
