import Dexie, { type EntityTable } from 'dexie'
import type { Ingredient, Order, Product, Settings, Transaction } from './types'
import { DEFAULT_SETTINGS } from './types'

export class BakeryDB extends Dexie {
  ingredients!: EntityTable<Ingredient, 'id'>
  products!: EntityTable<Product, 'id'>
  orders!: EntityTable<Order, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor(name = 'ana-paula-paes-e-afeto') {
    super(name)
    this.version(1).stores({
      ingredients: '++id, name',
      products: '++id, name, category, active',
      orders: '++id, date, status, customerName, createdAt',
      transactions: '++id, date, type, orderId, createdAt',
      settings: 'id',
    })
  }
}

export const db = new BakeryDB()

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('main')
  return { ...DEFAULT_SETTINGS, ...s }
}

export async function saveSettings(patch: Partial<Settings>) {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: 'main' })
}

/** Pede ao navegador para não apagar os dados quando faltar espaço. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true
      return await navigator.storage.persist()
    }
  } catch {
    /* ignora */
  }
  return false
}
