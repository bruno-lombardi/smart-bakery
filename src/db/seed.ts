import { db, saveSettings } from './db'
import type { Ingredient, Product } from './types'

/** Exemplos para a Ana Paula explorar o painel. Os preços são só ilustrativos. */
export async function loadExamples() {
  const ings: Ingredient[] = [
    { name: 'Farinha de trigo', unit: 'kg', packageQty: 5, packagePrice: 24 },
    { name: 'Açúcar', unit: 'kg', packageQty: 1, packagePrice: 5.5 },
    { name: 'Fermento biológico seco', unit: 'g', packageQty: 500, packagePrice: 38 },
    { name: 'Leite', unit: 'l', packageQty: 1, packagePrice: 5.2 },
    { name: 'Manteiga', unit: 'g', packageQty: 500, packagePrice: 36 },
    { name: 'Ovos', unit: 'un', packageQty: 30, packagePrice: 24 },
    { name: 'Sal', unit: 'kg', packageQty: 1, packagePrice: 3 },
    { name: 'Queijo muçarela', unit: 'g', packageQty: 500, packagePrice: 29 },
    { name: 'Batata', unit: 'kg', packageQty: 1, packagePrice: 6 },
  ]
  const ids = (await db.ingredients.bulkAdd(ings, { allKeys: true })) as number[]
  const id = (name: string) => ids[ings.findIndex((i) => i.name === name)]

  const products: Product[] = [
    {
      name: 'Pãozinho de leite',
      emoji: '🍞',
      category: 'Pães doces',
      yield: 20,
      recipe: [
        { ingredientId: id('Farinha de trigo'), qty: 1, unit: 'kg' },
        { ingredientId: id('Açúcar'), qty: 100, unit: 'g' },
        { ingredientId: id('Leite'), qty: 400, unit: 'ml' },
        { ingredientId: id('Manteiga'), qty: 100, unit: 'g' },
        { ingredientId: id('Ovos'), qty: 2, unit: 'un' },
        { ingredientId: id('Fermento biológico seco'), qty: 10, unit: 'g' },
        { ingredientId: id('Sal'), qty: 15, unit: 'g' },
      ],
      packagingPerUnit: 0.3,
      extraPerBatch: 3,
      laborMinutes: 90,
      marginPct: 45,
      price: null,
      active: true,
    },
    {
      name: 'Pão de batata recheado',
      emoji: '🥖',
      category: 'Recheados',
      yield: 12,
      recipe: [
        { ingredientId: id('Farinha de trigo'), qty: 700, unit: 'g' },
        { ingredientId: id('Batata'), qty: 400, unit: 'g' },
        { ingredientId: id('Queijo muçarela'), qty: 300, unit: 'g' },
        { ingredientId: id('Manteiga'), qty: 80, unit: 'g' },
        { ingredientId: id('Ovos'), qty: 1, unit: 'un' },
        { ingredientId: id('Fermento biológico seco'), qty: 8, unit: 'g' },
        { ingredientId: id('Sal'), qty: 12, unit: 'g' },
      ],
      packagingPerUnit: 0.4,
      extraPerBatch: 3,
      laborMinutes: 100,
      marginPct: 45,
      price: null,
      active: true,
    },
    {
      name: 'Pão de queijo',
      emoji: '🧀',
      category: 'Pães salgados',
      yield: 30,
      recipe: [
        { ingredientId: id('Queijo muçarela'), qty: 250, unit: 'g' },
        { ingredientId: id('Leite'), qty: 250, unit: 'ml' },
        { ingredientId: id('Ovos'), qty: 2, unit: 'un' },
        { ingredientId: id('Sal'), qty: 10, unit: 'g' },
      ],
      packagingPerUnit: 0.15,
      extraPerBatch: 2.5,
      laborMinutes: 60,
      marginPct: 45,
      price: null,
      active: true,
    },
  ]
  await db.products.bulkAdd(products)
  await saveSettings({ onboarded: true })
}
