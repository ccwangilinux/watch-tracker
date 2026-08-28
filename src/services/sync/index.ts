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
