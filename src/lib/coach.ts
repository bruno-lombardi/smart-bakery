import type { Order, Transaction } from '../db/types'
import { addDays } from './dates'
import type { Econ, GoalPlan } from './goals'
import { formatBRL, formatBRLShort, formatNumber } from './money'
import { isActive, orderPaid, orderTotal } from './orders'

export interface Insight {
  id: string
  emoji: string
  title: string
  text: string
  tone: 'good' | 'warn' | 'info'
  to?: string
  cta?: string
}

export interface Motivation {
  emoji: string
  title: string
  text: string
}

const plural = (n: number, one: string, many: string) => `${formatNumber(n, 0)} ${n === 1 ? one : many}`

/** Mensagem principal da meta: sempre encorajadora e com um próximo passo concreto. */
export function motivation(plan: GoalPlan, name: string): Motivation {
  const goal = formatBRLShort(plan.goal)
  const day = plan.perDay != null ? plural(plan.perDay, 'pãozinho', 'pãezinhos') : null
  switch (plan.stage) {
    case 'sem-meta':
      return { emoji: '🌟', title: 'Qual é o seu sonho para este mês?', text: 'Defina uma meta de lucro e eu te mostro, passo a passo, quantos pãezinhos faltam para chegar lá.' }
    case 'sem-produtos':
      return { emoji: '🥖', title: `Sua meta de ${goal} já está de pé!`, text: 'Agora cadastre seus pães e preços. Com isso eu calculo o caminho exato até a meta.' }
    case 'inicio':
      return {
        emoji: '🌱',
        title: `${name}, a meta de ${goal} cabe no seu forno!`,
        text: plan.unitsForFullGoal
          ? `Com os seus preços, são cerca de ${formatNumber(plan.unitsForFullGoal, 0)} pãezinhos no mês${day ? ` — uns ${day} por dia` : ''}. Cada encomenda anotada já é um passo.`
          : 'Cada encomenda anotada já é um passo. Revise seus preços para eu calcular o caminho.',
      }
    case 'caminho':
      return { emoji: '🚀', title: 'Você já saiu do lugar!', text: `Faltam ${formatBRL(plan.remaining)} de lucro. ${day ? `Dá uns ${day} por dia. ` : ''}Continue assim: pão bom vende pão.` }
    case 'metade':
      return { emoji: '🔥', title: 'Passou da metade — que orgulho!', text: `Só faltam ${formatBRL(plan.remaining)}${plan.ordersNeeded ? `, uma média de ${plural(plan.ordersNeeded, 'encomenda', 'encomendas')}` : ''}. Seus clientes confiam no seu pão.` }
    case 'reta-final':
      return { emoji: '🏁', title: 'Reta final! Está pertinho.', text: `Faltam só ${formatBRL(plan.remaining)}${plan.unitsNeeded ? ` — cerca de ${plural(plan.unitsNeeded, 'pãozinho', 'pãezinhos')}` : ''}. Que tal avisar seus clientes no WhatsApp hoje?` }
    case 'batida':
      return { emoji: '🎉', title: `Meta batida, ${name}! Você é demais!`, text: `Você passou de ${goal} de lucro. Hora de comemorar — e, se quiser, sonhar mais alto no próximo mês.` }
  }
}

/** Frase curta sobre o ritmo, só quando há dados suficientes. */
export function paceNote(plan: GoalPlan): string | null {
  if (plan.stage === 'batida' || plan.onTrack == null || plan.projected == null) return null
  return plan.onTrack
    ? `No ritmo de agora você fecha o mês com ${formatBRLShort(plan.projected)} de lucro. Está no caminho certo! 💛`
    : `No ritmo de agora são ${formatBRLShort(plan.projected)}. Com um empurrãozinho${plan.perDay ? ` (${plural(plan.perDay, 'pão', 'pães')} por dia)` : ''} você chega lá.`
}

export interface InsightInput {
  plan: GoalPlan
  econs: Econ[]
  orders: Order[]
  txs: Transaction[]
  today: string
}

