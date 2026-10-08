import { useEffect, useRef } from 'react'
import { saveSettings } from '../db/db'
import { useIntel } from '../db/useIntel'
import { MILESTONES } from './GoalCard'
import { useFeedback } from './Feedback'

const MILESTONE_TEXT: Record<number, string> = {
  25: 'Primeiro quarto da meta! Você está criando ritmo 🌱',
  50: 'METADE da meta! Que orgulho, continue assim 🔥',
  75: 'Três quartos! A reta final chegou 🏁',
  100: 'META BATIDA! Você conseguiu! 🏆🎉',
}

/** Observa o progresso e comemora marcos e conquistas novas, uma única vez cada. */
export function MilestoneWatcher() {
  const intel = useIntel()
  const { toast, celebrate } = useFeedback()
  const busy = useRef(false)

  useEffect(() => {
    if (!intel || !intel.settings.onboarded || busy.current) return
    const { settings, plan, achievements, today } = intel
    const month = today.slice(0, 7)

    const unlocked: string[] = achievements.filter((a) => a.unlocked).map((a) => a.id)
    if (plan.hasGoal) for (const m of MILESTONES) if (plan.progressPct >= m) unlocked.push(`m:${month}:${m}`)

    // Primeira vez: só registra o que já existe, sem fazer festa por coisas antigas.
    if (settings.celebrated == null) {
      busy.current = true
      void saveSettings({ celebrated: unlocked }).finally(() => { busy.current = false })
      return
    }

    const seen = new Set(settings.celebrated)
    const fresh = unlocked.filter((id) => !seen.has(id))
    if (!fresh.length) return

    busy.current = true
    const msgs: string[] = []
    let big = false
    for (const id of fresh) {
      if (id.startsWith('m:')) {
        const pct = Number(id.split(':')[2])
        msgs.push(MILESTONE_TEXT[pct])
        if (pct >= 50) big = true
      } else {
        const a = achievements.find((x) => x.id === id)
        // goal_50 / goal_100 já foram comemorados como marco do mês
        if (a && id !== 'goal_50' && id !== 'goal_100') msgs.push(`${a.emoji} Conquista: ${a.title}!`)
      }
    }
    msgs.slice(0, 2).forEach((m, i) => setTimeout(() => toast(m), i * 600))
    if (big) celebrate()
    void saveSettings({ celebrated: [...settings.celebrated, ...fresh] }).finally(() => { busy.current = false })
  }, [intel, toast, celebrate])

  return null
}
