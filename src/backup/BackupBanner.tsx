import { useState } from 'react'
import { useFeedback } from '../components/Feedback'
import { needsAttention } from './engine'
import { useBackupState } from './hooks'
import { backupEngine } from './index'
import type { ProviderId } from './types'

const NAMES: Record<ProviderId, string> = { drive: 'no Google Drive', folder: 'na pasta escolhida' }

/** Aviso discreto: só aparece quando o backup automático não consegue salvar há mais de 1 dia. */
export function BackupBanner() {
  const state = useBackupState()
  const { toast } = useFeedback()
  const [hidden, setHidden] = useState(false)
  const [busyId, setBusyId] = useState<ProviderId | null>(null)

  const id = busyId ?? (['drive', 'folder'] as const).find((p) => needsAttention(state[p], Date.now()))
  if (!id || hidden) return null

  async function fix(provider: ProviderId) {
    setBusyId(provider)
    const status = await backupEngine.run(provider)
    setBusyId(null)
    toast(status === 'ok' ? 'Backup salvo! Obrigada 💛' : 'Ainda não consegui salvar. Veja os detalhes em Ajustes.')
  }

  return (
    <div className="notice backup-banner" role="status">
      <span className="em">☁️</span>
      <div className="grow">
        <b>Seu backup {NAMES[id]} está parado.</b>
        <div className="small">Faz mais de 1 dia que não consigo salvar. Um toque resolve.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn sm primary" disabled={busyId != null} onClick={() => void fix(id)}>{busyId != null ? 'Salvando…' : 'Salvar agora'}</button>
        <button className="btn sm ghost" onClick={() => setHidden(true)} aria-label="Dispensar aviso">✕</button>
      </div>
    </div>
  )
}
