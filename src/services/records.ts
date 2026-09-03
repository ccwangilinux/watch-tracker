import { db } from '@/db'
import { uuid } from '@/utils/id'
import { now } from '@/utils/time'
import type { WatchRecord, SortKey, SortDirection, WatchStatus } from '@/types/models'
import { STATUS_LIST } from '@/constants/status'

/** 紀錄資料存取。純資料層，不 import 任何 Vue/Pinia。 */

export async function listByCategory(categoryId: string): Promise<WatchRecord[]> {
  const rows = await db.watchRecords.where('categoryId').equals(categoryId).toArray()
  return rows.filter((r) => r.deletedAt === null)
}

/** 跨類別搜尋，供 Header 搜尋框使用 */
export async function searchAll(keyword: string): Promise<WatchRecord[]> {
  const trimmed = keyword.trim().toLowerCase()
  if (!trimmed) return []

  const rows = await db.watchRecords.toArray()
  return rows.filter(
    (r) => r.deletedAt === null && r.title.toLowerCase().includes(trimmed),
  )
}

export async function getRecord(id: string): Promise<WatchRecord | undefined> {
  const found = await db.watchRecords.get(id)
  return found?.deletedAt === null ? found : undefined
}

export interface RecordInput {
  categoryId: string
  title: string
  season: number
  episode: number
  watchTime: number
  /** null 代表尚未標記 */
  status: WatchStatus | null
  completed: boolean
  note: string
}

export async function createRecord(input: RecordInput): Promise<WatchRecord> {
  const siblings = await listByCategory(input.categoryId)
  const maxOrder = siblings.reduce((max, r) => Math.max(max, r.sortOrder), -1)
  const timestamp = now()

  const record: WatchRecord = {
    id: uuid(),
    ...input,
    sortOrder: maxOrder + 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  }

  await db.watchRecords.add(record)
  return record
}

/**
 * 更新紀錄。回傳這次是否換了類別，讓上層知道要不要一併更新別的類別的計數。
 */
export async function updateRecord(
  id: string,
  patch: Partial<RecordInput>,
): Promise<boolean> {
  const changes: Partial<WatchRecord> = { ...patch, updatedAt: now() }

  const target = patch.categoryId
  let moved = false

  /*
   * 換類別時 sortOrder 要在新類別裡重算。
   * 沿用舊類別的值會與新類別既有紀錄撞號，自訂排序看起來就像插在隨機位置。
   */
  if (target) {
    const current = await db.watchRecords.get(id)
    moved = current !== undefined && current.categoryId !== target

    if (moved) {
      const siblings = await listByCategory(target)
      changes.sortOrder = siblings.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1
    }
  }

  await db.watchRecords.update(id, changes)
  return moved
}

export async function deleteRecord(id: string): Promise<void> {
  const timestamp = now()
  await db.watchRecords.update(id, { deletedAt: timestamp, updatedAt: timestamp })
}

export async function reorderRecords(orderedIds: string[]): Promise<void> {
  const timestamp = now()
  await db.watchRecords.bulkUpdate(
    orderedIds.map((id, index) => ({
      key: id,
      changes: { sortOrder: index, updatedAt: timestamp },
    })),
  )
}

/**
 * 排序（規格第 15 節）。純函式，方便測試。
 *
 * 片名用 localeCompare('zh-Hant') 而非字串大小比較：
 * 中文字的 UTF-16 碼位順序與筆劃、注音都無關，直接比會得到看似隨機的結果。
 */
export function sortRecords(
  records: WatchRecord[],
  key: SortKey,
  direction: SortDirection,
): WatchRecord[] {
  const factor = direction === 'asc' ? 1 : -1

  return [...records].sort((a, b) => {
    let result: number

    switch (key) {
      case 'title':
        result = a.title.localeCompare(b.title, 'zh-Hant')
        break
      case 'season':
        // 同一部劇的季數相同時再比集數，否則同劇的多季排列會亂跳
        result = a.season - b.season || a.episode - b.episode
        break
      case 'episode':
        result = a.episode - b.episode
        break
      case 'watchTime':
        result = a.watchTime - b.watchTime
        break
      case 'status':
        // 依 STATUS_LIST 的順序排；未標記的排在最後
        result = statusRank(a.status) - statusRank(b.status)
        break
      case 'custom':
        result = a.sortOrder - b.sortOrder
        break
      case 'createdAt':
        result = a.createdAt.localeCompare(b.createdAt)
        break
      case 'updatedAt':
      default:
        result = a.updatedAt.localeCompare(b.updatedAt)
        break
    }

    // 排序值相同時以片名穩定收尾，避免每次重繪順序不同
    return result !== 0 ? result * factor : a.title.localeCompare(b.title, 'zh-Hant')
  })
}

function statusRank(status: WatchStatus | null): number {
  if (!status) return STATUS_LIST.length
  return STATUS_LIST.findIndex((s) => s.key === status)
}

/** 各狀態的紀錄數，供首頁快速入口顯示 */
export async function countByStatus(): Promise<Record<string, number>> {
  const rows = await db.watchRecords.toArray()
  const counts: Record<string, number> = { unset: 0 }

  for (const record of rows) {
    if (record.deletedAt !== null) continue
    const key = record.status ?? 'unset'
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

/** 跨類別列出某個狀態的紀錄；status 為 null 時列出尚未標記的 */
export async function listByStatus(status: WatchStatus | null): Promise<WatchRecord[]> {
  const rows = await db.watchRecords.toArray()
  return rows.filter((r) => r.deletedAt === null && (r.status ?? null) === status)
}

export const SORT_OPTIONS: { key: SortKey; label: string; defaultDirection: SortDirection }[] = [
  { key: 'updatedAt', label: '最後修改時間', defaultDirection: 'desc' },
  { key: 'status', label: '觀看狀態', defaultDirection: 'asc' },
  { key: 'title', label: '片名', defaultDirection: 'asc' },
  { key: 'season', label: '季數', defaultDirection: 'asc' },
  { key: 'episode', label: '集數', defaultDirection: 'desc' },
  { key: 'watchTime', label: '觀看時間', defaultDirection: 'desc' },
  { key: 'createdAt', label: '建立時間', defaultDirection: 'desc' },
  { key: 'custom', label: '自訂排序', defaultDirection: 'asc' },
]
