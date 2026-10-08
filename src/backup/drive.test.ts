import { describe, expect, it } from 'vitest'
import { DRIVE_FOLDER_NAME, DriveAuthError, createDriveClient } from './drive'

interface Call { url: string; method: string; body?: string; auth?: string }

function fakeDrive(handler: (c: Call) => { status?: number; json?: unknown; text?: string }) {
  const calls: Call[] = []
  const fetchImpl = (async (url: string, init: RequestInit = {}) => {
    const c: Call = { url, method: init.method ?? 'GET', body: init.body as string | undefined, auth: (init.headers as Record<string, string>)?.Authorization }
    calls.push(c)
    const r = handler(c)
    return new Response(r.text ?? JSON.stringify(r.json ?? {}), { status: r.status ?? 200 })
  }) as unknown as typeof fetch
  return { calls, client: createDriveClient(async () => 'tok', fetchImpl) }
}

describe('cliente do Google Drive', () => {
  it('cria a pasta quando não existe e reaproveita quando existe', async () => {
    const a = fakeDrive((c) => (c.method === 'POST' ? { json: { id: 'novo' } } : { json: { files: [] } }))
    expect(await a.client.ensureFolder()).toBe('novo')
    const post = a.calls.find((c) => c.method === 'POST')!
    expect(JSON.parse(post.body!)).toEqual({ name: DRIVE_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
    expect(post.auth).toBe('Bearer tok')

    const b = fakeDrive(() => ({ json: { files: [{ id: 'f1', name: DRIVE_FOLDER_NAME }] } }))
    expect(await b.client.ensureFolder()).toBe('f1')
    expect(b.calls.every((c) => c.method === 'GET')).toBe(true)
  })

  it('usa o id guardado se a pasta ainda existe e não foi para a lixeira', async () => {
    const ok = fakeDrive(() => ({ json: { id: 'abc', trashed: false } }))
    expect(await ok.client.ensureFolder('abc')).toBe('abc')
    expect(ok.calls).toHaveLength(1)

    const trashed = fakeDrive((c) => (c.url.includes('/files/abc') ? { json: { id: 'abc', trashed: true } } : c.method === 'POST' ? { json: { id: 'nova' } } : { json: { files: [] } }))
    expect(await trashed.client.ensureFolder('abc')).toBe('nova')
  })

  it('cria o backup do dia em multipart dentro da pasta', async () => {
    const { client, calls } = fakeDrive(() => ({ json: { files: [], id: 'x' } }))
    await client.upsertBackup('pasta1', 'paes-e-afeto-backup-2026-10-10.json', '{"a":1}')
    const post = calls.find((c) => c.method === 'POST')!
    expect(post.url).toContain('uploadType=multipart')
    expect(post.body).toContain('"parents":["pasta1"]')
    expect(post.body).toContain('{"a":1}')
  })

  it('atualiza o arquivo do dia em vez de criar outro', async () => {
    const { client, calls } = fakeDrive(() => ({ json: { files: [{ id: 'arq9', name: 'x' }] } }))
    await client.upsertBackup('pasta1', 'paes-e-afeto-backup-2026-10-10.json', '{"b":2}')
    const patch = calls.find((c) => c.method === 'PATCH')!
    expect(patch.url).toContain('/files/arq9?uploadType=media')
    expect(patch.body).toBe('{"b":2}')
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
  })

  it('mantém só os N mais recentes', async () => {
    const files = ['2026-10-01', '2026-10-03', '2026-10-02', '2026-10-04'].map((d, i) => ({ id: `id${i}`, name: `paes-e-afeto-backup-${d}.json`, modifiedTime: '' }))
    const { client, calls } = fakeDrive(() => ({ json: { files } }))
    expect(await client.prune('p', 2)).toBe(2)
    const deleted = calls.filter((c) => c.method === 'DELETE').map((c) => c.url.split('/').pop())
    expect(deleted.sort()).toEqual(['id0', 'id2']) // 10-01 e 10-02 são os mais antigos
  })

  it('lista do mais novo para o mais antigo e baixa o conteúdo', async () => {
    const files = [{ id: 'a', name: 'paes-e-afeto-backup-2026-01-01.json', modifiedTime: '' }, { id: 'b', name: 'paes-e-afeto-backup-2026-02-01.json', modifiedTime: '' }]
    const { client } = fakeDrive((c) => (c.url.includes('alt=media') ? { text: '{"ok":true}' } : { json: { files } }))
    expect((await client.listBackups('p')).map((f) => f.id)).toEqual(['b', 'a'])
    expect(await client.download('b')).toBe('{"ok":true}')
  })

  it('escapa aspas na busca e sinaliza token recusado', async () => {
    const { client, calls } = fakeDrive(() => ({ json: { files: [] } }))
    await client.upsertBackup("p'1", "o'brien.json", '{}')
    expect(decodeURIComponent(calls[0].url.replace(/\+/g, ' '))).toContain("o\\'brien.json")

    const unauthorized = fakeDrive(() => ({ status: 401, text: 'no' }))
    await expect(unauthorized.client.listBackups('p')).rejects.toBeInstanceOf(DriveAuthError)
    const broken = fakeDrive(() => ({ status: 500, text: 'boom' }))
    await expect(broken.client.listBackups('p')).rejects.toThrow(/500/)
  })
})
