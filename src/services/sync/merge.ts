import type { Syncable } from '@/types/models'

/**
 * 雙向合併（規格第 18 節）。
 *
 * 純函式，不碰 IndexedDB、不碰 Google API、不 import 任何 Vue/Pinia，
 * 因此可以完整測試——這是整個專案最容易發生資料遺失的地方。
 *
 * 規則：
 *   只有本機有 → 推上雲端
 *   只有雲端有 → 寫入本機
 *   兩邊都有   → updatedAt 較新者勝（Last-Write-Wins）
 *
 * 刪除是軟刪除，所以「刪除」在這裡就只是一筆 deletedAt 有值的普通更新，
 * 不需要特別處理——這正是採用軟刪除的理由。
 */

export interface MergePlan<T> {
  /** 要寫入本機的資料（雲端較新，或本機沒有） */
  toLocal: T[]
  /** 要推送到雲端的資料（本機較新，或雲端沒有） */
  toRemote: T[]
  /** 兩邊一致、不需動作的筆數 */
  unchanged: number
  /** updatedAt 相同但內容不同，無法判斷版本的筆數 */
  ambiguous: number
}

export function mergeById<T extends Syncable>(local: T[], remote: T[]): MergePlan<T> {
  const localMap = new Map(local.map((item) => [item.id, item]))
  const remoteMap = new Map(remote.map((item) => [item.id, item]))

  const plan: MergePlan<T> = { toLocal: [], toRemote: [], unchanged: 0, ambiguous: 0 }

  for (const id of new Set([...localMap.keys(), ...remoteMap.keys()])) {
    const l = localMap.get(id)
    const r = remoteMap.get(id)

    if (l && !r) {
      plan.toRemote.push(l)
      continue
    }
    if (!l && r) {
      plan.toLocal.push(r)
      continue
    }
    if (!l || !r) continue

    // 時間戳是固定長度的 ISO 8601 UTC 字串，字典序比較等同時間先後
    if (l.updatedAt > r.updatedAt) {
      plan.toRemote.push(l)
    } else if (l.updatedAt < r.updatedAt) {
      plan.toLocal.push(r)
    } else {
      // updatedAt 相同：正常情況下代表同一版本。
      // 若內容仍不同，代表某一邊的 updatedAt 沒有正確推進——
      // 這時不覆寫任何一邊，只回報，避免無聲地弄丟資料。
      plan.unchanged += 1
      if (!shallowEqual(l, r)) plan.ambiguous += 1
    }
  }

  return plan
}

function shallowEqual<T extends object>(a: T, b: T): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof T>
  for (const key of keys) {
    if (a[key] !== b[key]) return false
  }
  return true
}

/** 軟刪除資料保留多久才實體清除 */
export const PURGE_AFTER_DAYS = 30

/**
 * 挑出可以實體刪除的資料。
 *
 * 條件是「已刪除超過 30 天」而不是「已刪除」：
 * 若一刪就實體移除，長期離線的另一台裝置下次同步時會發現雲端沒有這筆，
 * 把它當成「本機新增」重新推回去——刪掉的紀錄就復活了。
 * 保留 30 天讓刪除標記有足夠時間傳播到所有裝置。
 */
export function selectPurgeable<T extends Syncable>(items: T[], nowIso: string): T[] {
  const cutoff = new Date(new Date(nowIso).getTime() - PURGE_AFTER_DAYS * 86_400_000).toISOString()
  return items.filter((item) => item.deletedAt !== null && item.deletedAt < cutoff)
}
