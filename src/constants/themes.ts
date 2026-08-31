/**
 * 可選主題清單。
 *
 * 這裡刻意「不放任何色碼」——色票全部只存在 themes.css。
 * 設定頁的預覽是把 data-theme 掛在預覽元素上，直接讀同一份 CSS 變數；
 * 開機要用的底色則在套用當下從 getComputedStyle 讀回來。
 * 只要有第二份色碼，改了 CSS 忘記改 TS 就會兩邊對不上。
 */

export type ColorScheme = 'dark' | 'light'

export type ThemeKey =
  | 'midnight' | 'ocean' | 'ember' | 'noir'
  | 'daylight' | 'paper' | 'mint' | 'sakura'

export interface Theme {
  key: ThemeKey
  label: string
  /** 設定頁列在名稱下方的一句話 */
  hint: string
  scheme: ColorScheme
}

export const THEMES: Theme[] = [
  { key: 'midnight', label: '午夜紫', hint: '預設主題，紫藍配粉紫', scheme: 'dark' },
  { key: 'ocean',    label: '深海青', hint: '冷色調，青綠漸層',     scheme: 'dark' },
  { key: 'ember',    label: '暗夜琥珀', hint: '暖色調，橙金漸層',   scheme: 'dark' },
  { key: 'noir',     label: '純黑',   hint: 'OLED 全黑底，最省電',  scheme: 'dark' },
  { key: 'daylight', label: '晨光白', hint: '中性冷白，對比最高',   scheme: 'light' },
  { key: 'paper',    label: '米紙',   hint: '暖米色，長時間閱讀',   scheme: 'light' },
  { key: 'mint',     label: '薄荷',   hint: '淡綠底，清爽',         scheme: 'light' },
  { key: 'sakura',   label: '櫻粉',   hint: '淡粉底，柔和',         scheme: 'light' },
]

export const DEFAULT_THEME: ThemeKey = 'midnight'

const KEYS = new Set<string>(THEMES.map((t) => t.key))

export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === 'string' && KEYS.has(value)
}

export function themeOf(key: ThemeKey): Theme {
  return THEMES.find((t) => t.key === key) ?? THEMES[0]!
}

/** 設定頁分成兩區顯示，深色在前 */
export const DARK_THEMES = THEMES.filter((t) => t.scheme === 'dark')
export const LIGHT_THEMES = THEMES.filter((t) => t.scheme === 'light')
