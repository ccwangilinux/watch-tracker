/**
 * 首次啟動時寫入 IndexedDB 的預設類別（規格第 8 節）。
 * 使用者可自由增刪改排，這裡只是起始範例。
 */
export interface DefaultCategory {
  name: string
  icon: string
  color: string
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: '韓劇', icon: '🇰🇷', color: '#ff4fa3' },
  { name: '日劇', icon: '🇯🇵', color: '#7c5cff' },
  { name: '日動', icon: '🎌', color: '#4f9dff' },
  { name: '國動', icon: '🐉', color: '#2dd4a7' },
  { name: '日漫', icon: '📖', color: '#ffb020' },
  { name: '國漫', icon: '📚', color: '#ff8a4f' },
  { name: '歐美劇', icon: '🎭', color: '#a78bfa' },
  { name: '電影', icon: '🎬', color: '#f472b6' },
  { name: '綜藝', icon: '🎤', color: '#22d3ee' },
  { name: '其他', icon: '✨', color: '#94a3b8' },
]
