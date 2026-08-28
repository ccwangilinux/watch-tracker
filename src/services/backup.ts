import { db } from '@/db'
import { now } from '@/utils/time'
import type { Category, WatchRecord } from '@/types/models'

/**
 * JSON 匯出 / 匯入（規格第 19 節）。
 *
 * 這是最後的保險：即使 Google API 不可用、或未來這個 App 不再維護，
 * 使用者仍能完整帶走自己的資料，所以格式刻意保持直白、無壓縮、無加密。
 */

export const BACKUP_VERSION = 1

export interface BackupFile {
  app: 'watch-tracker'
  version: number
  exportedAt: string
  categories: Category[]
  records: WatchRecord[]
}

export async function exportJson(): Promise<BackupFile> {
  const [categories, records] = await Promise.all([
    db.categories.toArray(),
    db.watchRecords.toArray(),
  ])

  // 含已軟刪除的資料：否則把備份還原到另一台裝置後，
  // 已刪除的項目會因為「本機沒有」而從雲端被拉回來復活
  return {
    app: 'watch-tracker',
    version: BACKUP_VERSION,
    exportedAt: now(),
    categories,
    records,
  }
}

export function downloadJson(backup: BackupFile): void {
  const stamp = backup.exportedAt.slice(0, 10)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `watch-tracker-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()

  // 立刻釋放會讓部分瀏覽器來不及開始下載
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export class InvalidBackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidBackupError'
  }
}

export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new InvalidBackupError('檔案不是有效的 JSON')
  }

  if (typeof data !== 'object' || data === null) {
    throw new InvalidBackupError('檔案內容格式不正確')
  }

  const backup = data as Partial<BackupFile>

  if (backup.app !== 'watch-tracker') {
    throw new InvalidBackupError('這不是「我的觀看紀錄」的備份檔')
  }
  if (!Array.isArray(backup.categories) || !Array.isArray(backup.records)) {
    throw new InvalidBackupError('備份檔缺少必要的資料欄位')
  }
  if (typeof backup.version !== 'number' || backup.version > BACKUP_VERSION) {
    throw new InvalidBackupError('備份檔來自較新的版本，請先更新 App')
  }

  return backup as BackupFile
}

export type ImportMode = 'merge' | 'replace'

export interface ImportResult {
  categories: number
  records: number
}

/**
 * merge  — 以 id 為準覆寫同 id 的資料，保留本機獨有的項目
 * replace— 清空後完全還原成備份的內容
 */
export async function importBackup(
  backup: BackupFile,
  mode: ImportMode,
): Promise<ImportResult> {
  await db.transaction('rw', db.categories, db.watchRecords, async () => {
    if (mode === 'replace') {
      await db.categories.clear()
      await db.watchRecords.clear()
    }
    await db.categories.bulkPut(backup.categories)
    await db.watchRecords.bulkPut(backup.records)
  })

  return { categories: backup.categories.length, records: backup.records.length }
}
