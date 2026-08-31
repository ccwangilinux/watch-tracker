import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { getAllMeta, setMeta, META_KEYS } from '@/services/meta'
import { applyTheme, cachedTheme } from '@/services/theme'
import { isThemeKey, type ThemeKey } from '@/constants/themes'
import type { SortKey, SortDirection, WatchStatus } from '@/types/models'

/**
 * 規格第 7 節：除了觀看資料，UI 狀態也要能還原。
 * 每個欄位獨立 watch 後寫回 meta 表，避免任一欄位變動就整包重寫。
 */
export const useUiStore = defineStore('ui', () => {
  const lastCategoryId = ref<string | null>(null)
  const searchText = ref('')
  const sortKey = ref<SortKey>('updatedAt')
  const sortDirection = ref<SortDirection>('desc')
  /** null 代表不篩選；'unset' 代表只看尚未標記的 */
  const statusFilter = ref<WatchStatus | 'unset' | null>(null)
  /** 外觀主題。與雲端無關，不進同步——換裝置本來就該各自決定 */
  const theme = ref<ThemeKey>(cachedTheme())
  const restored = ref(false)

  async function restore() {
    if (restored.value) return
    const meta = await getAllMeta()

    lastCategoryId.value = (meta[META_KEYS.lastCategoryId] as string | null) ?? null
    searchText.value = (meta[META_KEYS.lastSearchText] as string) ?? ''
    sortKey.value = (meta[META_KEYS.lastSortKey] as SortKey) ?? 'updatedAt'
    sortDirection.value = (meta[META_KEYS.lastSortDirection] as SortDirection) ?? 'desc'
    statusFilter.value = (meta[META_KEYS.lastStatusFilter] as WatchStatus | 'unset' | null) ?? null

    // meta 表才是權威值；localStorage 的開機快取只負責在這之前先擋住閃爍
    const storedTheme = meta[META_KEYS.theme]
    theme.value = isThemeKey(storedTheme) ? storedTheme : cachedTheme()
    applyTheme(theme.value)

    restored.value = true

    // 還原完成後才開始持久化，否則會把預設值寫回去蓋掉尚未讀取的內容
    watch(lastCategoryId, (v) => setMeta(META_KEYS.lastCategoryId, v))
    watch(searchText, (v) => setMeta(META_KEYS.lastSearchText, v))
    watch(sortKey, (v) => setMeta(META_KEYS.lastSortKey, v))
    watch(sortDirection, (v) => setMeta(META_KEYS.lastSortDirection, v))
    watch(statusFilter, (v) => setMeta(META_KEYS.lastStatusFilter, v))
    watch(theme, (v) => {
      applyTheme(v)
      void setMeta(META_KEYS.theme, v)
    })
  }

  return {
    lastCategoryId, searchText, sortKey, sortDirection, statusFilter, theme, restored, restore,
  }
})
