import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Modal } from './Modal'

interface ToastItem { id: number; text: string; action?: { label: string; run: () => void } }
interface ConfirmOpts { title: string; text: string; confirmLabel?: string; danger?: boolean }

interface Ctx {
  toast: (text: string, action?: ToastItem['action'], ms?: number) => void
  confirm: (opts: ConfirmOpts) => Promise<boolean>
}

const FeedbackCtx = createContext<Ctx | null>(null)

export function useFeedback() {
  const c = useContext(FeedbackCtx)
  if (!c) throw new Error('FeedbackProvider ausente')
  return c
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)
  const nextId = useRef(1)

  const toast = useCallback<Ctx['toast']>((text, action, ms = 3800) => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, text, action }])
    if (!action || ms > 0) setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? Math.max(ms, 12000) : ms)
  }, [])

  const confirm = useCallback<Ctx['confirm']>((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), [])

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm])

  const close = (v: boolean) => {
    dialog?.resolve(v)
    setDialog(null)
  }

  return (
    <FeedbackCtx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <span>{t.text}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.run()
                  setToasts((x) => x.filter((y) => y.id !== t.id))
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
      {dialog && (
        <Modal
          small
          title={dialog.title}
          onClose={() => close(false)}
          footer={
            <>
              <button className="btn" onClick={() => close(false)}>Cancelar</button>
              <button className={`btn ${dialog.danger ? 'danger' : 'primary'}`} onClick={() => close(true)}>
                {dialog.confirmLabel ?? 'Confirmar'}
              </button>
            </>
          }
        >
          <p>{dialog.text}</p>
        </Modal>
      )}
    </FeedbackCtx.Provider>
  )
}
