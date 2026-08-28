import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db'
import { seedIfEmpty } from '@/db/seed'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  countRecordsByCategory,
} from './categories'
import { DEFAULT_CATEGORIES } from '@/constants/defaultCategories'
import { uuid } from '@/utils/id'
import { now } from '@/utils/time'

beforeEach(async () => {
  await db.categories.clear()
  await db.watchRecords.clear()
  await db.meta.clear()
})

describe('seedIfEmpty', () => {
  it('空資料庫時寫入預設類別並保持順序', async () => {
    expect(await seedIfEmpty()).toBe(true)

    const list = await listCategories()
    expect(list).toHaveLength(DEFAULT_CATEGORIES.length)
    expect(list.map((c) => c.name)).toEqual(DEFAULT_CATEGORIES.map((c) => c.name))
    expect(list.map((c) => c.sortOrder)).toEqual(list.map((_, i) => i))
  })

  it('已有資料時不重複寫入', async () => {
    await seedIfEmpty()
    expect(await seedIfEmpty()).toBe(false)
    expect(await db.categories.count()).toBe(DEFAULT_CATEGORIES.length)
  })
})

describe('createCategory', () => {
  it('新類別排在最後', async () => {
    await createCategory({ name: 'A', icon: '🎬', color: '#fff' })
    const second = await createCategory({ name: 'B', icon: '📺', color: '#000' })
    expect(second.sortOrder).toBe(1)
  })

  it('產生 UUID 與時間戳，deletedAt 為 null', async () => {
    const created = await createCategory({ name: 'A', icon: '🎬', color: '#fff' })
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(created.deletedAt).toBeNull()
    expect(created.createdAt).toBe(created.updatedAt)
  })
})

describe('deleteCategory', () => {
  it('採軟刪除，不從資料庫實體移除', async () => {
    const cat = await createCategory({ name: 'A', icon: '🎬', color: '#fff' })
    await deleteCategory(cat.id)

    expect(await listCategories()).toHaveLength(0)
    // 同步時需要靠這筆紀錄把刪除傳播到其他裝置，所以實體資料必須還在
    const raw = await db.categories.get(cat.id)
    expect(raw?.deletedAt).not.toBeNull()
  })

  it('連帶軟刪除其下的觀看紀錄', async () => {
    const cat = await createCategory({ name: 'A', icon: '🎬', color: '#fff' })
    const timestamp = now()
    await db.watchRecords.bulkAdd([
      {
        id: uuid(), categoryId: cat.id, title: '片1', season: 1, episode: 1,
        watchTime: 0, completed: false, sortOrder: 0, note: '',
        createdAt: timestamp, updatedAt: timestamp, deletedAt: null,
      },
      {
        id: uuid(), categoryId: cat.id, title: '片2', season: 1, episode: 2,
        watchTime: 0, completed: false, sortOrder: 1, note: '',
        createdAt: timestamp, updatedAt: timestamp, deletedAt: null,
      },
    ])

    await deleteCategory(cat.id)

    const remaining = await db.watchRecords.toArray()
    expect(remaining).toHaveLength(2)
    expect(remaining.every((r) => r.deletedAt !== null)).toBe(true)
  })
})

describe('reorderCategories', () => {
  it('依傳入順序重寫 sortOrder', async () => {
    const a = await createCategory({ name: 'A', icon: '🎬', color: '#fff' })
    const b = await createCategory({ name: 'B', icon: '📺', color: '#fff' })
    const c = await createCategory({ name: 'C', icon: '📚', color: '#fff' })

    await reorderCategories([c.id, a.id, b.id])

    expect((await listCategories()).map((x) => x.name)).toEqual(['C', 'A', 'B'])
  })
})

describe('countRecordsByCategory', () => {
  it('不計入已軟刪除的紀錄', async () => {
    const cat = await createCategory({ name: 'A', icon: '🎬', color: '#fff' })
    const timestamp = now()
    await db.watchRecords.bulkAdd([
      {
        id: uuid(), categoryId: cat.id, title: '在', season: 1, episode: 1,
        watchTime: 0, completed: false, sortOrder: 0, note: '',
        createdAt: timestamp, updatedAt: timestamp, deletedAt: null,
      },
      {
        id: uuid(), categoryId: cat.id, title: '已刪', season: 1, episode: 1,
        watchTime: 0, completed: false, sortOrder: 1, note: '',
        createdAt: timestamp, updatedAt: timestamp, deletedAt: timestamp,
      },
    ])

    expect((await countRecordsByCategory())[cat.id]).toBe(1)
  })
})

describe('updateCategory', () => {
  it('更新欄位並推進 updatedAt', async () => {
    const cat = await createCategory({ name: 'A', icon: '🎬', color: '#fff' })
    await new Promise((r) => setTimeout(r, 2))
    await updateCategory(cat.id, { name: 'A2' })

    const updated = await db.categories.get(cat.id)
    expect(updated?.name).toBe('A2')
    // updatedAt 是同步時判斷版本新舊的唯一依據，必須確實推進
    expect(updated!.updatedAt > cat.updatedAt).toBe(true)
  })
})
