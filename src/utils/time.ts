/** 觀看時間（總秒數）與顯示字串的轉換。上限 999:59:59 */
export const MAX_WATCH_SECONDS = 999 * 3600 + 59 * 60 + 59

export function toSeconds(hours: number, minutes: number, seconds: number): number {
  return Math.min(hours * 3600 + minutes * 60 + seconds, MAX_WATCH_SECONDS)
}

export function splitSeconds(total: number): { hours: number; minutes: number; seconds: number } {
  const t = Math.max(0, Math.min(Math.floor(total), MAX_WATCH_SECONDS))
  return { hours: Math.floor(t / 3600), minutes: Math.floor((t % 3600) / 60), seconds: t % 60 }
}

/** 6:15:33 — 時不補零，分秒補零（規格第 13 節的顯示範例） */
export function formatWatchTime(total: number): string {
  const { hours, minutes, seconds } = splitSeconds(total)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${hours}:${pad(minutes)}:${pad(seconds)}`
}

/** 現在時刻的 ISO 8601 UTC 字串 */
export function now(): string {
  return new Date().toISOString()
}
