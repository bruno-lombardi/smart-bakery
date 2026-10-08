import type { Ingredient, Order, Product, Settings } from '../db/types'
import { monthKey, parseISODate } from './dates'
import { round2 } from './money'
import { isActive } from './orders'
import { computeCost, sellingPrice, suggestedPrice } from './pricing'
import { estimatedProfit } from './stats'

export type EconSettings = Pick<Settings, 'hourlyRate' | 'overheadPct' | 'roundTo' | 'defaultMarginPct'>

export type Health = 'saudavel' | 'apertado' | 'critico'

export interface Econ {
  product: Product
  unitCost: number
  price: number
  profitPerUnit: number
  realMarginPct: number
  /** Abaixo disso, vende com prejuízo (cobre custo + despesas gerais) */
  minPrice: number
  /** Preço para atingir a margem desejada do produto */
  suggested: number | null
  targetMargin: number
  health: Health
  profitPerBatch: number
  /** Lucro por hora de trabalho (null se não informou o tempo) */
  profitPerHour: number | null
}

export function productEconomics(
  p: Product,
  ing: Map<number, Ingredient>,
  s: EconSettings,
  priceFactor = 1,
): Econ {
  const cost = computeCost(p, ing, s.hourlyRate)
  const targetMargin = p.marginPct || s.defaultMarginPct
  const suggested = suggestedPrice(cost.unitCost, targetMargin, s.overheadPct, s.roundTo)
  const price = round2(sellingPrice(p, ing, s) * priceFactor)
  const overhead = price * (s.overheadPct / 100)
  const profitPerUnit = price - cost.unitCost - overhead
  const realMarginPct = price > 0 ? (profitPerUnit / price) * 100 : 0
  const yieldQty = Math.max(1, p.yield || 1)
  const profitPerBatch = profitPerUnit * yieldQty
  const hours = (p.laborMinutes || 0) / 60
  const minPrice = round2(Math.ceil((cost.unitCost / (1 - Math.min(0.9, s.overheadPct / 100))) * 100) / 100)
  const health: Health =
    profitPerUnit <= 0 || realMarginPct < 15 ? 'critico' : realMarginPct >= targetMargin - 1 ? 'saudavel' : 'apertado'
  return {
    product: p,
    unitCost: cost.unitCost,
    price,
    profitPerUnit,
    realMarginPct,
    minPrice,
    suggested,
    targetMargin,
    health,
    profitPerBatch,
    profitPerHour: hours > 0 ? profitPerBatch / hours : null,
  }
}

export interface PriceOption {
  id: 'economico' | 'saudavel' | 'premium'
  label: string
  marginPct: number
  price: number
  profitPerUnit: number
}

/** Três caminhos de preço a partir do custo: econômico, saudável (margem padrão) e premium. */
export function priceOptions(unitCost: number, s: EconSettings): PriceOption[] {
  const base = s.defaultMarginPct
  const defs: [PriceOption['id'], string, number][] = [
    ['economico', 'Econômico', Math.max(15, base - 15)],
    ['saudavel', 'Saudável', base],
    ['premium', 'Premium', Math.min(70, base + 15)],
  ]
  const out: PriceOption[] = []
  for (const [id, label, marginPct] of defs) {
    const price = suggestedPrice(unitCost, marginPct, s.overheadPct, s.roundTo)
    if (price == null) continue
    out.push({ id, label, marginPct, price, profitPerUnit: price - unitCost - price * (s.overheadPct / 100) })
  }
  return out
}

/** Unidades vendidas por produto no mês (ou em todo o histórico, se o mês ainda está vazio). */
export function salesMix(orders: Order[], products: Product[], month: string): Map<number, number> {
  const known = new Set(products.map((p) => p.id!))
  const collect = (keep: (o: Order) => boolean) => {
    const m = new Map<number, number>()
    for (const o of orders) {
      if (!isActive(o) || !keep(o)) continue
      for (const i of o.items) if (i.productId != null && known.has(i.productId)) m.set(i.productId, (m.get(i.productId) ?? 0) + i.qty)
    }
    return m
  }
  const thisMonth = collect((o) => monthKey(o.date) === month)
  return thisMonth.size ? thisMonth : collect(() => true)
}

/** Lucro médio por pãozinho, ponderado pelo que ela costuma vender (ou igual para todos, se não há histórico). */
export function avgProfitPerUnit(econs: Econ[], mix: Map<number, number>): number {
  const usable = econs.filter((e) => e.price > 0)
  if (!usable.length) return 0
  let weights = usable.map((e) => mix.get(e.product.id!) ?? 0)
  if (weights.every((w) => w === 0)) weights = usable.map(() => 1)
  const total = weights.reduce((a, b) => a + b, 0)
  const avg = usable.reduce((sum, e, i) => sum + e.profitPerUnit * weights[i], 0) / total
  return Math.max(0, avg)
}

export interface GoalPath {
  name: string
  emoji: string
  units: number
  profitPerUnit: number
}

export type Stage = 'sem-meta' | 'sem-produtos' | 'inicio' | 'caminho' | 'metade' | 'reta-final' | 'batida'

