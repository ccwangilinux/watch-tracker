import type { TokenClient, TokenResponse } from '@/types/google'

/**
 * Google 認證（Google Identity Services，token model）。
 *
 * 安全設計（規格第 4 節）：
 *   - 只有 Client ID 進入前端，Client Secret 從頭到尾不存在於此專案
 *   - access token 只存在記憶體，絕不寫入 IndexedDB 或 localStorage
 *   - 使用者密碼永遠由 Google 自己的頁面處理，本 App 碰不到
 *
 * 用 token model 而非 redirect flow：redirect 會離開 App 再導回，
 * 在 iOS standalone PWA 下有機率跳出 App 開 Safari 而回不到原情境。
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client'

/** 最小權限：只能存取本 App 建立的檔案，看不到雲端硬碟其他內容 */
export const SCOPE = 'https://www.googleapis.com/auth/drive.file'

export const CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export function isConfigured(): boolean {
  return CLIENT_ID.trim() !== ''
}

let scriptPromise: Promise<void> | null = null

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('無法載入 Google 登入元件，請確認網路連線'))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

/** 只存在記憶體：重新整理頁面就消失，這是刻意的 */
let accessToken: string | null = null
let expiresAt = 0
let tokenClient: TokenClient | null = null

export function getCachedToken(): string | null {
  // 提早 60 秒視為過期，避免請求送出途中剛好失效
  return accessToken && Date.now() < expiresAt - 60_000 ? accessToken : null
}

export function hasToken(): boolean {
  return getCachedToken() !== null
}

/**
 * 取得 access token。
 *
 * interactive=false 會嘗試靜默續發（prompt: ''），適合背景同步；
 * 使用者主動點「連結 Google」時才用 interactive=true open 同意畫面。
 *
 * 注意：必須在使用者點擊的事件中同步呼叫，否則 popup 會被 iOS Safari 攔截。
 */
export async function requestToken(interactive: boolean): Promise<string> {
  if (!isConfigured()) {
    throw new Error('尚未設定 Google Client ID')
  }

  const cached = getCachedToken()
  if (cached) return cached

  await loadGis()

  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) throw new Error('Google 登入元件載入失敗')

  return new Promise<string>((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (response: TokenResponse) => {
          if (response.error || !response.access_token) {
            pendingReject?.(new Error(response.error_description ?? response.error ?? '授權失敗'))
          } else {
            accessToken = response.access_token
            expiresAt = Date.now() + (response.expires_in ?? 3600) * 1000
            pendingResolve?.(response.access_token)
          }
          pendingResolve = null
          pendingReject = null
        },
        error_callback: (error) => {
          pendingReject?.(new Error(error.message ?? '授權視窗被關閉或遭攔截'))
          pendingResolve = null
          pendingReject = null
        },
      })
    }

    pendingResolve = resolve
    pendingReject = reject
    tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' })
  })
}

let pendingResolve: ((token: string) => void) | null = null
let pendingReject: ((error: Error) => void) | null = null

/** 解除綁定：撤銷 token 並清空記憶體 */
export async function revoke(): Promise<void> {
  const token = accessToken
  accessToken = null
  expiresAt = 0

  if (!token) return

  await loadGis().catch(() => undefined)
  await new Promise<void>((resolve) => {
    const oauth2 = window.google?.accounts?.oauth2
    if (!oauth2) return resolve()
    oauth2.revoke(token, () => resolve())
    // 撤銷失敗也不該卡住 UI，本機端的 token 已經清掉了
    setTimeout(resolve, 3000)
  })
}

export function clearToken(): void {
  accessToken = null
  expiresAt = 0
}
