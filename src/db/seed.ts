import { db } from './index'
import { DEFAULT_CATEGORIES } from '@/constants/defaultCategories'
import { uuid } from '@/utils/id'
import { now } from '@/utils/time'
import { getMeta, setMeta, META_KEYS } from '@/services/meta'
import type { Category } from '@/types/models'

/**
 * 首次啟動時寫入預設類別。
 *
 * 以 meta 的 seeded 旗標判斷，而非「categories 表是否為空」。
 * 用表是否為空來判斷會讓「清除全部資料」之後預設類別又長回來——
 * 使用者主動清空，就不該再被塞回十個沒要過的類別，
 * 尤其接著從雲端同步時會變成預設類別與自己的類別並存。
 */
export async function seedIfNeeded(): Promise<boolean> {
  const seeded = await getMeta<boolean>(META_KEYS.seeded)
  if (seeded) return false

  const count = await db.categories.count()
  if (count > 0) {
    // 資料是從匯入或同步來的，補記旗標避免下次啟動又寫入預設類別
    await markSeeded()
    return false
  }

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
  await markSeeded()
  return true
}

/** 標記為已初始化，之後不再自動寫入預設類別 */
export async function markSeeded(): Promise<void> {
  await setMeta(META_KEYS.seeded, true)
}
