import { backupFileName } from './types'

function asFile(json: string, day: string) {
  return new File([json], backupFileName(day), { type: 'application/json' })
}

/** Celulares: abre a folha de compartilhar (Drive, WhatsApp, e-mail…) com o arquivo anexado. */
export function canShareFiles(): boolean {
  try {
    return typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [asFile('{}', '2000-01-01')] })
  } catch {
    return false
  }
}

export async function shareBackup(json: string, day: string): Promise<boolean> {
  try {
    await navigator.share({
      files: [asFile(json, day)],
      title: 'Backup Pães & Afeto',
      text: 'Cópia de segurança do painel da padaria. Guarde em um lugar seguro 💛',
    })
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return false
    throw e
  }
}
