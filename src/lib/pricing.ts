import type { Ingredient, Product, RecipeLine, Settings } from '../db/types'
import { round2 } from './money'
import { UNIT_FACTOR } from './units'

/** Custo de 1 g / 1 ml / 1 un do insumo. */
export function ingredientCostPerBase(ing: Ingredient): number {
  const baseQty = ing.packageQty * UNIT_FACTOR[ing.unit]
  return baseQty > 0 ? ing.packagePrice / baseQty : 0
}

export function lineCost(line: RecipeLine, ing: Ingredient | undefined): number {
  if (!ing) return 0
  return line.qty * UNIT_FACTOR[line.unit] * ingredientCostPerBase(ing)
}

export interface CostBreakdown {
  ingredientsBatch: number
  extraBatch: number
  laborBatch: number
  packagingBatch: number
  batchCost: number
  unitCost: number
}

export function computeCost(
  p: Pick<Product, 'recipe' | 'yield' | 'packagingPerUnit' | 'extraPerBatch' | 'laborMinutes'>,
  ingredients: Map<number, Ingredient>,
  hourlyRate: number,
): CostBreakdown {
  const yieldQty = Math.max(1, p.yield || 1)
  const ingredientsBatch = p.recipe.reduce((sum, l) => sum + lineCost(l, ingredients.get(l.ingredientId)), 0)
  const extraBatch = p.extraPerBatch || 0
  const laborBatch = ((p.laborMinutes || 0) / 60) * hourlyRate
  const packagingBatch = (p.packagingPerUnit || 0) * yieldQty
  const batchCost = ingredientsBatch + extraBatch + laborBatch + packagingBatch
  return {
    ingredientsBatch,
    extraBatch,
    laborBatch,
    packagingBatch,
    batchCost,
    unitCost: batchCost / yieldQty,
  }
}

/**
 * Preço = custo / (1 - margem - despesas gerais).
 * A margem e as despesas são percentuais do PREÇO de venda.
 * Retorna null se os percentuais somarem 95% ou mais (não faz sentido).
 */
export function suggestedPrice(unitCost: number, marginPct: number, overheadPct: number, roundTo = 0): number | null {
  const share = (marginPct + overheadPct) / 100
  if (share >= 0.95 || unitCost <= 0) return null
  const raw = unitCost / (1 - share)
  if (roundTo > 0) return round2(Math.ceil(raw / roundTo - 1e-9) * roundTo)
  return round2(raw)
}

export interface Profit {
  price: number
  profitPerUnit: number
  /** lucro real / preço, em % (depois das despesas gerais) */
  realMarginPct: number
  profitPerBatch: number
}

export function computeProfit(price: number, unitCost: number, overheadPct: number, yieldQty: number): Profit {
  const overhead = price * (overheadPct / 100)
  const profitPerUnit = price - unitCost - overhead
  return {
    price,
    profitPerUnit,
    realMarginPct: price > 0 ? (profitPerUnit / price) * 100 : 0,
    profitPerBatch: profitPerUnit * Math.max(1, yieldQty),
  }
}

export function sellingPrice(
  p: Product,
  ingredients: Map<number, Ingredient>,
  s: Pick<Settings, 'hourlyRate' | 'overheadPct' | 'roundTo'>,
): number {
  if (p.price != null && p.price > 0) return p.price
  const c = computeCost(p, ingredients, s.hourlyRate)
  return suggestedPrice(c.unitCost, p.marginPct, s.overheadPct, s.roundTo) ?? 0
}
