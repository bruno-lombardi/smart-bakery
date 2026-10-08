import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveSettings } from '../db/db'
import { loadStarterCatalog } from '../db/seed'
import { formatBRL, formatBRLShort } from '../lib/money'
import { BunArt } from './Brand'
import { MoneyInput } from './Fields'
import { Icon } from './Icon'

const GOAL_CHIPS = [1000, 2000, 3000, 5000]
const HOUR_CHIPS = [10, 15, 20, 30]
const STEPS = 5

export function Onboarding({ initialName }: { initialName: string }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(initialName)
  const [goal, setGoal] = useState<number | null>(2000)
  const [hour, setHour] = useState<number | null>(15)
  const first = name.trim().split(' ')[0] || 'amiga'

  async function finish(dest: 'revisar' | 'inicio') {
    await saveSettings({
      ownerName: name.trim() || 'Ana Paula',
      monthlyProfitGoal: goal ?? 0,
      hourlyRate: hour ?? 0,
      onboarded: true,
      celebrated: null,
    })
    await loadStarterCatalog()
    navigate(dest === 'revisar' ? '/produtos?aba=insumos' : '/')
  }

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  return (
    <div className="onboard" role="dialog" aria-modal="true" aria-label="Boas-vindas">
      <div className="card frame onboard-card">
        <div className="dots" aria-hidden="true">
          {Array.from({ length: STEPS }, (_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}
        </div>

        {step === 0 && (
          <div className="step">
            <BunArt className="onboard-art" />
            <h1>Que bom ter você aqui! 🥖</h1>
            <p className="lead">Eu vou te ajudar a precificar seus pãezinhos, organizar as encomendas e chegar na meta que você sonhar.</p>
            <p className="muted">São só 3 perguntinhas rápidas. Seus dados ficam guardados só neste aparelho.</p>
            <button className="btn primary block" onClick={next}>Bora começar</button>
          </div>
        )}

        {step === 1 && (
          <div className="step">
            <h1>Como posso te chamar?</h1>
            <p className="muted">Assim fica mais gostoso conversar.</p>
            <input className="input big" aria-label="Seu nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoFocus />
            <button className="btn primary block" disabled={!name.trim()} onClick={next}>Continuar</button>
          </div>
        )}

        {step === 2 && (
          <div className="step">
            <h1>{first}, quanto você quer que sobre de lucro por mês?</h1>
            <p className="muted">Lucro é o que sobra no seu bolso depois de pagar ingredientes, embalagem, gás e o seu tempo de trabalho. Esse será o seu norte: eu calculo quantos pãezinhos faltam para chegar lá.</p>
            <div className="chips" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
              {GOAL_CHIPS.map((g) => (
                <button key={g} className={`chip${goal === g ? ' on' : ''}`} onClick={() => setGoal(g)}>{formatBRLShort(g)}</button>
              ))}
            </div>
            <MoneyInput ariaLabel="Meta de lucro por mês" value={goal} onChange={setGoal} />
            <p className="hint">Pode ser um valor sonhador! Dá para mudar quando quiser.</p>
            <button className="btn primary block" disabled={(goal ?? 0) <= 0} onClick={next}>Essa é a minha meta</button>
          </div>
        )}

        {step === 3 && (
          <div className="step">
            <h1>Quanto vale uma hora do seu trabalho?</h1>
            <p className="muted">O seu tempo no forno também é custo! Ele entra no preço de cada fornada para você nunca trabalhar de graça.</p>
            <div className="chips" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
              {HOUR_CHIPS.map((h) => (
                <button key={h} className={`chip${hour === h ? ' on' : ''}`} onClick={() => setHour(h)}>{formatBRL(h)}/hora</button>
              ))}
            </div>
            <MoneyInput ariaLabel="Valor da hora" value={hour} onChange={setHour} />
            <p className="hint">Não sabe? Deixe R$ 15 e ajuste depois em Ajustes.</p>
            <button className="btn primary block" onClick={next}>Continuar</button>
          </div>
        )}

        {step === 4 && (
          <div className="step">
            <BunArt className="onboard-art" steam={false} />
            <h1>Tudo pronto, {first}! 🎉</h1>
            <p className="lead">Sua meta: <b style={{ color: 'var(--red)' }}>{formatBRL(goal ?? 0)}</b> de lucro por mês.</p>
            <p className="muted">Já deixei o <b>seu cardápio cadastrado</b>, com custos estimados e preços calculados para dar lucro saudável. Você só precisa ajustar o que for diferente na sua cozinha.</p>
            <button className="btn primary block" onClick={() => void finish('revisar')}>Conferir meus custos e preços</button>
            <button className="btn ghost block sm" onClick={() => void finish('inicio')}>Ir para o início</button>
          </div>
        )}

        {step > 0 && (
          <button className="btn ghost sm onboard-back" onClick={back}><Icon name="back" /> Voltar</button>
        )}
      </div>
    </div>
  )
}
