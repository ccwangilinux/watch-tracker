import type { WatchStatus } from '@/types/models'

export interface StatusMeta {
  key: WatchStatus
  label: string
  icon: string
  color: string
}

/** 顯示順序：從最常操作的排到最少動的 */
export const STATUS_LIST: StatusMeta[] = [
  { key: 'watching', label: '正在看', icon: '▶', color: 'var(--st-watching)' },
  { key: 'waiting',  label: '等更新', icon: '◷', color: 'var(--st-waiting)' },
  { key: 'planned',  label: '待看',   icon: '○', color: 'var(--st-planned)' },
]

export const STATUS_MAP: Record<WatchStatus, StatusMeta> = Object.fromEntries(
  STATUS_LIST.map((s) => [s.key, s]),
) as Record<WatchStatus, StatusMeta>

export const UNSET_LABEL = '未標記'

/**
 * 新紀錄與既有資料一律不預設狀態。
 * 從集數或觀看時間推斷看似方便，但猜錯的那些會被誤標，
 * 使用者反而要逐筆檢查——留空至少是誠實的「還沒標」。
 */
export function statusMeta(status: WatchStatus | null): StatusMeta | null {
  return status ? STATUS_MAP[status] : null
}
