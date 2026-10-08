import { useMemo } from 'react'
import { computeAchievements } from '../lib/achievements'
import { buildInsights } from '../lib/coach'
import { todayISO } from '../lib/dates'
import { goalPlan, productEconomics, salesMix } from '../lib/goals'
import { useIngredientMap, useOrders, useProducts, useSettings, useTransactions } from './hooks'

/** Tudo que o painel "sabe" sobre a padaria: metas, economia dos produtos, dicas e conquistas. */
export function useIntel() {
  const orders = useOrders()
  const txs = useTransactions()
  const products = useProducts()
  const ingMap = useIngredientMap()
  const settings = useSettings()
  const today = todayISO()

  return useMemo(() => {
    if (!orders || !txs || !products) return null
    const active = products.filter((p) => p.active)
    const econs = active.map((p) => productEconomics(p, ingMap, settings))
    const plan = goalPlan({ goal: settings.monthlyProfitGoal, today, orders, products, ingredients: ingMap, settings })
    const insights = buildInsights({ plan, econs, orders, txs, today })
    const achievements = computeAchievements({ settings, products, econs, orders, txs, today })
    const mix = salesMix(orders, active, today.slice(0, 7))
    return { orders, txs, products, econs, plan, insights, achievements, mix, settings, ingMap, today }
  }, [orders, txs, products, ingMap, settings, today])
}
