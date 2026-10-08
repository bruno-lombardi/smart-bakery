import { BACKUP_FILE_PREFIX } from './types'

const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

export const DRIVE_FOLDER_NAME = 'Pães & Afeto – Backups'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

export interface DriveFile {
  id: string
  name: string
  modifiedTime: string
  size?: string
}

/** O Google recusou o token (expirou ou foi revogado). */
export class DriveAuthError extends Error {
  constructor() {
    super('O Google pediu para entrar de novo')
    this.name = 'DriveAuthError'
  }
}

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

/**
 * Cliente mínimo da API do Google Drive (só fetch, sem bibliotecas).
 * Usa o escopo `drive.file`: o app só enxerga o que ele mesmo criou.
 */
export function createDriveClient(getToken: () => Promise<string>, fetchImpl: typeof fetch = (...a) => fetch(...a)) {
  async function call(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await getToken()
    const res = await fetchImpl(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } })
    if (res.status === 401) throw new DriveAuthError()
    if (!res.ok) throw new Error(`Google Drive ${res.status}: ${(await res.text()).slice(0, 200)}`)
    return res
  }

  async function list(q: string, extra: Record<string, string> = {}): Promise<DriveFile[]> {
    const params = new URLSearchParams({ q, fields: 'files(id,name,modifiedTime,size)', pageSize: '100', spaces: 'drive', ...extra })
    const res = await call(`${API}/files?${params}`)
    return ((await res.json()) as { files?: DriveFile[] }).files ?? []
  }

  return {
    /** Acha (ou cria) a pasta de backups. Reaproveita o id guardado se a pasta ainda existir. */
    async ensureFolder(cachedId?: string): Promise<string> {
      if (cachedId) {
        const res = await fetchImpl(`${API}/files/${cachedId}?fields=id,trashed`, { headers: { Authorization: `Bearer ${await getToken()}` } })
        if (res.status === 401) throw new DriveAuthError()
        if (res.ok && !((await res.json()) as { trashed?: boolean }).trashed) return cachedId
      }
      const found = await list(`name='${esc(DRIVE_FOLDER_NAME)}' and mimeType='${FOLDER_MIME}' and trashed=false`)
      if (found[0]) return found[0].id
      const res = await call(`${API}/files?fields=id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: FOLDER_MIME }),
      })
      return ((await res.json()) as { id: string }).id
    },

    /** Um arquivo por dia: atualiza o de hoje se já existe, senão cria. */
    async upsertBackup(folderId: string, name: string, json: string): Promise<void> {
      const existing = await list(`name='${esc(name)}' and '${esc(folderId)}' in parents and trashed=false`)
      if (existing[0]) {
        await call(`${UPLOAD}/files/${existing[0].id}?uploadType=media`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json; charset=UTF-8' },
          body: json,
        })
        return
      }
      const boundary = `paes${Math.random().toString(36).slice(2)}`
      const metadata = JSON.stringify({ name, parents: [folderId], mimeType: 'application/json' })
      const body =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${json}\r\n--${boundary}--`
      await call(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      })
    },

    /** Backups da pasta, do mais novo para o mais antigo. */
    async listBackups(folderId: string): Promise<DriveFile[]> {
      const files = await list(`'${esc(folderId)}' in parents and trashed=false and name contains '${BACKUP_FILE_PREFIX}'`)
      return files.sort((a, b) => b.name.localeCompare(a.name))
    },

    /** Apaga os mais antigos, mantendo os `keep` mais recentes. */
    async prune(folderId: string, keep: number): Promise<number> {
      const files = await this.listBackups(folderId)
      const old = files.slice(keep)
      for (const f of old) await call(`${API}/files/${f.id}`, { method: 'DELETE' })
      return old.length
    },

    async download(fileId: string): Promise<string> {
      return (await call(`${API}/files/${fileId}?alt=media`)).text()
    },
  }
}

export type DriveClient = ReturnType<typeof createDriveClient>