export function buildInsights({ plan, econs, orders, txs, today }: InsightInput): Insight[] {
  const out: Insight[] = []

  if (!plan.hasGoal) {
    out.push({ id: 'goal', emoji: '🎯', title: 'Defina sua meta de lucro', text: 'Com uma meta, o painel calcula quantos pães faltam e te acompanha todo dia.', tone: 'info', to: '/metas', cta: 'Definir meta' })
  }

  for (const e of econs.filter((x) => x.health === 'critico').slice(0, 2)) {
    const target = e.suggested
    out.push({
      id: `low-${e.product.id}`,
      emoji: '⚠️',
      title: `${e.product.name}: lucro baixo`,
      text:
        e.profitPerUnit <= 0
          ? `Hoje cada um sai com prejuízo de ${formatBRL(-e.profitPerUnit)}. O preço mínimo para não perder é ${formatBRL(e.minPrice)}${target ? `; o saudável é ${formatBRL(target)}` : ''}.`
          : `Sobra só ${formatBRL(e.profitPerUnit)} por unidade (${formatNumber(e.realMarginPct, 0)}%).${target ? ` Cobrando ${formatBRL(target)} você chega a um lucro saudável.` : ''}`,
      tone: 'warn',
      to: '/produtos',
      cta: 'Ajustar preço',
    })
  }

  const withHour = econs.filter((e) => e.profitPerHour != null && e.profitPerUnit > 0)
  if (withHour.length >= 2) {
    const sorted = [...withHour].sort((a, b) => b.profitPerHour! - a.profitPerHour!)
    const best = sorted[0]
    const worst = sorted[sorted.length - 1]
    if (best.profitPerHour! > worst.profitPerHour! * 1.2) {
      out.push({
        id: 'best-hour',
        emoji: '⏱️',
        title: `${best.product.emoji} ${best.product.name} é seu campeão de lucro por hora`,
        text: `Cada hora de trabalho nele rende ${formatBRL(best.profitPerHour!)} de lucro, contra ${formatBRL(worst.profitPerHour!)} no ${worst.product.name}. Vale destacar nas conversas com clientes.`,
        tone: 'good',
      })
    }
  }

  const active = orders.filter(isActive)
  const unpaidDelivered = active.filter((o) => o.status === 'entregue' && orderTotal(o) - orderPaid(o.id!, txs) > 0.004)
  if (unpaidDelivered.length) {
    const sum = unpaidDelivered.reduce((s, o) => s + orderTotal(o) - orderPaid(o.id!, txs), 0)
    out.push({ id: 'receivable', emoji: '💬', title: `${formatBRL(sum)} esperando para chegar no seu bolso`, text: `${plural(unpaidDelivered.length, 'encomenda entregue ainda não foi paga', 'encomendas entregues ainda não foram pagas')}. Uma mensagem carinhosa no WhatsApp costuma resolver.`, tone: 'warn', to: '/encomendas', cta: 'Ver encomendas' })
  }

  const limit = addDays(today, 7)
  const upcoming = active.filter((o) => o.status !== 'entregue' && o.date >= today && o.date <= limit)
  if (plan.hasProducts && upcoming.length === 0) {
    out.push({ id: 'quiet', emoji: '📣', title: 'Agenda tranquila nos próximos dias', text: 'Que tal mandar uma foto dos seus pãezinhos fresquinhos no status do WhatsApp? Quem vê, lembra de encomendar.', tone: 'info' })
  }

  const monthOrders = active.filter((o) => o.date.slice(0, 7) === today.slice(0, 7))
  if (monthOrders.length >= 3 && plan.avgProfitPerUnit > 0) {
    const extra = plan.avgProfitPerUnit * 2 * monthOrders.length
    out.push({ id: 'upsell', emoji: '🧺', title: 'Um pãozinho a mais faz diferença', text: `Se cada cliente levar 2 pães a mais por encomenda, são ${formatBRL(extra)} de lucro extra só neste mês. Ofereça na hora de combinar o pedido!`, tone: 'good' })
  }

  const empty = econs.filter((e) => e.product.recipe.length === 0)
  if (empty[0]) {
    out.push({ id: 'recipe', emoji: '📝', title: `Complete a receita do ${empty[0].product.name}`, text: 'Sem os ingredientes eu não consigo calcular o custo real e o preço ideal.', tone: 'info', to: '/produtos', cta: 'Completar' })
  }

  return out
}
