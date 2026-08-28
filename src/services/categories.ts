import { db } from '@/db'
import { uuid } from '@/utils/id'
import { now } from '@/utils/time'
import type { Category } from '@/types/models'

/**
 * 類別資料存取。純資料層，不 import 任何 Vue/Pinia，
 * 讓同步服務與測試都能直接使用。
 */

export async function listCategories(): Promise<Category[]> {
  const all = await db.categories.toArray()
  return all
    .filter((c) => c.deletedAt === null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function getCategory(id: string): Promise<Category | undefined> {
  const found = await db.categories.get(id)
  return found?.deletedAt === null ? found : undefined
}

export interface CategoryInput {
  name: string
  icon: string
  color: string
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const existing = await listCategories()
  const maxOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1)
  const timestamp = now()

  const category: Category = {
    id: uuid(),
    ...input,
    sortOrder: maxOrder + 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  }

  await db.categories.add(category)
  return category
}

export async function updateCategory(
  id: string,
  patch: Partial<CategoryInput>,
): Promise<void> {
  await db.categories.update(id, { ...patch, updatedAt: now() })
}

/**
 * 軟刪除類別，並連帶軟刪除其下所有紀錄。
 * 兩者放在同一個 transaction，避免中途失敗留下孤兒紀錄。
 */
export async function deleteCategory(id: string): Promise<void> {
  const timestamp = now()

  await db.transaction('rw', db.categories, db.watchRecords, async () => {
    await db.categories.update(id, { deletedAt: timestamp, updatedAt: timestamp })

    const records = await db.watchRecords.where('categoryId').equals(id).toArray()
    const alive = records.filter((r) => r.deletedAt === null)
    await db.watchRecords.bulkUpdate(
      alive.map((r) => ({
        key: r.id,
        changes: { deletedAt: timestamp, updatedAt: timestamp },
      })),
    )
  })
}

/** 依傳入的 id 順序重寫 sortOrder */
export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const timestamp = now()
  await db.categories.bulkUpdate(
    orderedIds.map((id, index) => ({
      key: id,
      changes: { sortOrder: index, updatedAt: timestamp },
    })),
  )
}

/** 各類別的未刪除紀錄數，用於首頁顯示 */
export async function countRecordsByCategory(): Promise<Record<string, number>> {
  const records = await db.watchRecords.toArray()
  const counts: Record<string, number> = {}
  for (const record of records) {
    if (record.deletedAt !== null) continue
    counts[record.categoryId] = (counts[record.categoryId] ?? 0) + 1
  }
  return counts
}
