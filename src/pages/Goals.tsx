import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { saveSettings } from '../db/db'
import { useIntel } from '../db/useIntel'
import { Field, MoneyInput } from '../components/Fields'
import { GoalCard, GoalNumbers } from '../components/GoalCard'
import { useFeedback } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { weeklyStreak } from '../lib/achievements'
import { simulate } from '../lib/goals'
import { formatBRL, formatBRLShort, formatNumber } from '../lib/money'

export default function Goals() {
  const intel = useIntel()
  const { toast } = useFeedback()
  const [goalInput, setGoalInput] = useState<number | null | undefined>(undefined)
  const [perWeek, setPerWeek] = useState<number | null>(null)
  const [adj, setAdj] = useState(0)

  const streak = useMemo(() => (intel ? weeklyStreak(intel.orders, intel.today) : 0), [intel])

  if (!intel) return null
  const { plan, settings, products, ingMap, mix, achievements } = intel
  const firstName = settings.ownerName.split(' ')[0]
  const editing = goalInput !== undefined
  const unlocked = achievements.filter((a) => a.unlocked).length

  const weekly = perWeek ?? Math.max(10, Math.min(500, plan.perWeek ?? 50))
  const sim = simulate({ perWeek: weekly, priceAdjPct: adj, products, ingredients: ingMap, settings, mix, goal: plan.goal })
  const reached = plan.hasGoal && sim.monthlyProfit >= plan.goal

  async function saveGoal() {
    await saveSettings({ monthlyProfitGoal: goalInput ?? 0 })
    setGoalInput(undefined)
    toast('Meta atualizada! Vamos com tudo 💪')
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Minha meta</h1>
          <p>Seu norte, seu plano e a motivação de cada dia.</p>
        </div>
        {!editing && (
          <button className="btn" onClick={() => setGoalInput(plan.goal || null)}><Icon name="edit" /> {plan.hasGoal ? 'Mudar meta' : 'Definir meta'}</button>
        )}
      </div>

      {editing && (
        <section className="card stack">
          <h3>Quanto você quer de lucro por mês?</h3>
          <div className="chips" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
            {[1000, 2000, 3000, 5000, 8000].map((g) => (
              <button key={g} className={`chip${goalInput === g ? ' on' : ''}`} onClick={() => setGoalInput(g)}>{formatBRLShort(g)}</button>
            ))}
          </div>
          <Field label="Meta de lucro mensal" htmlFor="g-goal" hint="O que sobra depois de ingredientes, embalagem, gás, seu tempo e despesas gerais.">
            <MoneyInput id="g-goal" value={goalInput ?? null} onChange={setGoalInput} />
          </Field>
          <div className="row">
            <button className="btn" onClick={() => setGoalInput(undefined)}>Cancelar</button>
            <button className="btn primary" disabled={(goalInput ?? 0) <= 0} onClick={saveGoal}>Salvar meta</button>
          </div>
        </section>
      )}

      <GoalCard plan={plan} name={firstName} />

      {plan.hasGoal && !plan.hasProducts && (
        <div className="notice">
          <span className="em">📖</span>
          <div><b>Cadastre seus pães para eu calcular o plano.</b>
            <div className="small">Preciso saber o custo e o preço de cada um para dizer quantos faltam.</div>
            <Link to="/produtos?novo=1" className="bold small">Cadastrar o primeiro pão →</Link></div>
        </div>
      )}

      {plan.hasGoal && plan.hasProducts && (
        <>
          <section>
            <div className="section-title" style={{ marginTop: 0 }}><h2>Seu plano do mês</h2></div>
            {plan.stage === 'batida' ? (
              <div className="card">Meta batida! Cada pãozinho a mais agora é lucro extra. Que tal sonhar mais alto no próximo mês? ✨</div>
            ) : (
              <div className="card stack">
                <GoalNumbers plan={plan} />
                <p className="small muted">
                  Cada pãozinho deixa em média <b>{formatBRL(plan.avgProfitPerUnit)}</b> de lucro, com a sua mistura de produtos e preços atuais.
                  {plan.avgProfitPerUnit <= 0 && ' Hoje seus preços não deixam lucro: ajuste-os em Preços.'}
                </p>
                {plan.perWeek != null && (
                  <p>Em resumo: <b>~{formatNumber(plan.perWeek, 0)} pãezinhos por semana</b> até o fim do mês e a meta é sua. 💪</p>
                )}
              </div>
            )}
          </section>

          {plan.paths.length > 0 && (
            <section>
              <div className="section-title" style={{ marginTop: 0 }}><h2>Caminhos até a meta</h2></div>
              <p className="muted small" style={{ marginBottom: 10 }}>Se você vendesse só um tipo de pão, quantos faltariam:</p>
              <div className="list">
                {plan.paths.map((p, i) => (
                  <div className="item" key={p.name} style={{ cursor: 'default' }}>
                    <div className="emoji">{p.emoji}</div>
                    <div className="grow">
                      <div className="title">{p.name} {i === 0 && <span className="badge pago">mais lucrativo</span>}</div>
                      <div className="small muted">sobra {formatBRL(p.profitPerUnit)} em cada</div>
                    </div>
                    <div className="right"><div className="amount">{formatNumber(p.units, 0)}</div><div className="tiny muted">unidades</div></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="section-title" style={{ marginTop: 0 }}><h2>E se…? Simulador 🔮</h2></div>
            <div className="card stack">
              <div className="field">
                <label htmlFor="sim-week" className="label">Vendendo <b style={{ color: 'var(--red)' }}>{formatNumber(weekly, 0)} pãezinhos por semana</b></label>
                <input id="sim-week" type="range" min={5} max={500} step={5} value={weekly} onChange={(e) => setPerWeek(Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="sim-adj" className="label">E mudando os preços em <b style={{ color: 'var(--red)' }}>{adj > 0 ? '+' : ''}{adj}%</b></label>
                <input id="sim-adj" type="range" min={-10} max={30} step={1} value={adj} onChange={(e) => setAdj(Number(e.target.value))} />
              </div>
              <div className={`sim-result${reached ? ' ok' : ''}`} aria-live="polite">
                <div className="eyebrow">Lucro por mês</div>
                <div className="big">{formatBRL(sim.monthlyProfit)}</div>
                <div className="small">
                  {reached
                    ? `🎉 Isso passa da sua meta de ${formatBRLShort(plan.goal)}!`
                    : `${formatNumber(sim.pctOfGoal, 0)}% da meta.${sim.perWeekForGoal ? ` Com esses preços, bastam ${formatNumber(sim.perWeekForGoal, 0)} pãezinhos por semana.` : ''}`}
                </div>
              </div>
              <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => { setPerWeek(null); setAdj(0) }}>Voltar ao plano</button>
            </div>
          </section>
        </>
      )}

      <section>
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>Conquistas</h2><span className="eyebrow">{unlocked} de {achievements.length}</span>
        </div>
        {streak > 0 && (
          <div className="notice info" style={{ marginBottom: 12 }}>
            <span className="em">🔥</span>
            <div><b>{streak} {streak === 1 ? 'semana seguida' : 'semanas seguidas'} com encomendas!</b>
              <div className="small">{streak >= 4 ? 'Constância é o segredo de uma padaria querida.' : 'Continue assim para acender a conquista “Mês de fogo”.'}</div></div>
          </div>
        )}
        <div className="badges">
          {achievements.map((a) => (
            <div key={a.id} className={`ach${a.unlocked ? ' on' : ''}`}>
              <div className="ach-emoji">{a.unlocked ? a.emoji : '🔒'}</div>
              <b>{a.title}</b>
              <span>{a.desc}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
