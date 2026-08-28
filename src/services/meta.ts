import { db } from '@/db'

/**
 * key-value 表：UI 最後狀態與同步狀態（規格第 7 節）。
 * 存在 IndexedDB 而非 localStorage，理由是 iOS Safari 在儲存空間吃緊時
 * 會優先清掉 localStorage，而且這樣所有持久化資料只需管一個地方。
 */

export const META_KEYS = {
  lastCategoryId: 'lastCategoryId',
  lastSearchText: 'lastSearchText',
  lastSortKey: 'lastSortKey',
  lastSortDirection: 'lastSortDirection',
  lastStatusFilter: 'lastStatusFilter',
  lastViewMode: 'lastViewMode',
  sheetId: 'sheetId',
  lastSyncedAt: 'lastSyncedAt',
  autoSync: 'autoSync',
  seeded: 'seeded',
} as const

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const entry = await db.meta.get(key)
  return entry?.value as T | undefined
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}

export async function getAllMeta(): Promise<Record<string, unknown>> {
  const entries = await db.meta.toArray()
  return Object.fromEntries(entries.map((e) => [e.key, e.value]))
}
