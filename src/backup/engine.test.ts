import { describe, expect, it, vi } from 'vitest'
import { NAG_AFTER_MS, createBackupEngine, needsAttention, shouldAttempt } from './engine'
import { NeedsInteraction, OfflineError, type Provider, type ProviderState, type Snapshot } from './types'

const snap = (hash: string): Snapshot => ({ json: `{"h":"${hash}"}`, hash, day: '2026-10-10', counts: { products: 1, orders: 0, transactions: 0 } })
const mem = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

function setup(over: { backup?: Provider['backup'] } = {}) {
  let hash = 'h1'
  let t = 1_000_000
  const backup = vi.fn<Provider['backup']>(over.backup ?? (async () => ({ folderId: 'F' })))
  const provider = (id: 'drive' | 'folder'): Provider => ({ id, available: () => true, backup })
  const onSuccess = vi.fn()
  const storage = mem()
  const make = () =>
    createBackupEngine({ providers: { drive: provider('drive'), folder: provider('folder') }, snapshot: async () => snap(hash), onSuccess, storage, now: () => t })
  return { engine: make(), make, backup, onSuccess, setHash: (h: string) => (hash = h), tick: (ms: number) => (t += ms), now: () => t }
}

describe('motor de backup', () => {
  it('ao ligar, faz o primeiro backup interativo e guarda o resultado', async () => {
    const s = setup()
    expect(await s.engine.enable('drive')).toBe('ok')
    expect(s.backup).toHaveBeenCalledTimes(1)
    expect(s.backup.mock.calls[0]![1].interactive).toBe(true)
    const st = s.engine.getState().drive
    expect(st).toMatchObject({ enabled: true, status: 'ok', lastHash: 'h1', meta: { folderId: 'F' } })
    expect(s.onSuccess).toHaveBeenCalledWith(st.lastSuccessAt)
  })

  it('o automático não envia se nada mudou, e envia (sem janelas) se mudou', async () => {
    const s = setup()
    await s.engine.enable('drive')
    s.tick(31 * 60_000)
    await s.engine.auto('timer')
    expect(s.backup).toHaveBeenCalledTimes(1) // mesmo hash: pulou o envio
    s.setHash('h2')
    s.tick(31 * 60_000)
    await s.engine.auto('timer')
    expect(s.backup).toHaveBeenCalledTimes(2)
    expect(s.backup.mock.calls[1]![1].interactive).toBe(false)
    expect(s.engine.getState().drive.lastHash).toBe('h2')
  })

  it('respeita o intervalo mínimo entre tentativas', async () => {
    const s = setup()
    await s.engine.enable('drive')
    s.setHash('h2')
    s.tick(5 * 60_000)
    await s.engine.auto('timer')
    expect(s.backup).toHaveBeenCalledTimes(1) // só 5 min: ainda não
    s.tick(2 * 60_000)
    await s.engine.auto('change') // mudança tem intervalo menor (1 min)
    expect(s.backup).toHaveBeenCalledTimes(2)
  })

  it('precisando de login, fica pendente sem barulho até passar de 1 dia', async () => {
    const s = setup()
    await s.engine.enable('drive')
    s.backup.mockRejectedValueOnce(new NeedsInteraction())
    s.setHash('h2')
    s.tick(31 * 60_000)
    await s.engine.auto('timer')
    const st = s.engine.getState().drive
    expect(st.status).toBe('pending')
    expect(needsAttention(st, s.now())).toBe(false) // último sucesso há 31 min
    expect(needsAttention(st, s.now() + NAG_AFTER_MS + 1)).toBe(true)
    expect(needsAttention({ ...st, lastSuccessAt: null }, s.now())).toBe(true)
  })

  it('um toque dela resolve o pendente', async () => {
    const s = setup()
    await s.engine.enable('drive')
    s.backup.mockRejectedValueOnce(new NeedsInteraction())
    s.setHash('h2')
    s.tick(31 * 60_000)
    await s.engine.auto('timer')
    expect(s.engine.getState().drive.status).toBe('pending')
    expect(await s.engine.run('drive')).toBe('ok')
    expect(s.backup.mock.calls.at(-1)![1].interactive).toBe(true)
  })

  it('sem internet fica offline e tenta de novo quando a internet volta', async () => {
    const s = setup({ backup: async () => { throw new OfflineError() } })
    expect(await s.engine.enable('drive')).toBe('offline')
    s.backup.mockImplementation(async () => ({}))
    expect(s.engine.shouldAttempt('drive', 'timer')).toBe(false) // acabou de tentar
    expect(s.engine.shouldAttempt('drive', 'online')).toBe(true)
    await s.engine.auto('online')
    expect(s.engine.getState().drive.status).toBe('ok')
  })

  it('erros inesperados aparecem como erro com a mensagem', async () => {
    const s = setup({ backup: async () => { throw new Error('Google Drive 500') } })
    await s.engine.enable('drive')
    expect(s.engine.getState().drive).toMatchObject({ status: 'error', error: 'Google Drive 500' })
  })

  it('desligar limpa tudo; provedores são independentes', async () => {
    const s = setup()
    await s.engine.enable('drive')
    await s.engine.enable('folder', { folderName: 'Drive' })
    s.engine.disable('drive')
    expect(s.engine.getState().drive).toMatchObject({ enabled: false, status: 'off', lastHash: null })
    expect(s.engine.getState().folder.enabled).toBe(true)
    expect(s.engine.getState().folder.meta.folderName).toBe('Drive')
  })

  it('guarda o estado entre aberturas do app; “rodando” vira pendente', async () => {
    const s = setup()
    await s.engine.enable('drive')
    const reopened = s.make()
    expect(reopened.getState().drive).toMatchObject({ enabled: true, status: 'ok', meta: { folderId: 'F' } })
    s.backup.mockImplementationOnce(() => new Promise<void>(() => {})) // nunca termina (app fechou no meio)
    s.setHash('h9')
    void s.engine.run('drive', { force: true })
    expect(s.make().getState().drive.status).toBe('pending')
  })

  it('notifica quem está assistindo o estado', async () => {
    const s = setup()
    const seen: string[] = []
    s.engine.subscribe(() => seen.push(s.engine.getState().drive.status))
    await s.engine.enable('drive')
    expect(seen).toContain('running')
    expect(seen.at(-1)).toBe('ok')
  })
})

describe('política de tentativas', () => {
  const base: ProviderState = { enabled: true, status: 'ok', lastSuccessAt: 0, lastAttemptAt: 0, lastHash: null, meta: {} }
  it('desligado ou rodando nunca tenta; manual sempre tenta', () => {
    expect(shouldAttempt({ ...base, enabled: false }, 'manual', 1e9)).toBe(false)
    expect(shouldAttempt({ ...base, status: 'running' }, 'manual', 1e9)).toBe(false)
    expect(shouldAttempt(base, 'manual', 1)).toBe(true)
  })
  it('nunca tentou: tenta', () => {
    expect(shouldAttempt({ ...base, lastAttemptAt: null }, 'start', 5)).toBe(true)
  })
  it('pendente espera 10 min; ok espera 30', () => {
    expect(shouldAttempt({ ...base, status: 'pending' }, 'visible', 9 * 60_000)).toBe(false)
    expect(shouldAttempt({ ...base, status: 'pending' }, 'visible', 10 * 60_000)).toBe(true)
    expect(shouldAttempt(base, 'visible', 29 * 60_000)).toBe(false)
    expect(shouldAttempt(base, 'visible', 30 * 60_000)).toBe(true)
  })
})
