export type ProviderId = 'drive' | 'folder'

export type ProviderStatus = 'off' | 'ok' | 'running' | 'pending' | 'offline' | 'error'

export interface ProviderState {
  enabled: boolean
  status: ProviderStatus
  lastSuccessAt: number | null
  lastAttemptAt: number | null
  /** Hash do último conteúdo enviado: se não mudou, não envia de novo */
  lastHash: string | null
  error?: string
  /** Dados do provedor (ex.: id da pasta no Drive, nome da pasta escolhida) */
  meta: Record<string, string>
}

export interface BackupState {
  drive: ProviderState
  folder: ProviderState
}

export interface Snapshot {
  json: string
  hash: string
  /** Data local (AAAA-MM-DD), usada no nome do arquivo */
  day: string
  counts: { products: number; orders: number; transactions: number }
}

export interface RunOptions {
  /** true quando veio de um toque dela: pode abrir janela de login/permissão */
  interactive: boolean
  meta: Record<string, string>
}

export interface Provider {
  id: ProviderId
  /** O navegador/configuração permite usar este provedor? */
  available(): boolean
  /** Envia o snapshot. Pode devolver meta atualizada (ex.: id da pasta). */
  backup(snap: Snapshot, opts: RunOptions): Promise<Record<string, string> | void>
}

/** O provedor precisa de um toque dela (login do Google expirou, permissão de pasta...). */
export class NeedsInteraction extends Error {
  constructor(message = 'Precisa de um toque para continuar') {
    super(message)
    this.name = 'NeedsInteraction'
  }
}

/** Sem internet (ou o serviço não carregou). */
export class OfflineError extends Error {
  constructor(message = 'Sem internet no momento') {
    super(message)
    this.name = 'OfflineError'
  }
}

export const backupFileName = (day: string) => `paes-e-afeto-backup-${day}.json`
export const BACKUP_FILE_PREFIX = 'paes-e-afeto-backup-'
/** Quantos backups diários guardar */
export const KEEP_DAYS = 30
