import { describe, expect, it } from 'vitest'
import type { Ingredient, Order, Product } from '../db/types'
import { weeklyStreak, computeAchievements } from './achievements'
import { buildInsights, motivation } from './coach'
import { avgProfitPerUnit, goalPlan, priceOptions, productEconomics, salesMix, simulate, type EconSettings } from './goals'

const settings: EconSettings = { hourlyRate: 12, overheadPct: 10, roundTo: 0, defaultMarginPct: 40 }
const flour: Ingredient = { id: 1, name: 'Farinha', unit: 'kg', packageQty: 1, packagePrice: 10 }
const ing = new Map([[1, flour]])

// custo por pão: (1kg=10 + 2 extra + 0 trabalho) / 10 = 1,20
const bun = (over: Partial<Product> = {}): Product => ({
  id: 1, name: 'Pão A', emoji: '🍞', category: 'x', yield: 10,
  recipe: [{ ingredientId: 1, qty: 1, unit: 'kg' }],
  packagingPerUnit: 0, extraPerBatch: 2, laborMinutes: 0, marginPct: 40, price: null, active: true, ...over,
})

const order = (id: number, date: string, qty: number, price: number, over: Partial<Order> = {}): Order => ({
  id, customerName: 'Cli', phone: '', date, time: '', delivery: 'retirada', address: '', deliveryFee: 0, discount: 0,
  status: 'novo', notes: '', createdAt: 0, items: [{ productId: 1, name: 'Pão A', qty, unitPrice: price }], ...over,
})

describe('economia do produto', () => {
  it('preço sugerido e lucro saudável', () => {
    const e = productEconomics(bun(), ing, settings)
    expect(e.unitCost).toBeCloseTo(1.2)
    expect(e.suggested).toBeCloseTo(2.4) // 1,2 / (1 - 0,5)
    expect(e.price).toBeCloseTo(2.4)
    expect(e.realMarginPct).toBeCloseTo(40)
    expect(e.health).toBe('saudavel')
    expect(e.minPrice).toBeCloseTo(1.34) // 1,2 / 0,9 arredondado p/ cima
  })

  it('detecta prejuízo e margem apertada', () => {
    expect(productEconomics(bun({ price: 1.2 }), ing, settings).health).toBe('critico')
    expect(productEconomics(bun({ price: 1.5 }), ing, settings).health).toBe('critico') // margem real de 10%
    expect(productEconomics(bun({ price: 1.8 }), ing, settings).health).toBe('apertado') // 23%
    const apertado = productEconomics(bun({ price: 2.0 }), ing, settings) // (2-1,2-0,2)/2 = 30%
    expect(apertado.health).toBe('apertado')
  })

  it('lucro por hora de trabalho', () => {
    const e = productEconomics(bun({ laborMinutes: 60 }), ing, settings)
    expect(e.profitPerHour).not.toBeNull()
    expect(e.profitPerHour!).toBeCloseTo(e.profitPerBatch)
    expect(productEconomics(bun(), ing, settings).profitPerHour).toBeNull()
  })

  it('oferece três opções de preço crescentes', () => {
    const o = priceOptions(1.2, settings)
    expect(o.map((x) => x.id)).toEqual(['economico', 'saudavel', 'premium'])
    expect(o[0].price).toBeLessThan(o[1].price)
    expect(o[1].price).toBeLessThan(o[2].price)
  })
})

