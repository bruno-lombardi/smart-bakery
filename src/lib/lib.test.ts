import { describe, expect, it } from 'vitest'
import type { Ingredient, Order, Transaction } from '../db/types'
import { parseMoney, round2 } from './money'
import { computeCost, computeProfit, ingredientCostPerBase, suggestedPrice } from './pricing'
import { addMonths, addDays } from './dates'
import { orderTotal, paymentState, productionList, whatsappLink } from './orders'
import { monthStats } from './stats'

const flour: Ingredient = { id: 1, name: 'Farinha', unit: 'kg', packageQty: 5, packagePrice: 25 }
const milk: Ingredient = { id: 2, name: 'Leite', unit: 'l', packageQty: 1, packagePrice: 5 }
const eggs: Ingredient = { id: 3, name: 'Ovos', unit: 'un', packageQty: 30, packagePrice: 30 }
const map = new Map([flour, milk, eggs].map((i) => [i.id!, i]))

describe('parseMoney', () => {
  it('entende formatos brasileiros e simples', () => {
    expect(parseMoney('12,50')).toBe(12.5)
    expect(parseMoney('12.50')).toBe(12.5)
    expect(parseMoney('1.234,56')).toBe(1234.56)
    expect(parseMoney('R$ 7')).toBe(7)
    expect(parseMoney('')).toBe(0)
    expect(parseMoney('abc')).toBe(0)
  })
})

describe('precificação', () => {
  it('calcula custo por unidade-base com conversão kg→g', () => {
    expect(ingredientCostPerBase(flour)).toBeCloseTo(0.005) // R$25 / 5000 g
    expect(ingredientCostPerBase(milk)).toBeCloseTo(0.005)
    expect(ingredientCostPerBase(eggs)).toBeCloseTo(1)
  })

  it('soma ingredientes, mão de obra, extras e embalagem', () => {
    const c = computeCost(
      {
        recipe: [
          { ingredientId: 1, qty: 1, unit: 'kg' }, // 5,00
          { ingredientId: 2, qty: 400, unit: 'ml' }, // 2,00
          { ingredientId: 3, qty: 2, unit: 'un' }, // 2,00
        ],
        yield: 10,
        packagingPerUnit: 0.5, // 5,00 por fornada
        extraPerBatch: 3,
        laborMinutes: 60,
      },
      map,
      12, // R$12/h
    )
    expect(c.ingredientsBatch).toBeCloseTo(9)
    expect(c.laborBatch).toBeCloseTo(12)
    expect(c.batchCost).toBeCloseTo(29)
    expect(c.unitCost).toBeCloseTo(2.9)
  })

  it('preço sugerido usa margem sobre o preço, não sobre o custo', () => {
    // custo 3, margem 40% + despesas 10% => 3 / 0,5 = 6
    expect(suggestedPrice(3, 40, 10)).toBe(6)
    expect(suggestedPrice(3, 40, 10, 0.5)).toBe(6)
    expect(suggestedPrice(3.1, 40, 10, 0.5)).toBe(6.5) // arredonda para cima
  })

  it('recusa percentuais absurdos', () => {
    expect(suggestedPrice(3, 90, 10)).toBeNull()
    expect(suggestedPrice(0, 40, 10)).toBeNull()
  })

  it('lucro real bate com a margem pedida quando o preço é o sugerido', () => {
    const price = suggestedPrice(3, 40, 10)!
    const p = computeProfit(price, 3, 10, 20)
    expect(p.realMarginPct).toBeCloseTo(40)
    expect(p.profitPerBatch).toBeCloseTo(p.profitPerUnit * 20)
  })
})

describe('encomendas', () => {
  const order = (over: Partial<Order> = {}): Order => ({
    id: 1,
    customerName: 'Maria',
    phone: '(11) 98888-7777',
    items: [
      { productId: 1, name: 'Pão de leite', qty: 10, unitPrice: 1.5 },
      { productId: 2, name: 'Pão de queijo', qty: 20, unitPrice: 1 },
    ],
    date: '2026-10-10',
    time: '',
    delivery: 'entrega',
    address: '',
    deliveryFee: 5,
    discount: 2,
    status: 'novo',
    notes: '',
    createdAt: 0,
    ...over,
  })

  it('total considera taxa de entrega e desconto', () => {
    expect(orderTotal(order())).toBe(38)
  })

  it('estado de pagamento', () => {
    expect(paymentState(38, 0)).toBe('pendente')
    expect(paymentState(38, 10)).toBe('parcial')
    expect(paymentState(38, 38)).toBe('pago')
  })

  it('lista de produção ignora entregues e cancelados', () => {
    const list = productionList([
      order(),
      order({ id: 2, status: 'producao', items: [{ productId: 1, name: 'Pão de leite', qty: 5, unitPrice: 1.5 }] }),
      order({ id: 3, status: 'entregue' }),
      order({ id: 4, status: 'cancelado' }),
    ])
    expect(list).toEqual([
      { name: 'Pão de queijo', qty: 20 },
      { name: 'Pão de leite', qty: 15 },
    ])
  })

  it('link do WhatsApp adiciona o 55 e rejeita números curtos', () => {
    expect(whatsappLink('(11) 98888-7777')).toBe('https://wa.me/5511988887777')
    expect(whatsappLink('123')).toBeNull()
  })

  it('estatísticas do mês', () => {
    const txs: Transaction[] = [
      { id: 1, type: 'entrada', date: '2026-10-05', description: '', category: 'Vendas', amount: 20, method: 'Pix', orderId: 1, createdAt: 0 },
      { id: 2, type: 'saida', date: '2026-10-06', description: '', category: 'Ingredientes', amount: 8, method: 'Pix', orderId: null, createdAt: 0 },
    ]
    const s = monthStats('2026-10', [order(), order({ id: 2, status: 'cancelado' })], txs)
    expect(s.revenue).toBe(38)
    expect(s.orders).toBe(1)
    expect(s.received).toBe(20)
    expect(s.expenses).toBe(8)
    expect(s.balance).toBe(12)
    expect(s.toReceive).toBe(18)
  })
})

describe('datas', () => {
  it('navega entre meses e dias', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(round2(0.1 + 0.2)).toBe(0.3)
  })
})
