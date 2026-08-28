import Dexie, { type EntityTable } from 'dexie'
import type { Category, WatchRecord, MetaEntry } from '@/types/models'

/**
 * IndexedDB（Dexie）。
 *
 * 索引設計上的兩個 IndexedDB 限制，實作時必須繞開：
 *
 * 1. null 不能當索引 key。`deletedAt` 為 null（未刪除）的紀錄不會出現在
 *    deletedAt 索引裡，所以「查未刪除」不能用 where('deletedAt').equals(null)，
 *    一律改用 filter。deletedAt 索引只用於反向查詢「已刪除待清理」的資料。
 *
 * 2. boolean 不能當索引 key，因此 `completed` 不建索引，以 filter 處理。
 *
 * `title` 也刻意不建索引：IndexedDB 索引只能前綴比對，
 * 而規格要的是子字串搜尋（「進擊」要配到「進擊的巨人」），索引幫不上忙。
 * 個人資料量級（數百至數千筆）在記憶體裡 filter 完全足夠。
 */
export class WatchTrackerDB extends Dexie {
  categories!: EntityTable<Category, 'id'>
  watchRecords!: EntityTable<WatchRecord, 'id'>
  meta!: EntityTable<MetaEntry, 'key'>

  constructor() {
    super('watch-tracker')

    this.version(1).stores({
      categories: 'id, sortOrder, updatedAt, deletedAt',
      watchRecords: 'id, categoryId, updatedAt, deletedAt, [categoryId+sortOrder]',
      meta: 'key',
    })

    /**
     * v2：新增觀看狀態。
     *
     * 既有資料的狀態一律留 null，不做任何推斷。
     * 從集數或觀看時間猜測看似方便，但猜錯的部分使用者還是得
     * 逐筆檢查，留空至少是誠實的「還沒標」。
     * completed 是另一個獨立維度，不受這次遷移影響。
     *
     * status 不建索引：值域只有四種，索引的選擇性太差，
     * 而且 null 本來就無法建立 IndexedDB 索引。
     */
    this.version(2).stores({
      categories: 'id, sortOrder, updatedAt, deletedAt',
      watchRecords: 'id, categoryId, updatedAt, deletedAt, [categoryId+sortOrder]',
      meta: 'key',
    }).upgrade(async (tx) => {
      await tx.table('watchRecords').toCollection().modify((record) => {
        record.status = null
      })
    })
  }
}

export const db = new WatchTrackerDB()
