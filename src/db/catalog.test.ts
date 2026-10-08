import { describe, expect, it } from 'vitest'
import { STARTER_INGREDIENTS, STARTER_PRODUCTS, buildStarterProducts } from './catalog'
import { DEFAULT_SETTINGS, type Ingredient } from './types'
import { productEconomics } from '../lib/goals'

const settings = { ...DEFAULT_SETTINGS }
const ids = new Map(STARTER_INGREDIENTS.map((i, n) => [i.key, n + 1]))
const ings = new Map<number, Ingredient>(
  STARTER_INGREDIENTS.map((i, n) => [n + 1, { id: n + 1, name: i.name, unit: i.unit, packageQty: i.packageQty, packagePrice: i.packagePrice }]),
)
const products = buildStarterProducts(ids, ings, settings)

describe('catálogo inicial', () => {
  it('cobre todo o cardápio e usa só insumos que existem', () => {
    expect(products.map((p) => p.name)).toEqual([
      'Pão de forma tradicional',
      'Pão de forma integral multigrãos',
      'Pão de forma zero glúten',
      'Pão de forma de batata',
      'Torta de frango',
      'Rosca de coco',
      'Bolos gelados',
    ])
    const keys = new Set(STARTER_INGREDIENTS.map((i) => i.key))
    for (const p of STARTER_PRODUCTS) for (const [k] of p.recipe) expect(keys.has(k), `${p.name}: ${k}`).toBe(true)
    expect(keys.size).toBe(STARTER_INGREDIENTS.length)
  })

  it('todos nascem com lucro saudável e marcados como estimativa', () => {
    for (const p of products) {
      const e = productEconomics(p, ings, settings)
      expect(p.estimated).toBe(true)
      expect(p.price).toBeGreaterThan(0)
      expect(e.health, p.name).toBe('saudavel')
      expect(e.realMarginPct, p.name).toBeGreaterThanOrEqual(39)
      expect(e.price, p.name).toBeGreaterThan(e.minPrice)
    }
  })

  it('preços plausíveis para padaria artesanal (R$, por unidade vendida)', () => {
    const bounds: Record<string, [number, number]> = {
      'Pão de forma tradicional': [14, 26],
      'Pão de forma integral multigrãos': [16, 30],
      'Pão de forma zero glúten': [28, 48],
      'Pão de forma de batata': [14, 26],
      'Torta de frango': [55, 100],
      'Rosca de coco': [20, 40],
      'Bolos gelados': [6, 12],
    }
    const table = products.map((p) => `${p.name}: R$ ${p.price}`).join('\n')
    for (const p of products) {
      const [lo, hi] = bounds[p.name]
      expect(p.price!, `${p.name}\n${table}`).toBeGreaterThanOrEqual(lo)
      expect(p.price!, `${p.name}\n${table}`).toBeLessThanOrEqual(hi)
    }
  })
})