describe('plano de meta', () => {
  const today = '2026-10-10'
  const base = { today, ingredients: ing, settings }

  it('sem vendas: calcula quantos pães para a meta inteira', () => {
    const plan = goalPlan({ ...base, goal: 1000, orders: [], products: [bun()] })
    // lucro por pão = 2,4 - 1,2 - 0,24 = 0,96
    expect(plan.avgProfitPerUnit).toBeCloseTo(0.96)
    expect(plan.unitsForFullGoal).toBe(Math.ceil(1000 / 0.96))
    expect(plan.stage).toBe('inicio')
    expect(plan.progressPct).toBe(0)
    expect(plan.daysLeft).toBe(22) // 10..31 de outubro
    expect(plan.perDay).toBe(Math.ceil(plan.unitsNeeded! / 22))
  })

  it('com vendas: desconta o lucro já garantido', () => {
    const plan = goalPlan({ ...base, goal: 1000, orders: [order(1, '2026-10-05', 100, 2.4)], products: [bun()] })
    expect(plan.profitSoFar).toBeCloseTo(96)
    expect(plan.remaining).toBeCloseTo(904)
    expect(plan.unitsNeeded).toBe(Math.ceil(904 / 0.96))
    expect(plan.ordersNeeded).toBe(Math.ceil(plan.unitsNeeded! / 100))
    expect(plan.paths[0].units).toBe(Math.ceil(904 / 0.96))
  })

  it('meta batida', () => {
    const plan = goalPlan({ ...base, goal: 50, orders: [order(1, '2026-10-05', 100, 2.4)], products: [bun()] })
    expect(plan.stage).toBe('batida')
    expect(plan.remaining).toBe(0)
    expect(plan.progressPct).toBe(100)
    expect(plan.unitsNeeded).toBe(0)
  })

  it('estágios sem meta e sem produtos', () => {
    expect(goalPlan({ ...base, goal: 0, orders: [], products: [bun()] }).stage).toBe('sem-meta')
    expect(goalPlan({ ...base, goal: 500, orders: [], products: [] }).stage).toBe('sem-produtos')
  })

  it('ignora encomendas canceladas e de outros meses', () => {
    const plan = goalPlan({
      ...base, goal: 1000, products: [bun()],
      orders: [order(1, '2026-10-05', 100, 2.4, { status: 'cancelado' }), order(2, '2026-09-05', 100, 2.4)],
    })
    expect(plan.profitSoFar).toBe(0)
  })

  it('mix de vendas pondera o lucro médio', () => {
    const cheap = bun({ id: 2, name: 'Barato', price: 1.8 })
    const e1 = productEconomics(bun(), ing, settings)
    const e2 = productEconomics(cheap, ing, settings)
    const mix = new Map([[1, 1], [2, 3]])
    const avg = avgProfitPerUnit([e1, e2], mix)
    expect(avg).toBeCloseTo((e1.profitPerUnit * 1 + e2.profitPerUnit * 3) / 4)
    const orders = [order(1, '2026-10-02', 5, 2.4), order(2, '2026-09-02', 9, 2.4)]
    expect(salesMix(orders, [bun()], '2026-10').get(1)).toBe(5)
    expect(salesMix(orders, [bun()], '2026-11').get(1)).toBe(14) // cai para o histórico
  })
})

describe('simulador', () => {
  it('mais vendas ou preço maior aumentam o lucro', () => {
    const common = { products: [bun()], ingredients: ing, settings, mix: new Map<number, number>(), goal: 1000 }
    const a = simulate({ ...common, perWeek: 100, priceAdjPct: 0 })
    const b = simulate({ ...common, perWeek: 200, priceAdjPct: 0 })
    const c = simulate({ ...common, perWeek: 100, priceAdjPct: 10 })
    expect(b.monthlyProfit).toBeCloseTo(a.monthlyProfit * 2, 0)
    expect(c.monthlyProfit).toBeGreaterThan(a.monthlyProfit)
    expect(a.perWeekForGoal).not.toBeNull()
  })
})

describe('treinador', () => {
  const today = '2026-10-10'
  it('motivação nunca fica vazia e cita a meta', () => {
    for (const goal of [0, 500]) {
      for (const orders of [[], [order(1, '2026-10-05', 100, 2.4)]]) {
        for (const products of [[], [bun()]]) {
          const plan = goalPlan({ goal, today, orders, products, ingredients: ing, settings })
          const m = motivation(plan, 'Ana')
          expect(m.title.length).toBeGreaterThan(5)
          expect(m.text.length).toBeGreaterThan(10)
        }
      }
    }
  })

  it('alerta de preço baixo sugere o preço saudável', () => {
    const products = [bun({ price: 1.2 })]
    const plan = goalPlan({ goal: 500, today, orders: [], products, ingredients: ing, settings })
    const econs = products.map((p) => productEconomics(p, ing, settings))
    const ins = buildInsights({ plan, econs, orders: [], txs: [], today })
    const low = ins.find((i) => i.id.startsWith('low-'))
    expect(low?.text).toContain('prejuízo')
    expect(low?.text).toMatch(/2,40/)
  })
})

describe('conquistas', () => {
  it('sequência semanal', () => {
    const orders = [order(1, '2026-10-08', 1, 1), order(2, '2026-09-30', 1, 1), order(3, '2026-09-22', 1, 1), order(4, '2026-09-15', 1, 1)]
    expect(weeklyStreak(orders, '2026-10-10')).toBe(4)
    expect(weeklyStreak([order(1, '2026-08-01', 1, 1)], '2026-10-10')).toBe(0)
  })

  it('desbloqueia pelo que ela já fez', () => {
    const products = [bun()]
    const econs = products.map((p) => productEconomics(p, ing, settings))
    const list = computeAchievements({
      settings: { monthlyProfitGoal: 500, lastBackupAt: null, celebrated: ['m:2026-10:50'] },
      products, econs, orders: [order(1, '2026-10-05', 1, 2.4, { status: 'entregue' })], txs: [], today: '2026-10-10',
    })
    const on = new Set(list.filter((a) => a.unlocked).map((a) => a.id))
    expect(on).toEqual(new Set(['goal_set', 'first_product', 'first_order', 'first_delivery', 'goal_50']))
  })
})
