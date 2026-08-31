const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/**
 * 0 代表「沒有填季數」。
 *
 * 用 0 而不是 null：season 要寫進 Google Sheets，空白儲存格讀回來是空字串，
 * 轉數字後本來就會落成 0；把「未設定」直接定義成 0，序列化兩端不需要額外分支。
 */
export const SEASON_UNSET = 0
export const SEASON_MIN = 1
export const SEASON_MAX = 99
export const SEASON_UNSET_LABEL = '未設定'

export function hasSeason(n: number): boolean {
  return n >= SEASON_MIN
}

/** 0 → 未設定、1 → 第一季、14 → 第十四季、99 → 第九十九季 */
export function formatSeason(n: number): string {
  return hasSeason(n) ? `第${toChineseNumber(n)}季` : SEASON_UNSET_LABEL
}

export function toChineseNumber(n: number): string {
  if (n < 1) return DIGITS[0]!
  if (n < 10) return DIGITS[n]!
  if (n === 10) return '十'
  if (n < 20) return `十${DIGITS[n - 10]!}`
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return ones === 0 ? `${DIGITS[tens]!}十` : `${DIGITS[tens]!}十${DIGITS[ones]!}`
}
