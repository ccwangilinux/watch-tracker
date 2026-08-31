import { DEFAULT_THEME, isThemeKey, themeOf, type ThemeKey } from '@/constants/themes'

/**
 * 主題的套用與開機快取。純 DOM 操作，不 import 任何 Vue/Pinia。
 *
 * 權威值存在 IndexedDB 的 meta 表（與其他 UI 狀態一致），
 * 但 IndexedDB 是非同步的，等它讀完再套用會先閃一下預設的深藍底——
 * 從主畫面啟動的 PWA 每次都會閃。所以額外在 localStorage 留一份開機快取，
 * 由 index.html 的內聯腳本在 Vue 掛載前就先塗好底色。
 *
 * localStorage 在 iOS 儲存空間吃緊時會被清掉，但那只會退回預設主題再被 meta 修正，
 * 不影響資料，這是這裡唯一容許用 localStorage 的理由。
 */

/** index.html 的內聯腳本讀的是同一個 key，兩邊要一起改 */
export const BOOT_CACHE_KEY = 'wt.boot'

interface BootCache {
  theme: ThemeKey
  scheme: string
  /** --bg 與 --text 的實際色碼，從 CSS 讀回來而不是另外維護一份 */
  bg: string
  fg: string
}

function setMetaContent(name: string, content: string): void {
  const tag = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (tag) tag.content = content
}

export function applyTheme(key: ThemeKey): void {
  const theme = themeOf(isThemeKey(key) ? key : DEFAULT_THEME)
  const root = document.documentElement

  root.dataset.theme = theme.key
  root.dataset.scheme = theme.scheme

  // 讀 getComputedStyle 會強制樣式重算，上面兩行的結果此時已經生效
  const style = getComputedStyle(root)
  const bg = style.getPropertyValue('--bg').trim()
  const fg = style.getPropertyValue('--text').trim()
  if (!bg || !fg) return // 樣式表還沒到（理論上不會），不要寫入殘缺的快取

  // iOS standalone 的狀態列吃這個值，不跟著換的話頂端會留一條異色
  setMetaContent('theme-color', bg)
  setMetaContent('color-scheme', theme.scheme)

  /*
   * index.html 那段內聯底色若排在 base.css 之前就會被蓋掉、排在之後就會蓋掉 base.css，
   * 打包後的順序不該由這裡去賭——直接把它改寫成當前主題的顏色，兩種順序都正確。
   */
  const bootPaint = document.getElementById('boot-paint')
  if (bootPaint) bootPaint.textContent = `html,body{margin:0;background:${bg};color:${fg}}`

  const cache: BootCache = { theme: theme.key, scheme: theme.scheme, bg, fg }
  try {
    localStorage.setItem(BOOT_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // 無痕模式或配額用盡；只是失去防閃爍，不該讓它中斷切換
  }
}

/** 開機快取裡的主題，供 meta 表尚未讀出前使用 */
export function cachedTheme(): ThemeKey {
  try {
    const raw = localStorage.getItem(BOOT_CACHE_KEY)
    if (!raw) return DEFAULT_THEME
    const parsed = JSON.parse(raw) as Partial<BootCache>
    return isThemeKey(parsed.theme) ? parsed.theme : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}
