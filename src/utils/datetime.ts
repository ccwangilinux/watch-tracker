/** 把 ISO 8601 字串轉成本地時區的易讀時間 */
export function formatDateTime(iso: string | null): string {
  if (!iso) return '尚未同步'

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date)
}

/** 只要日期，不含時間 */
export function formatDate(iso: string | null): string {
  if (!iso) return '—'

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date)
}

/** 相對時間：剛剛 / 5 分鐘前 / 3 小時前 / 2 天前 */
export function formatRelative(iso: string | null): string {
  if (!iso) return '尚未同步'

  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return '—'
  if (diff < 60_000) return '剛剛'

  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes} 分鐘前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小時前`

  const days = Math.floor(hours / 24)
  return days < 30 ? `${days} 天前` : formatDateTime(iso)
}
