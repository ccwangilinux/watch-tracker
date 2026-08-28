import { db } from '@/db'
import { now } from '@/utils/time'
import { setMeta, META_KEYS } from '../meta'
import { readSheet, writeSheet, CATEGORY_SHEET, RECORD_SHEET } from '../google/sheets'
import { mergeById, selectPurgeable, type MergePlan } from './merge'
import {
  CATEGORY_HEADERS, RECORD_HEADERS,
  categoryToRow, rowToCategory, recordToRow, rowToRecord, parseSheet,
} from './serialize'
import type { Category, WatchRecord, Syncable } from '@/types/models'

export interface SyncResult {
  categories: { pulled: number; pushed: number; ambiguous: number }
  records: { pulled: number; pushed: number; ambiguous: number }
  /** 無法判定版本的紀錄，供 UI 說明是哪幾筆、差在哪個欄位 */
  conflicts: { title: string; fields: string[] }[]
  purged: number
  syncedAt: string
}

/**
 * 執行一次完整同步。
 *
 * 流程刻意是「合併後把完整結果寫回雲端」，而不是只推送有變動的列：
 * Sheets 的逐列更新需要處理列號位移，一旦算錯就會寫錯行；
 * 個人資料量級（數百至數千筆）整表覆寫的成本可以接受，而且結果必定一致。
 */
export async function runSync(spreadsheetId: string): Promise<SyncResult> {
  const [remoteCategoryValues, remoteRecordValues] = await Promise.all([
    readSheet(spreadsheetId, CATEGORY_SHEET),
    readSheet(spreadsheetId, RECORD_SHEET),
  ])

  const remoteCategories = parseSheet(remoteCategoryValues, rowToCategory)
  const remoteRecords = parseSheet(remoteRecordValues, rowToRecord)

  // 含已軟刪除的資料：刪除標記本身就是需要同步的內容
  const localCategories = await db.categories.toArray()
  const localRecords = await db.watchRecords.toArray()

  const categoryPlan = mergeById(localCategories, remoteCategories)
  const recordPlan = mergeById(localRecords, remoteRecords)

  await db.transaction('rw', db.categories, db.watchRecords, async () => {
    if (categoryPlan.toLocal.length) await db.categories.bulkPut(categoryPlan.toLocal)
    if (recordPlan.toLocal.length) await db.watchRecords.bulkPut(recordPlan.toLocal)
  })

  const timestamp = now()

  const finalCategories = await purge(
    await db.categories.toArray(),
    timestamp,
    (ids) => db.categories.bulkDelete(ids),
  )
  const finalRecords = await purge(
    await db.watchRecords.toArray(),
    timestamp,
    (ids) => db.watchRecords.bulkDelete(ids),
  )

  await writeSheet(spreadsheetId, CATEGORY_SHEET, [
    [...CATEGORY_HEADERS],
    ...finalCategories.map(categoryToRow),
  ])
  await writeSheet(spreadsheetId, RECORD_SHEET, [
    [...RECORD_HEADERS],
    ...finalRecords.map(recordToRow),
  ])

  await setMeta(META_KEYS.lastSyncedAt, timestamp)

  return {
    categories: summarize(categoryPlan),
    records: summarize(recordPlan),
    conflicts: [
      ...categoryPlan.ambiguousItems.map((item) => ({
        title: item.local.name, fields: item.fields,
      })),
      ...recordPlan.ambiguousItems.map((item) => ({
        title: item.local.title, fields: item.fields,
      })),
    ],
    purged:
      localCategories.length + categoryPlan.toLocal.length - finalCategories.length +
      (localRecords.length + recordPlan.toLocal.length - finalRecords.length),
    syncedAt: timestamp,
  }
}

async function purge<T extends Syncable>(
  items: T[],
  timestamp: string,
  remove: (ids: string[]) => Promise<unknown>,
): Promise<T[]> {
  const purgeable = selectPurgeable(items, timestamp)
  if (purgeable.length === 0) return items

  const ids = new Set(purgeable.map((item) => item.id))
  await remove([...ids])
  return items.filter((item) => !ids.has(item.id))
}

function summarize<T>(plan: MergePlan<T>) {
  return { pulled: plan.toLocal.length, pushed: plan.toRemote.length, ambiguous: plan.ambiguous }
}

/**
 * 以雲端資料整份覆蓋本機，不做合併。
 *
 * 對稱於 pushAll。用於雲端才是正確版本的情況——
 * 例如兩台裝置的 updatedAt 相同但內容不同，合併演算法會保守地
 * 兩邊都不覆寫，這時需要明確指定要以哪一邊為準。
 */
export async function pullAll(spreadsheetId: string): Promise<{ categories: number; records: number }> {
  const [categoryValues, recordValues] = await Promise.all([
    readSheet(spreadsheetId, CATEGORY_SHEET),
    readSheet(spreadsheetId, RECORD_SHEET),
  ])

  const categories = parseSheet(categoryValues, rowToCategory)
  const records = parseSheet(recordValues, rowToRecord)

  await db.transaction('rw', db.categories, db.watchRecords, async () => {
    // 這裡實體清空是安全的：整份資料都要換成雲端版本，
    // 而雲端保有完整內容（含軟刪除標記），不會遺失刪除紀錄
    await db.categories.clear()
    await db.watchRecords.clear()
    await db.categories.bulkPut(categories)
    await db.watchRecords.bulkPut(records)
  })

  await setMeta(META_KEYS.lastSyncedAt, now())
  return { categories: categories.length, records: records.length }
}

/** 首次連結：把本機資料整份推上去，不做合併 */
export async function pushAll(spreadsheetId: string): Promise<void> {
  const [categories, records] = await Promise.all([
    db.categories.toArray(),
    db.watchRecords.toArray(),
  ])

  await writeSheet(spreadsheetId, CATEGORY_SHEET, [
    [...CATEGORY_HEADERS],
    ...categories.map(categoryToRow),
  ])
  await writeSheet(spreadsheetId, RECORD_SHEET, [
    [...RECORD_HEADERS],
    ...records.map(recordToRow),
  ])

  await setMeta(META_KEYS.lastSyncedAt, now())
}

export type { Category, WatchRecord }
