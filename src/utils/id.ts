/**
 * UUID v4。
 * crypto.randomUUID 需要安全來源（https 或 localhost），Safari 15.4+ 起支援；
 * 標成 Partial<Crypto> 是為了讓退路分支不被 TS 收窄成 never。
 */
export function uuid(): string {
  const c = globalThis.crypto as Partial<Crypto> | undefined

  if (typeof c?.randomUUID === 'function') {
    return c.randomUUID()
  }

  if (typeof c?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    c.getRandomValues(bytes)
    bytes[6] = (bytes[6]! & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8]! & 0x3f) | 0x80 // variant 10
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  throw new Error('此環境不支援 Web Crypto，無法產生 UUID')
}
