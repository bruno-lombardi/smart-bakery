import { NeedsInteraction, OfflineError } from './types'
import type { BackupState, Provider, ProviderId, ProviderState, ProviderStatus, Snapshot } from './types'

const STORAGE_KEY = 'pa-backup-v1'
export const NAG_AFTER_MS = 24 * 60 * 60 * 1000

const blank = (): ProviderState => ({ enabled: false, status: 'off', lastSuccessAt: null, lastAttemptAt: null, lastHash: null, meta: {} })

export type Reason = 'start' | 'visible' | 'online' | 'change' | 'timer' | 'manual'

/**
 * Decide se vale tentar agora. A tentativa é barata (só compara o hash dos dados);
 * o envio só acontece se algo mudou.
 */
export function shouldAttempt(p: ProviderState, reason: Reason, now: number): boolean {
  if (!p.enabled || p.status === 'running') return false
  if (reason === 'manual') return true
  if (reason === 'online') return p.status === 'offline' || p.status === 'error' || p.status === 'pending'
  const gap = p.status === 'ok' ? (reason === 'change' ? 60_000 : 30 * 60_000) : 10 * 60_000
  return p.lastAttemptAt == null || now - p.lastAttemptAt >= gap
}

/** Só incomoda com aviso quando já faz mais de 1 dia sem backup que deu certo. */
export function needsAttention(p: ProviderState, now: number): boolean {
  if (!p.enabled) return false
  if (p.status !== 'pending' && p.status !== 'error' && p.status !== 'offline') return false
  return p.lastSuccessAt == null || now - p.lastSuccessAt > NAG_AFTER_MS
}

interface Storage {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
}

export interface EngineDeps {
  providers: Record<ProviderId, Provider>
  snapshot: () => Promise<Snapshot>
  onSuccess?: (at: number) => void | Promise<void>
  storage?: Storage | null
  now?: () => number
}

function loadState(storage: Storage | null): BackupState {
  const base: BackupState = { drive: blank(), folder: blank() }
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw) as Partial<BackupState>
    for (const id of ['drive', 'folder'] as const) {
      const s = saved[id]
      if (s) base[id] = { ...blank(), ...s, status: s.enabled ? (s.status === 'running' ? 'pending' : s.status ?? 'pending') : 'off' }
    }
  } catch {
    /* estado corrompido: começa do zero */
  }
  return base
}

export function createBackupEngine(deps: EngineDeps) {
  const storage = deps.storage === undefined ? (typeof localStorage !== 'undefined' ? localStorage : null) : deps.storage
  const now = deps.now ?? (() => Date.now())
  let state = loadState(storage)
  const listeners = new Set<() => void>()

  function commit(next: BackupState) {
    state = next
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* sem armazenamento: segue só em memória */
    }
    listeners.forEach((l) => l())
  }
  const patch = (id: ProviderId, p: Partial<ProviderState>) => commit({ ...state, [id]: { ...state[id], ...p } })

  async function run(id: ProviderId, opts: { interactive?: boolean; force?: boolean } = {}): Promise<ProviderStatus> {
    const prov = deps.providers[id]
    const cur = state[id]
    if (!cur.enabled || cur.status === 'running') return cur.status
    patch(id, { status: 'running', lastAttemptAt: now() })
    try {
      const snap = await deps.snapshot()
      if (!opts.force && snap.hash === cur.lastHash) {
        patch(id, { status: 'ok', error: undefined })
        return 'ok'
      }
      const meta = (await prov.backup(snap, { interactive: !!opts.interactive, meta: state[id].meta })) ?? {}
      const at = now()
      patch(id, { status: 'ok', lastSuccessAt: at, lastHash: snap.hash, error: undefined, meta: { ...state[id].meta, ...meta } })
      await deps.onSuccess?.(at)
      return 'ok'
    } catch (e) {
      if (e instanceof NeedsInteraction) patch(id, { status: 'pending', error: e.message })
      else if (e instanceof OfflineError) patch(id, { status: 'offline', error: e.message })
      else patch(id, { status: 'error', error: e instanceof Error ? e.message : 'Algo deu errado no backup' })
      return state[id].status
    }
  }

  return {
    getState: () => state,
    subscribe(fn: () => void) {
      listeners.add(fn)
      return () => void listeners.delete(fn)
    },
    available: (id: ProviderId) => deps.providers[id].available(),
    shouldAttempt: (id: ProviderId, reason: Reason) => shouldAttempt(state[id], reason, now()),

    /** Roda os provedores ligados, respeitando os intervalos. Sem janelas: serve para o automático. */
    async auto(reason: Reason) {
      for (const id of ['drive', 'folder'] as const) {
        if (shouldAttempt(state[id], reason, now())) await run(id)
      }
    },

    /** A partir de um toque dela: pode abrir login/permissão. */
    run: (id: ProviderId, opts?: { force?: boolean }) => run(id, { interactive: true, force: opts?.force ?? true }),

    /** Liga o provedor e já faz o primeiro backup (precisa ser chamado direto de um toque). */
    async enable(id: ProviderId, meta: Record<string, string> = {}) {
      patch(id, { enabled: true, status: 'pending', error: undefined, lastHash: null, meta: { ...state[id].meta, ...meta } })
      return run(id, { interactive: true, force: true })
    },

    disable(id: ProviderId) {
      commit({ ...state, [id]: { ...blank() } })
    },
  }
}

export type BackupEngine = ReturnType<typeof createBackupEngine>
