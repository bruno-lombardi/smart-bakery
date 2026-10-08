import { useEffect, useState } from 'react'
import { Modal } from '../components/Modal'
import { useFeedback } from '../components/Feedback'
import { applyBackup, backupCounts } from '../db/backup'
import { db } from '../db/db'
import { formatLongDay } from '../lib/dates'
import type { DriveFile } from './drive'
import { fetchDriveBackup, type DriveListing } from './restore'

export function DriveRestoreModal({ listing, onClose }: { listing: Promise<DriveListing>; onClose: () => void }) {
  const { toast, confirm } = useFeedback()
  const [data, setData] = useState<DriveListing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    listing.then(setData).catch((e) => setError(e instanceof Error ? e.message : 'Não consegui abrir o Google Drive.'))
  }, [listing])

  async function restore(f: DriveFile) {
    if (!data) return
    setBusy(f.id)
    try {
      const backup = await fetchDriveBackup(data.client, f.id)
      const c = backupCounts(backup)
      const now = { orders: await db.orders.count(), products: await db.products.count() }
      const ok = await confirm({
        title: 'Restaurar este backup?',
        text: `A cópia tem ${c.products} produtos, ${c.orders} encomendas e ${c.transactions} lançamentos. Os dados de agora (${now.products} produtos, ${now.orders} encomendas) serão substituídos.`,
        confirmLabel: 'Restaurar',
        danger: true,
      })
      if (!ok) return
      await applyBackup(backup)
      toast('Backup restaurado! 🎉')
      onClose()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível restaurar.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal title="Restaurar do Google Drive" onClose={onClose} footer={<button className="btn" onClick={onClose}>Fechar</button>}>
      {!data && !error && <p className="muted">Procurando seus backups…</p>}
      {error && <div className="notice"><span className="em">😕</span><div>{error}</div></div>}
      {data && data.files.length === 0 && <p className="muted">Nenhum backup encontrado na pasta do Drive.</p>}
      {data && data.files.length > 0 && (
        <div className="list">
          {data.files.map((f) => {
            const day = f.name.match(/(\d{4}-\d{2}-\d{2})/)?.[1]
            return (
              <div className="item" key={f.id} style={{ cursor: 'default' }}>
                <div className="emoji">💾</div>
                <div className="grow">
                  <div className="title" style={{ textTransform: 'capitalize' }}>{day ? formatLongDay(day) : f.name}</div>
                  {f.size && <div className="tiny muted">{Math.max(1, Math.round(Number(f.size) / 1024))} KB</div>}
                </div>
                <button className="btn sm" disabled={busy != null} onClick={() => void restore(f)}>{busy === f.id ? 'Abrindo…' : 'Restaurar'}</button>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
