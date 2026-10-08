import { Link } from 'react-router-dom'
import { motivation, paceNote } from '../lib/coach'
import type { GoalPlan } from '../lib/goals'
import { formatBRL, formatBRLShort, formatNumber } from '../lib/money'
import { Icon } from './Icon'

export function ProgressRing({ pct, size = 132 }: { pct: number; size?: number }) {
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(pct)}% da meta`}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1dfbf" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={pct >= 100 ? '#44684a' : '#b8352a'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, pct) / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.3,.8,.3,1)' }}
        />
      </svg>
      <div className="ring-label">
        <b>{Math.round(pct)}%</b>
        <span>da meta</span>
      </div>
    </div>
  )
}

export const MILESTONES = [25, 50, 75, 100]

export function Milestones({ pct }: { pct: number }) {
  return (
    <div className="milestones" aria-hidden="true">
      {MILESTONES.map((m) => (
        <span key={m} className={pct >= m ? 'on' : ''}>
          {pct >= m ? '✓' : '○'} {m}%
        </span>
      ))}
    </div>
  )
}

export function GoalNumbers({ plan }: { plan: GoalPlan }) {
  if (!plan.hasGoal || !plan.hasProducts || plan.stage === 'batida') return null
  return (
    <div className="goal-nums">
      <div>
        <b>{plan.unitsNeeded != null ? formatNumber(plan.unitsNeeded, 0) : '—'}</b>
        <span>pãezinhos faltam</span>
      </div>
      <div>
        <b>{plan.perDay != null ? `~${formatNumber(plan.perDay, 0)}` : '—'}</b>
        <span>por dia ({plan.daysLeft} {plan.daysLeft === 1 ? 'dia' : 'dias'})</span>
      </div>
      <div>
        <b>{plan.ordersNeeded != null ? `~${formatNumber(plan.ordersNeeded, 0)}` : '—'}</b>
        <span>encomendas</span>
      </div>
    </div>
  )
}

export function GoalCard({ plan, name }: { plan: GoalPlan; name: string }) {
  const m = motivation(plan, name)
  const pace = paceNote(plan)
  return (
    <section className="card frame goal-card" aria-label="Minha meta">
      <div className="goal-top">
        {plan.hasGoal ? <ProgressRing pct={plan.progressPct} /> : <div className="goal-emoji" aria-hidden="true">🎯</div>}
        <div className="grow">
          <div className="eyebrow">Minha meta de lucro{plan.hasGoal ? ` · ${formatBRLShort(plan.goal)}` : ''}</div>
          <h2 style={{ marginTop: 4 }}>{m.emoji} {m.title}</h2>
          <p className="muted" style={{ marginTop: 6 }}>{m.text}</p>
        </div>
      </div>
      {plan.hasGoal && (
        <>
          {plan.hasProducts && <GoalNumbers plan={plan} />}
          <div className="row spread wrap">
            <span className="small bold">Lucro garantido: <span style={{ color: 'var(--green)' }}>{formatBRL(plan.profitSoFar)}</span></span>
            <Milestones pct={plan.progressPct} />
          </div>
          {pace && <p className="small muted">{pace}</p>}
        </>
      )}
      <Link to="/metas" className="btn sm" style={{ alignSelf: 'flex-start' }}>
        {plan.hasGoal ? 'Ver meu plano e simular' : 'Definir minha meta'} <Icon name="next" />
      </Link>
    </section>
  )
}
