import Dexie from 'dexie'
import { BACKUP_FILE_PREFIX, KEEP_DAYS, NeedsInteraction, backupFileName, type Provider } from './types'

/**
 * Backup numa pasta do computador (File System Access API, só Chrome/Edge no computador).
 * Dica: se a pasta escolhida for a do “Google Drive para computador”, o Drive sincroniza sozinho.
 */

interface PermissionHandle {
  queryPermission(d: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission(d: { mode: 'readwrite' }): Promise<PermissionState>
}
type DirHandle = FileSystemDirectoryHandle & PermissionHandle & { values(): AsyncIterable<FileSystemHandle> }

class HandleStore extends Dexie {
  kv!: Dexie.Table<{ key: string; value: unknown }, string>
  constructor() {
    super('ana-paula-backup-meta')
    this.version(1).stores({ kv: 'key' })
  }
}
const store = new HandleStore()

export const folderSupported = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window

async function getHandle(): Promise<DirHandle | null> {
  return ((await store.kv.get('folder'))?.value as DirHandle | undefined) ?? null
}

export async function chooseFolder(): Promise<string> {
  const picker = (window as unknown as { showDirectoryPicker(o: object): Promise<DirHandle> }).showDirectoryPicker
  const handle = await picker.call(window, { mode: 'readwrite', id: 'paes-e-afeto-backup' })
  await store.kv.put({ key: 'folder', value: handle })
  return handle.name
}

export async function forgetFolder() {
  await store.kv.delete('folder')
}

async function ensurePermission(handle: DirHandle, interactive: boolean) {
  let perm = await handle.queryPermission({ mode: 'readwrite' })
  if (perm === 'prompt' && interactive) perm = await handle.requestPermission({ mode: 'readwrite' })
  if (perm !== 'granted') throw new NeedsInteraction('O navegador pediu para liberar a pasta de novo')
}

export const folderProvider: Provider = {
  id: 'folder',
  available: folderSupported,
  async backup(snap, { interactive }) {
    const handle = await getHandle()
    if (!handle) throw new NeedsInteraction('Escolha a pasta dos backups')
    await ensurePermission(handle, interactive)
    const file = await handle.getFileHandle(backupFileName(snap.day), { create: true })
    const writable = await file.createWritable()
    await writable.write(snap.json)
    await writable.close()

    const names: string[] = []
    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && entry.name.startsWith(BACKUP_FILE_PREFIX)) names.push(entry.name)
    }
    names.sort().reverse()
    for (const old of names.slice(KEEP_DAYS)) await handle.removeEntry(old)
    return { folderName: handle.name }
  },
}
