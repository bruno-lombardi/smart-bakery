import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, saveSettings } from '../db/db'
import { wipeAll } from '../db/backup'
import { loadStarterCatalog } from '../db/seed'
import { makeSnapshot } from './snapshot'

beforeEach(async () => {
  await wipeAll()
})

describe('snapshot do backup', () => {
  it('o hash não muda sozinho, nem quando só “último backup” muda', async () => {
    await loadStarterCatalog()
    const a = await makeSnapshot()
    await new Promise((r) => setTimeout(r, 5))
    await saveSettings({ lastBackupAt: Date.now() })
    const b = await makeSnapshot()
    expect(b.hash).toBe(a.hash)
    expect(b.json).not.toBe(a.json) // a data de exportação muda, o hash não
  })

  it('o hash muda quando os dados mudam', async () => {
    await loadStarterCatalog()
    const a = await makeSnapshot()
    await db.transactions.add({ type: 'saida', date: '2026-10-10', description: 'Farinha', category: 'Ingredientes', amount: 25, method: 'Pix', orderId: null, createdAt: 1 })
    const b = await makeSnapshot()
    expect(b.hash).not.toBe(a.hash)
    expect(b.counts).toEqual({ products: 7, orders: 0, transactions: 1 })
    expect(b.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('aviso de mudanças', () => {
  it('avisa quando algo muda e para de avisar ao cancelar', async () => {
    const { watchChanges } = await import('./changes')
    let n = 0
    const stop = watchChanges(() => n++)
    await db.ingredients.add({ name: 'Sal', unit: 'kg', packageQty: 1, packagePrice: 3 })
    expect(n).toBeGreaterThan(0)
    const before = n
    stop()
    await db.ingredients.add({ name: 'Açúcar', unit: 'kg', packageQty: 1, packagePrice: 5 })
    expect(n).toBe(before)
  })
})
