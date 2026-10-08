import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Modal } from './Modal'

interface ToastItem { id: number; text: string; action?: { label: string; run: () => void } }
interface ConfirmOpts { title: string; text: string; confirmLabel?: string; danger?: boolean }

interface Ctx {
  toast: (text: string, action?: ToastItem['action'], ms?: number) => void
  confirm: (opts: ConfirmOpts) => Promise<boolean>
  /** Chuva de pãezinhos para comemorar 🎉 */
  celebrate: () => void
}

const CONFETTI = ['🍞', '🥖', '🥐', '✨', '💛', '🥯']

const FeedbackCtx = createContext<Ctx | null>(null)

export function useFeedback() {
  const c = useContext(FeedbackCtx)
  if (!c) throw new Error('FeedbackProvider ausente')
  return c
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)
  const [burst, setBurst] = useState<number | null>(null)
  const nextId = useRef(1)

  const toast = useCallback<Ctx['toast']>((text, action, ms = 3800) => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, text, action }])
    if (!action || ms > 0) setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? Math.max(ms, 12000) : ms)
  }, [])

  const confirm = useCallback<Ctx['confirm']>((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), [])

  const celebrate = useCallback(() => {
    const id = Date.now()
    setBurst(id)
    setTimeout(() => setBurst((b) => (b === id ? null : b)), 4600)
  }, [])

  const value = useMemo(() => ({ toast, confirm, celebrate }), [toast, confirm, celebrate])

  const close = (v: boolean) => {
    dialog?.resolve(v)
    setDialog(null)
  }

  return (
    <FeedbackCtx.Provider value={value}>
      {children}
      {burst != null && (
        <div className="confetti" aria-hidden="true" key={burst}>
          {Array.from({ length: 34 }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${(i * 29) % 100}%`,
                animationDelay: `${((i * 37) % 14) / 10}s`,
                animationDuration: `${2.6 + ((i * 13) % 12) / 10}s`,
                fontSize: `${1.3 + ((i * 7) % 10) / 10}rem`,
              }}
            >
              {CONFETTI[i % CONFETTI.length]}
            </span>
          ))}
        </div>
      )}
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
