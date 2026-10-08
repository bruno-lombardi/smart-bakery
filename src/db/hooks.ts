import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from './db'
import { DEFAULT_SETTINGS, type Ingredient, type Settings } from './types'

export function useIngredients() {
  return useLiveQuery(() => db.ingredients.orderBy('name').toArray(), [])
}
export function useIngredientMap(): Map<number, Ingredient> {
  const list = useIngredients()
  return useMemo(() => new Map((list ?? []).map((i) => [i.id!, i])), [list])
}
export const useProducts = () => useLiveQuery(() => db.products.orderBy('name').toArray(), [])
export const useOrders = () => useLiveQuery(() => db.orders.toArray(), [])
export const useTransactions = () => useLiveQuery(() => db.transactions.toArray(), [])

export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get('main'), [])
  return useMemo(() => ({ ...DEFAULT_SETTINGS, ...s }), [s])
}
