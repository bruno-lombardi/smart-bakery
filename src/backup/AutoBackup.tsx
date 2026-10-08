import { useEffect } from 'react'
import { useBackupState } from './hooks'
import { backupEngine, driveConfigured } from './index'
import { watchChanges } from './changes'
import { loadGis } from './google-auth'

const CHANGE_DEBOUNCE_MS = 2 * 60_000
const TIMER_MS = 15 * 60_000

/** Cuida do backup automático enquanto o app está aberto. Não desenha nada. */
export function AutoBackup() {
  const state = useBackupState()
  const driveOn = state.drive.enabled

  // O script do Google precisa estar carregado antes do toque, senão a janela de login pode ser bloqueada.
  useEffect(() => {
    if (driveConfigured && navigator.onLine) loadGis().catch(() => undefined)
  }, [driveOn])

  useEffect(() => {
    const auto = (reason: Parameters<typeof backupEngine.auto>[0]) => void backupEngine.auto(reason)
    const start = setTimeout(() => auto('start'), 4000)
    const timer = setInterval(() => auto('timer'), TIMER_MS)
    const onVisible = () => document.visibilityState === 'visible' && auto('visible')
    const onOnline = () => auto('online')
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)

    let debounce: ReturnType<typeof setTimeout> | undefined
    const unwatch = watchChanges(() => {
      clearTimeout(debounce)
      debounce = setTimeout(() => auto('change'), CHANGE_DEBOUNCE_MS)
    })

    return () => {
      clearTimeout(start)
      clearInterval(timer)
      clearTimeout(debounce)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      unwatch()
    }
  }, [])

  return null
}
