import { buildBackup } from '../db/backup'
import { todayISO } from '../lib/dates'
import type { Snapshot } from './types'

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Foto dos dados agora. O hash ignora data de exportação e “último backup” para não mudar sozinho. */
export async function makeSnapshot(day = todayISO()): Promise<Snapshot> {
  const backup = await buildBackup()
  const stable = {
    ...backup.data,
    settings: (backup.data.settings as Record<string, unknown>[]).map((s) => {
      const { lastBackupAt: _ignored, ...rest } = s
      void _ignored
      return rest
    }),
  }
  return {
    json: JSON.stringify(backup),
    hash: await sha256(JSON.stringify(stable)),
    day,
    counts: {
      products: backup.data.products.length,
      orders: backup.data.orders.length,
      transactions: backup.data.transactions.length,
    },
  }
}
