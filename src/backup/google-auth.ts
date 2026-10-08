import { NeedsInteraction, OfflineError } from './types'

/** ID público do app no Google Cloud (definido no build: VITE_GOOGLE_CLIENT_ID). */
export const GOOGLE_CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined
export const driveConfigured = Boolean(GOOGLE_CLIENT_ID)

/** Só enxerga arquivos criados pelo próprio app. */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

interface TokenResponse {
  access_token?: string
  expires_in?: number | string
  scope?: string
  error?: string
  error_description?: string
}
interface TokenError {
  type?: string
  message?: string
}
interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void
}
interface GoogleOAuth {
  accounts: {
    oauth2: {
      initTokenClient(cfg: {
        client_id: string
        scope: string
        callback: (r: TokenResponse) => void
        error_callback?: (e: TokenError) => void
      }): TokenClient
      revoke(token: string, done?: () => void): void
    }
  }
}
declare global {
  interface Window {
    google?: GoogleOAuth
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'
let loading: Promise<void> | null = null

export function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = GIS_SRC
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => {
        loading = null
        s.remove()
        reject(new OfflineError('Não consegui falar com o Google'))
      }
      document.head.appendChild(s)
    })
  }
  return loading
}

let token: { value: string; expiresAt: number } | null = null
let inflight: Promise<string> | null = null

export const hasValidToken = () => token != null && token.expiresAt - 60_000 > Date.now()

export type TokenMode = 'silent' | 'interactive' | 'first'

/**
 * Pega um token de acesso do Google (dura ~1 hora; o navegador não guarda refresh token).
 * - silent: tenta sem janela nenhuma; se o Google exigir interação, lança NeedsInteraction.
 * - interactive: pode abrir a janela do Google (só funciona logo após um toque dela).
 * - first: primeira conexão, deixa escolher a conta.
 */
export async function requestToken(mode: TokenMode): Promise<string> {
  if (hasValidToken()) return token!.value
  if (!GOOGLE_CLIENT_ID) throw new Error('Google Drive não está configurado neste endereço')
  if (inflight) return inflight
  // A janela do Google precisa abrir no mesmo instante do toque: só carrega o script antes, se ainda não estiver pronto.
  if (!window.google?.accounts?.oauth2) {
    if (!navigator.onLine) throw new OfflineError()
    await loadGis()
  }

  inflight = new Promise<string>((resolve, reject) => {
    const timer =
      mode === 'silent' ? setTimeout(() => reject(new NeedsInteraction()), 12_000) : undefined
    const done = () => clearTimeout(timer)
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID!,
      scope: DRIVE_SCOPE,
      callback: (r) => {
        done()
        if (r.error || !r.access_token) return reject(r.error === 'access_denied' ? new NeedsInteraction('Permissão negada') : new NeedsInteraction(r.error_description))
        if (r.scope && !r.scope.split(' ').includes(DRIVE_SCOPE)) return reject(new Error('Faltou aceitar a permissão do Google Drive'))
        token = { value: r.access_token, expiresAt: Date.now() + Number(r.expires_in ?? 3600) * 1000 }
        resolve(r.access_token)
      },
      error_callback: (e) => {
        done()
        reject(new NeedsInteraction(e.type === 'popup_failed_to_open' || e.type === 'popup_closed' ? undefined : e.message))
      },
    })
    client.requestAccessToken({ prompt: mode === 'silent' ? 'none' : mode === 'first' ? 'select_account' : '' })
  }).finally(() => {
    inflight = null
  })
  return inflight
}

export function forgetToken(revoke = false) {
  if (revoke && token) window.google?.accounts.oauth2.revoke(token.value)
  token = null
}
