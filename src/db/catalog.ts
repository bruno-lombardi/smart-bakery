import type { Ingredient, Product, Settings, Unit } from './types'
import { computeCost, suggestedPrice } from '../lib/pricing'

/**
 * Cardápio inicial da Ana Paula – Pães & Afeto, com custos ESTIMADOS de mercado (Brasil).
 * Tudo aqui é ponto de partida: ela confere os preços dos insumos e ajusta cada receita.
 */

interface IngSpec {
  key: string
  name: string
  unit: Unit
  packageQty: number
  packagePrice: number
}

export const STARTER_INGREDIENTS: IngSpec[] = [
  { key: 'trigo', name: 'Farinha de trigo', unit: 'kg', packageQty: 5, packagePrice: 25 },
  { key: 'integral', name: 'Farinha de trigo integral', unit: 'kg', packageQty: 1, packagePrice: 8 },
  { key: 'graos', name: 'Mix de grãos e sementes', unit: 'g', packageQty: 500, packagePrice: 16 },
  { key: 'semgluten', name: 'Mix de farinhas sem glúten', unit: 'kg', packageQty: 1, packagePrice: 28 },
  { key: 'fermento', name: 'Fermento biológico seco', unit: 'g', packageQty: 500, packagePrice: 42 },
  { key: 'fermentopo', name: 'Fermento químico em pó', unit: 'g', packageQty: 100, packagePrice: 7 },
  { key: 'acucar', name: 'Açúcar', unit: 'kg', packageQty: 1, packagePrice: 5.5 },
  { key: 'sal', name: 'Sal', unit: 'kg', packageQty: 1, packagePrice: 3 },
  { key: 'leite', name: 'Leite integral', unit: 'l', packageQty: 1, packagePrice: 5.5 },
  { key: 'manteiga', name: 'Manteiga', unit: 'g', packageQty: 500, packagePrice: 38 },
  { key: 'oleo', name: 'Óleo de soja', unit: 'ml', packageQty: 900, packagePrice: 7.5 },
  { key: 'ovos', name: 'Ovos', unit: 'un', packageQty: 30, packagePrice: 24 },
  { key: 'mel', name: 'Mel', unit: 'g', packageQty: 280, packagePrice: 16 },
  { key: 'batata', name: 'Batata', unit: 'kg', packageQty: 1, packagePrice: 6.5 },
  { key: 'frango', name: 'Peito de frango', unit: 'kg', packageQty: 1, packagePrice: 20 },
  { key: 'cebola', name: 'Cebola', unit: 'kg', packageQty: 1, packagePrice: 5 },
  { key: 'requeijao', name: 'Requeijão cremoso', unit: 'g', packageQty: 200, packagePrice: 8 },
  { key: 'milho', name: 'Milho verde (lata)', unit: 'g', packageQty: 170, packagePrice: 4.5 },
  { key: 'coco', name: 'Coco ralado', unit: 'g', packageQty: 100, packagePrice: 6.5 },
  { key: 'condensado', name: 'Leite condensado', unit: 'g', packageQty: 395, packagePrice: 7.5 },
  { key: 'leitecoco', name: 'Leite de coco', unit: 'ml', packageQty: 200, packagePrice: 5 },
  { key: 'cremeleite', name: 'Creme de leite', unit: 'g', packageQty: 200, packagePrice: 4.5 },
]

interface ProductSpec {
  name: string
  icon: string
  category: string
  yield: number
  note: string
  recipe: [key: string, qty: number, unit: Unit][]
  packagingPerUnit: number
  extraPerBatch: number
  laborMinutes: number
}

