import { db } from './index'
import { DEFAULT_CATEGORIES } from '@/constants/defaultCategories'
import { uuid } from '@/utils/id'
import { now } from '@/utils/time'
import type { Category } from '@/types/models'

/**
 * 首次啟動時寫入預設類別。
 * 以「categories 表為空」判斷，而非用旗標——旗標可能與實際資料不同步，
 * 例如使用者清除全部資料後旗標還在，就再也不會有預設類別。
 */
export async function seedIfEmpty(): Promise<boolean> {
  const count = await db.categories.count()
  if (count > 0) return false

  const timestamp = now()
  const rows: Category[] = DEFAULT_CATEGORIES.map((c, index) => ({
    id: uuid(),
    name: c.name,
    icon: c.icon,
    color: c.color,
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  }))

  await db.categories.bulkAdd(rows)
  return true
}