export interface GoalPlan {
  hasGoal: boolean
  hasProducts: boolean
  goal: number
  profitSoFar: number
  remaining: number
  progressPct: number
  avgProfitPerUnit: number
  /** Pãezinhos que faltam (null se não dá para calcular, ex.: sem preços) */
  unitsNeeded: number | null
  /** Pãezinhos para bater a meta começando do zero */
  unitsForFullGoal: number | null
  avgUnitsPerOrder: number
  ordersNeeded: number | null
  daysLeft: number
  perDay: number | null
  perWeek: number | null
  paths: GoalPath[]
  projected: number | null
  onTrack: boolean | null
  stage: Stage
}

export interface PlanInput {
  goal: number
  today: string
  orders: Order[]
  products: Product[]
  ingredients: Map<number, Ingredient>
  settings: EconSettings
}

const DEFAULT_UNITS_PER_ORDER = 12

export function goalPlan({ goal, today, orders, products, ingredients, settings }: PlanInput): GoalPlan {
  const month = monthKey(today)
  const active = products.filter((p) => p.active)
  const econs = active.map((p) => productEconomics(p, ingredients, settings))
  const profitSoFar = estimatedProfit(month, orders, products, ingredients, settings)
  const mix = salesMix(orders, active, month)
  const avg = avgProfitPerUnit(econs, mix)

  const monthOrders = orders.filter((o) => isActive(o) && monthKey(o.date) === month)
  const unitsOf = (list: Order[]) => list.reduce((s, o) => s + o.items.reduce((n, i) => n + i.qty, 0), 0)
  const allOrders = orders.filter(isActive)
  const avgUnitsPerOrder = monthOrders.length
    ? unitsOf(monthOrders) / monthOrders.length
    : allOrders.length
      ? unitsOf(allOrders) / allOrders.length
      : DEFAULT_UNITS_PER_ORDER

  const d = parseISODate(today)
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const dayOfMonth = d.getDate()
  const daysLeft = daysInMonth - dayOfMonth + 1

  const hasGoal = goal > 0
  const remaining = hasGoal ? Math.max(0, round2(goal - profitSoFar)) : 0
  const progressPct = hasGoal ? Math.min(100, Math.max(0, (profitSoFar / goal) * 100)) : 0
  const unitsNeeded = hasGoal && avg > 0 ? Math.ceil(remaining / avg) : null
  const unitsForFullGoal = hasGoal && avg > 0 ? Math.ceil(goal / avg) : null
  const perDay = unitsNeeded != null ? Math.ceil(unitsNeeded / daysLeft) : null
  const perWeek = perDay != null ? perDay * 7 : null

  const paths: GoalPath[] =
    remaining > 0
      ? econs
          .filter((e) => e.profitPerUnit > 0)
          .sort((a, b) => b.profitPerUnit - a.profitPerUnit)
          .slice(0, 3)
          .map((e) => ({ name: e.product.name, emoji: e.product.emoji, units: Math.ceil(remaining / e.profitPerUnit), profitPerUnit: e.profitPerUnit }))
      : []

  // Ritmo só faz sentido depois de alguns dias de mês e com algum lucro em vista
  const projected = dayOfMonth >= 5 && profitSoFar > 0 ? round2((profitSoFar / dayOfMonth) * daysInMonth) : null

  let stage: Stage
  if (!hasGoal) stage = 'sem-meta'
  else if (!active.length) stage = 'sem-produtos'
  else if (progressPct >= 100) stage = 'batida'
  else if (progressPct >= 75) stage = 'reta-final'
  else if (progressPct >= 40) stage = 'metade'
  else if (progressPct >= 10) stage = 'caminho'
  else stage = 'inicio'

  return {
    hasGoal,
    hasProducts: active.length > 0,
    goal,
    profitSoFar,
    remaining,
    progressPct,
    avgProfitPerUnit: avg,
    unitsNeeded,
    unitsForFullGoal,
    avgUnitsPerOrder,
    ordersNeeded: unitsNeeded != null ? Math.ceil(unitsNeeded / Math.max(1, avgUnitsPerOrder)) : null,
    daysLeft,
    perDay,
    perWeek,
    paths,
    projected,
    onTrack: projected != null && hasGoal ? projected >= goal : null,
    stage,
  }
}

/** Simulação "e se": lucro mensal com X pães por semana e ajuste de preço. */
export function simulate(opts: {
  perWeek: number
  priceAdjPct: number
  products: Product[]
  ingredients: Map<number, Ingredient>
  settings: EconSettings
  mix: Map<number, number>
  goal: number
}) {
  const factor = 1 + opts.priceAdjPct / 100
  const econs = opts.products.filter((p) => p.active).map((p) => productEconomics(p, opts.ingredients, opts.settings, factor))
  const avg = avgProfitPerUnit(econs, opts.mix)
  const monthlyUnits = (opts.perWeek * 52) / 12
  const monthlyProfit = round2(monthlyUnits * avg)
  const weeksFactor = 52 / 12
  const perWeekForGoal = avg > 0 && opts.goal > 0 ? Math.ceil(opts.goal / avg / weeksFactor) : null
  return { avg, monthlyUnits, monthlyProfit, pctOfGoal: opts.goal > 0 ? (monthlyProfit / opts.goal) * 100 : 0, perWeekForGoal }
}
