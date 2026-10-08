import { useEffect, useMemo, useRef, useState } from 'react'
import { useFeedback } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { downloadBackup, restoreBackup } from '../db/backup'
import { useSettings } from '../db/hooks'
import { formatWhen } from '../lib/dates'
import { DriveRestoreModal } from './DriveRestoreModal'
import { chooseFolder, forgetFolder } from './folder'
import { forgetToken, loadGis } from './google-auth'
import { useBackupState } from './hooks'
import { backupEngine, canShareFiles, driveConfigured, folderSupported } from './index'
import { listDriveBackups, type DriveListing } from './restore'
import { shareBackup } from './share'
import { makeSnapshot } from './snapshot'
import type { ProviderId, ProviderState } from './types'

const DAY = 86_400_000

function StatusBadge({ p }: { p: ProviderState }) {
  if (!p.enabled) return <span className="badge entregue">Desligado</span>
  if (p.status === 'running') return <span className="badge novo">Salvando…</span>
  if (p.status === 'ok') return <span className="badge pago">Ligado ✓</span>
  if (p.status === 'offline') return <span className="badge parcial">Sem internet</span>
  if (p.status === 'pending') return <span className="badge parcial">Precisa de um toque</span>
  return <span className="badge pendente">Erro</span>
}

export function BackupCard() {
  const state = useBackupState()
  const settings = useSettings()
  const { toast, confirm } = useFeedback()
  const fileRef = useRef<HTMLInputElement>(null)
  const [restore, setRestore] = useState<Promise<DriveListing> | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const canShare = useMemo(() => canShareFiles(), [])

  // Deixa o script do Google pronto: o login precisa abrir no instante do toque.
  useEffect(() => {
    if (driveConfigured && navigator.onLine) loadGis().catch(() => undefined)
  }, [])

  const now = Date.now()
  const lastAuto = Math.max(state.drive.lastSuccessAt ?? 0, state.folder.lastSuccessAt ?? 0)
  const protectedNow = (['drive', 'folder'] as const).some((id) => state[id].enabled && state[id].lastSuccessAt != null && now - state[id].lastSuccessAt! < 3 * DAY)
  const anyEnabled = state.drive.enabled || state.folder.enabled

  async function enable(id: ProviderId) {
    setBusy(id)
    try {
      let meta: Record<string, string> = {}
      if (id === 'folder') meta = { folderName: await chooseFolder() }
      const status = await backupEngine.enable(id, meta)
      if (status === 'ok') {
        toast(id === 'drive' ? 'Pronto! Backup no Google Drive ligado ☁️' : 'Pronto! Backup na pasta ligado 📁')
        return
      }
      // Não deu certo: desfaz para não ficar “ligado” sem funcionar.
      const detail = backupEngine.getState()[id].error
      backupEngine.disable(id)
      if (id === 'folder') await forgetFolder()
      toast(status === 'pending' ? 'Não consegui conectar. Tente de novo e aceite o acesso ao Drive.' : detail || 'Não consegui ligar agora. Tente de novo.')
    } catch (e) {
      backupEngine.disable(id)
      if (!(e instanceof DOMException && e.name === 'AbortError')) toast(e instanceof Error ? e.message : 'Não consegui ligar agora.')
    } finally {
      setBusy(null)
    }
  }

  async function backupNow(id: ProviderId) {
    setBusy(id)
    const status = await backupEngine.run(id)
    setBusy(null)
    toast(status === 'ok' ? 'Backup salvo ✓' : backupEngine.getState()[id].error || 'Não consegui salvar agora.')
  }

  async function disable(id: ProviderId) {
    const ok = await confirm({
      title: 'Desligar este backup?',
      text: id === 'drive' ? 'O painel para de salvar no Google Drive. Os backups que já estão lá continuam na sua conta.' : 'O painel para de salvar na pasta. Os arquivos que já estão lá continuam lá.',
      confirmLabel: 'Desligar',
      danger: true,
    })
    if (!ok) return
    if (id === 'drive') forgetToken(true)
    else await forgetFolder()
    backupEngine.disable(id)
  }

  async function share() {
    try {
      const snap = await makeSnapshot()
      if (await shareBackup(snap.json, snap.day)) toast('Cópia enviada. Guarde em um lugar seguro 💛')
    } catch {
      toast('Não consegui abrir o compartilhamento. Use “Baixar arquivo”.')
    }
  }

  async function onRestoreFile(file: File) {
    if (!(await confirm({ title: 'Restaurar backup?', text: 'Isso substitui TODOS os dados atuais pelos do arquivo.', confirmLabel: 'Restaurar', danger: true }))) return
    try {
      await restoreBackup(file)
      toast('Backup restaurado! 🎉')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível restaurar.')
    }
  }

  const manual = settings.lastBackupAt ? formatWhen(settings.lastBackupAt) : null

  return (
    <section className="card stack" id="backup">
      <h2>Cópia de segurança 💾</h2>

      <div className={`backup-status ${protectedNow ? 'ok' : anyEnabled ? 'warn' : 'off'}`}>
        <span className="dot" aria-hidden="true" />
        <div>
          {protectedNow ? (
            <><b>Seus dados estão protegidos.</b><div className="small">Último backup automático: {formatWhen(lastAuto)}.</div></>
          ) : anyEnabled ? (
            <><b>O backup automático precisa de atenção.</b><div className="small">Veja abaixo o que está pendente.</div></>
          ) : (
            <><b>Ainda sem backup automático.</b><div className="small">Seus dados ficam só neste aparelho. {manual ? `Último backup manual: ${manual}.` : 'Ligue um backup para não perder seus pães.'}</div></>
          )}
        </div>
      </div>

      {driveConfigured ? (
        <div className="provider">
          <div className="row spread wrap">
            <b>☁️ Google Drive</b>
            <StatusBadge p={state.drive} />
          </div>
          <p className="small muted">Salva sozinho uma cópia por dia (guarda os últimos 30 dias) numa pasta “Pães &amp; Afeto – Backups” do <i>seu</i> Drive. Só este app enxerga esses arquivos, e nós não temos acesso a eles.</p>
          {state.drive.enabled && state.drive.status === 'pending' && (
            <div className="notice"><span className="em">🔑</span><div className="small">O Google pediu para você entrar de novo (acontece de tempos em tempos). Toque em “Salvar agora”.</div></div>
          )}
          {state.drive.enabled && state.drive.status === 'error' && state.drive.error && <p className="small" style={{ color: 'var(--red-deep)' }}>{state.drive.error}</p>}
          {state.drive.enabled && state.drive.lastSuccessAt && <p className="small bold">Último backup: {formatWhen(state.drive.lastSuccessAt)}</p>}
          <div className="row wrap">
            {!state.drive.enabled ? (
              <button className="btn primary" disabled={busy === 'drive'} onClick={() => void enable('drive')}>{busy === 'drive' ? 'Conectando…' : 'Ligar backup no Google Drive'}</button>
            ) : (
              <>
                <button className="btn primary" disabled={busy === 'drive'} onClick={() => void backupNow('drive')}>{busy === 'drive' ? 'Salvando…' : 'Salvar agora'}</button>
                <button className="btn ghost" onClick={() => void disable('drive')}>Desligar</button>
              </>
            )}
            <button className="btn" onClick={() => setRestore(listDriveBackups())}>Restaurar do Drive</button>
          </div>
        </div>
      ) : (
        import.meta.env.DEV && <div className="notice"><span className="em">🛠️</span><div className="small">Google Drive desligado neste build. Defina <code>VITE_GOOGLE_CLIENT_ID</code> (veja <code>docs/BACKUP-GOOGLE-DRIVE.md</code>).</div></div>
      )}

      {folderSupported() && (
        <div className="provider">
          <div className="row spread wrap">
            <b>📁 Pasta do computador</b>
            <StatusBadge p={state.folder} />
          </div>
          <p className="small muted">Salva uma cópia por dia numa pasta que você escolher. <b>Dica:</b> se escolher uma pasta do “Google Drive para computador”, ela vai para o Drive sozinha.</p>
          {state.folder.enabled && <p className="small bold">Pasta: {state.folder.meta.folderName ?? '—'}{state.folder.lastSuccessAt ? ` · último backup ${formatWhen(state.folder.lastSuccessAt)}` : ''}</p>}
          {state.folder.enabled && state.folder.status === 'pending' && (
            <div className="notice"><span className="em">🔑</span><div className="small">O navegador pediu para liberar a pasta de novo. Toque em “Salvar agora” e permita.</div></div>
          )}
          <div className="row wrap">
            {!state.folder.enabled ? (
              <button className="btn" disabled={busy === 'folder'} onClick={() => void enable('folder')}>Escolher pasta</button>
            ) : (
              <>
                <button className="btn" disabled={busy === 'folder'} onClick={() => void backupNow('folder')}>Salvar agora</button>
                <button className="btn ghost" onClick={() => void disable('folder')}>Desligar</button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="provider">
        <b>🤲 Manual</b>
        <p className="small muted">Sempre funciona, em qualquer aparelho.{manual ? ` Último backup manual: ${manual}.` : ''}</p>
        <div className="row wrap">
          {canShare && <button className="btn" onClick={() => void share()}><Icon name="upload" /> Enviar cópia (Drive, WhatsApp…)</button>}
          <button className="btn" onClick={async () => { await downloadBackup(); toast('Backup baixado! Guarde em um lugar seguro 💛') }}><Icon name="download" /> Baixar arquivo</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="upload" /> Restaurar de um arquivo</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void onRestoreFile(f); e.target.value = '' }} />
        </div>
      </div>

      {restore && <DriveRestoreModal listing={restore} onClose={() => setRestore(null)} />}
    </section>
  )
}
