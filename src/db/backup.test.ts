import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { buildBackup, restoreBackup, validateBackup, wipeAll } from './backup'
import { loadExamples } from './seed'

beforeEach(async () => {
  await wipeAll()
})

describe('backup', () => {
  it('exporta e restaura todos os dados', async () => {
    await loadExamples()
    const before = await buildBackup()
    expect(before.data.products.length).toBe(3)

    const file = new File([JSON.stringify(before)], 'b.json')
    await wipeAll()
    expect(await db.products.count()).toBe(0)

    await restoreBackup(file)
    const after = await buildBackup()
    expect(after.data.products).toEqual(before.data.products)
    expect(after.data.ingredients).toEqual(before.data.ingredients)
  })

  it('rejeita arquivos que não são backup', async () => {
    expect(() => validateBackup({ hello: 1 })).toThrow()
    await expect(restoreBackup(new File(['not json'], 'x.json'))).rejects.toThrow()
  })
})
