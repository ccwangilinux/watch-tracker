/** Google Identity Services 的最小型別宣告（只涵蓋本專案用到的部分） */
export interface TokenResponse {
  access_token?: string
  expires_in?: number
  scope?: string
  error?: string
  error_description?: string
}

export interface TokenClient {
  requestAccessToken(overrides?: { prompt?: '' | 'none' | 'consent' | 'select_account' }): void
}

export interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (response: TokenResponse) => void
  error_callback?: (error: { type?: string; message?: string }) => void
  prompt?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: TokenClientConfig): TokenClient
          revoke(token: string, done?: () => void): void
        }
      }
    }
  }
}
