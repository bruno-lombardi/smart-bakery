import { db, getSettings, saveSettings } from './db'
import { STARTER_INGREDIENTS, buildStarterProducts } from './catalog'
import type { Ingredient } from './types'

/**
 * Cadastra o cardápio da Ana Paula com custos estimados e preços saudáveis.
 * Só adiciona o que ainda não existe (não duplica nem sobrescreve o que ela já ajustou).
 */
export async function loadStarterCatalog() {
  const settings = await getSettings()
  await db.transaction('rw', db.ingredients, db.products, db.settings, async () => {
    const existing = await db.ingredients.toArray()
    const byName = new Map(existing.map((i) => [i.name.toLowerCase(), i]))
    const ids = new Map<string, number>()
    const all = new Map<number, Ingredient>(existing.map((i) => [i.id!, i]))

    for (const spec of STARTER_INGREDIENTS) {
      const found = byName.get(spec.name.toLowerCase())
      if (found) {
        ids.set(spec.key, found.id!)
        continue
      }
      const ing: Ingredient = { name: spec.name, unit: spec.unit, packageQty: spec.packageQty, packagePrice: spec.packagePrice, estimated: true }
      const id = (await db.ingredients.add(ing)) as number
      ids.set(spec.key, id)
      all.set(id, { ...ing, id })
    }

    const have = new Set((await db.products.toArray()).map((p) => p.name.toLowerCase()))
    const fresh = buildStarterProducts(ids, all, settings).filter((p) => !have.has(p.name.toLowerCase()))
    await db.products.bulkAdd(fresh)
    await saveSettings({ onboarded: true })
  })
}
