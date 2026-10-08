import { db, saveSettings } from './db'

const FORMAT = 'paes-e-afeto-backup'

export interface BackupFile {
  format: typeof FORMAT
  version: 1
  exportedAt: string
  data: {
    ingredients: unknown[]
    products: unknown[]
    orders: unknown[]
    transactions: unknown[]
    settings: unknown[]
  }
}

export async function buildBackup(): Promise<BackupFile> {
  const [ingredients, products, orders, transactions, settings] = await Promise.all([
    db.ingredients.toArray(),
    db.products.toArray(),
    db.orders.toArray(),
    db.transactions.toArray(),
    db.settings.toArray(),
  ])
  return {
    format: FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { ingredients, products, orders, transactions, settings },
  }
}

export async function downloadBackup() {
  await saveSettings({ lastBackupAt: Date.now() })
  const backup = await buildBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `paes-e-afeto-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function validateBackup(raw: unknown): BackupFile {
  const b = raw as BackupFile
  if (!b || b.format !== FORMAT || !b.data) throw new Error('Este arquivo não parece ser um backup do painel.')
  for (const k of ['ingredients', 'products', 'orders', 'transactions', 'settings'] as const) {
    if (!Array.isArray(b.data[k])) throw new Error('Backup incompleto ou corrompido.')
  }
  return b
}

export function parseBackup(text: string): BackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Não consegui ler este arquivo.')
  }
  return validateBackup(parsed)
}

export async function restoreBackup(file: File) {
  await applyBackup(parseBackup(await file.text()))
}

export function backupCounts(b: BackupFile) {
  return { products: b.data.products.length, orders: b.data.orders.length, transactions: b.data.transactions.length }
}

export async function applyBackup(b: BackupFile) {
  await db.transaction('rw', [db.ingredients, db.products, db.orders, db.transactions, db.settings], async () => {
    await Promise.all([db.ingredients.clear(), db.products.clear(), db.orders.clear(), db.transactions.clear(), db.settings.clear()])
    await db.ingredients.bulkPut(b.data.ingredients as never[])
    await db.products.bulkPut(b.data.products as never[])
    await db.orders.bulkPut(b.data.orders as never[])
    await db.transactions.bulkPut(b.data.transactions as never[])
    await db.settings.bulkPut(b.data.settings as never[])
  })
}

export async function wipeAll() {
  await db.transaction('rw', [db.ingredients, db.products, db.orders, db.transactions, db.settings], async () => {
    await Promise.all([db.ingredients.clear(), db.products.clear(), db.orders.clear(), db.transactions.clear(), db.settings.clear()])
  })
}
