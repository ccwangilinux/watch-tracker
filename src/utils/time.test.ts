import { describe, it, expect } from 'vitest'
import { toSeconds, splitSeconds, formatWatchTime, MAX_WATCH_SECONDS } from './time'
import { formatSeason, toChineseNumber, hasSeason, SEASON_UNSET } from './season'

describe('觀看時間', () => {
  it('時分秒與總秒數可互轉', () => {
    const total = toSeconds(6, 15, 33)
    expect(total).toBe(6 * 3600 + 15 * 60 + 33)
    expect(splitSeconds(total)).toEqual({ hours: 6, minutes: 15, seconds: 33 })
  })

  it('顯示為 6:15:33 — 時不補零、分秒補零', () => {
    expect(formatWatchTime(toSeconds(6, 15, 33))).toBe('6:15:33')
    expect(formatWatchTime(toSeconds(0, 5, 3))).toBe('0:05:03')
  })

  it('超過 999:59:59 會被夾住', () => {
    expect(toSeconds(9999, 0, 0)).toBe(MAX_WATCH_SECONDS)
    expect(formatWatchTime(MAX_WATCH_SECONDS)).toBe('999:59:59')
  })

  it('負值與小數不會產生異常輸出', () => {
    expect(formatWatchTime(-100)).toBe('0:00:00')
    expect(formatWatchTime(90.7)).toBe('0:01:30')
  })
})

describe('季數中文顯示', () => {
  it('1–99 都能轉成中文', () => {
    expect(formatSeason(1)).toBe('第一季')
    expect(formatSeason(10)).toBe('第十季')
    expect(formatSeason(14)).toBe('第十四季')
    expect(formatSeason(20)).toBe('第二十季')
    expect(formatSeason(99)).toBe('第九十九季')
  })

  it('0 是未設定，不是第零季', () => {
    expect(formatSeason(SEASON_UNSET)).toBe('未設定')
    expect(hasSeason(SEASON_UNSET)).toBe(false)
    expect(hasSeason(1)).toBe(true)
  })

  it('整十不會多出尾數', () => {
    expect(toChineseNumber(30)).toBe('三十')
    expect(toChineseNumber(90)).toBe('九十')
  })
})