export const STARTER_PRODUCTS: ProductSpec[] = [
  {
    name: 'Pão de forma tradicional',
    icon: '🍞',
    category: 'Pães de forma',
    yield: 6,
    note: 'Pão de 500 g · fornada de 2 kg de farinha',
    recipe: [['trigo', 2, 'kg'], ['acucar', 120, 'g'], ['sal', 40, 'g'], ['manteiga', 120, 'g'], ['leite', 600, 'ml'], ['ovos', 2, 'un'], ['fermento', 20, 'g']],
    packagingPerUnit: 1.2,
    extraPerBatch: 4.5,
    laborMinutes: 100,
  },
  {
    name: 'Pão de forma integral multigrãos',
    icon: '🌾',
    category: 'Pães de forma',
    yield: 6,
    note: 'Pão de 500 g · metade integral, com mix de grãos e mel',
    recipe: [['integral', 1, 'kg'], ['trigo', 1, 'kg'], ['graos', 200, 'g'], ['mel', 100, 'g'], ['sal', 40, 'g'], ['oleo', 60, 'ml'], ['leite', 600, 'ml'], ['ovos', 2, 'un'], ['fermento', 20, 'g']],
    packagingPerUnit: 1.4,
    extraPerBatch: 4.5,
    laborMinutes: 110,
  },
  {
    name: 'Pão de forma zero glúten',
    icon: 'svg:sem-gluten',
    category: 'Pães de forma',
    yield: 4,
    note: 'Pão de 400 g · mix sem glúten (ingrediente mais caro)',
    recipe: [['semgluten', 1, 'kg'], ['ovos', 4, 'un'], ['oleo', 100, 'ml'], ['acucar', 40, 'g'], ['sal', 20, 'g'], ['leite', 500, 'ml'], ['fermento', 20, 'g']],
    packagingPerUnit: 1.6,
    extraPerBatch: 4,
    laborMinutes: 120,
  },
  {
    name: 'Pão de forma de batata',
    icon: '🥔',
    category: 'Pães de forma',
    yield: 6,
    note: 'Pão de 500 g · massa macia com batata',
    recipe: [['trigo', 1.5, 'kg'], ['batata', 600, 'g'], ['acucar', 90, 'g'], ['sal', 30, 'g'], ['manteiga', 120, 'g'], ['leite', 400, 'ml'], ['ovos', 2, 'un'], ['fermento', 20, 'g']],
    packagingPerUnit: 1.2,
    extraPerBatch: 4.5,
    laborMinutes: 100,
  },
  {
    name: 'Torta de frango',
    icon: '🥧',
    category: 'Salgados',
    yield: 2,
    note: 'Torta inteira (cerca de 8 fatias) · recheio com requeijão e milho',
    recipe: [['trigo', 500, 'g'], ['manteiga', 150, 'g'], ['ovos', 3, 'un'], ['leite', 200, 'ml'], ['fermentopo', 15, 'g'], ['sal', 10, 'g'], ['frango', 600, 'g'], ['cebola', 300, 'g'], ['requeijao', 200, 'g'], ['milho', 170, 'g']],
    packagingPerUnit: 5,
    extraPerBatch: 6,
    laborMinutes: 90,
  },
  {
    name: 'Rosca de coco',
    icon: 'svg:rosca',
    category: 'Doces que abraçam',
    yield: 6,
    note: 'Rosca de cerca de 600 g, recheada com coco e leite condensado',
    recipe: [['trigo', 1.5, 'kg'], ['acucar', 250, 'g'], ['manteiga', 150, 'g'], ['leite', 400, 'ml'], ['ovos', 3, 'un'], ['fermento', 25, 'g'], ['sal', 25, 'g'], ['coco', 200, 'g'], ['condensado', 395, 'g']],
    packagingPerUnit: 1.8,
    extraPerBatch: 4.5,
    laborMinutes: 120,
  },
  {
    name: 'Bolos gelados',
    icon: 'svg:bolo',
    category: 'Doces que abraçam',
    yield: 12,
    note: 'Vendido por fatia (12 por bolo) · estimativa com sabor coco; outros sabores variam',
    recipe: [['ovos', 4, 'un'], ['acucar', 200, 'g'], ['trigo', 300, 'g'], ['oleo', 100, 'ml'], ['fermentopo', 15, 'g'], ['leite', 400, 'ml'], ['condensado', 395, 'g'], ['leitecoco', 200, 'ml'], ['cremeleite', 200, 'g'], ['coco', 100, 'g']],
    packagingPerUnit: 0.8,
    extraPerBatch: 4,
    laborMinutes: 60,
  },
]

type CatalogSettings = Pick<Settings, 'hourlyRate' | 'defaultMarginPct' | 'overheadPct' | 'roundTo'>

/** Produtos do catálogo com preço saudável calculado a partir dos custos e das configurações dela. */
export function buildStarterProducts(ids: Map<string, number>, ingredients: Map<number, Ingredient>, s: CatalogSettings): Product[] {
  return STARTER_PRODUCTS.map((spec) => {
    const base: Product = {
      name: spec.name,
      emoji: spec.icon,
      category: spec.category,
      yield: spec.yield,
      recipe: spec.recipe.map(([key, qty, unit]) => ({ ingredientId: ids.get(key)!, qty, unit })),
      packagingPerUnit: spec.packagingPerUnit,
      extraPerBatch: spec.extraPerBatch,
      laborMinutes: spec.laborMinutes,
      marginPct: s.defaultMarginPct,
      price: null,
      active: true,
      note: spec.note,
      estimated: true,
    }
    const cost = computeCost(base, ingredients, s.hourlyRate)
    return { ...base, price: suggestedPrice(cost.unitCost, s.defaultMarginPct, s.overheadPct, s.roundTo) }
  })
}
