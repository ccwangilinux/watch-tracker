const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/** 1 → 第一季、14 → 第十四季、99 → 第九十九季 */
export function formatSeason(n: number): string {
  return `第${toChineseNumber(n)}季`
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

export const SEASON_MIN = 1
export const SEASON_MAX = 99
