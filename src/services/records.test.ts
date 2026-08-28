import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db'
import {
  listByCategory,
  searchAll,
  createRecord,
  updateRecord,
  deleteRecord,
  sortRecords,
} from './records'
import type { WatchRecord } from '@/types/models'

const CATEGORY = 'cat-1'

function baseInput(overrides: Partial<Parameters<typeof createRecord>[0]> = {}) {
  return {
    categoryId: CATEGORY,
    title: '測試片',
    season: 1,
    episode: 1,
    watchTime: 0,
    completed: false,
    note: '',
    ...overrides,
  }
}

function fakeRecord(overrides: Partial<WatchRecord>): WatchRecord {
  return {
    id: 'x', categoryId: CATEGORY, title: '片', season: 1, episode: 1,
    watchTime: 0, completed: false, sortOrder: 0, note: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.watchRecords.clear()
})

describe('createRecord', () => {
  it('新紀錄排在同類別最後', async () => {
    await createRecord(baseInput({ title: 'A' }))
    const second = await createRecord(baseInput({ title: 'B' }))
    expect(second.sortOrder).toBe(1)
  })

  it('sortOrder 只在同類別內計算，不受其他類別影響', async () => {
    await createRecord(baseInput({ title: 'A' }))
    await createRecord(baseInput({ title: 'B' }))
    const other = await createRecord(baseInput({ categoryId: 'cat-2', title: 'C' }))
    expect(other.sortOrder).toBe(0)
  })
})

describe('listByCategory', () => {
  it('排除已軟刪除的紀錄', async () => {
    const keep = await createRecord(baseInput({ title: '保留' }))
    const gone = await createRecord(baseInput({ title: '刪除' }))
    await deleteRecord(gone.id)

    const list = await listByCategory(CATEGORY)
    expect(list.map((r) => r.id)).toEqual([keep.id])
  })
})

describe('searchAll', () => {
  it('子字串比對，跨類別', async () => {
    await createRecord(baseInput({ title: '進擊的巨人' }))
    await createRecord(baseInput({ categoryId: 'cat-2', title: '進擊的巨人 最終季' }))
    await createRecord(baseInput({ title: '鬼滅之刃' }))

    // 這正是不能用 IndexedDB 索引的原因：索引只能前綴比對
    const hits = await searchAll('巨人')
    expect(hits).toHaveLength(2)
  })

  it('空字串不回傳任何結果', async () => {
    await createRecord(baseInput({ title: 'A' }))
    expect(await searchAll('   ')).toHaveLength(0)
  })

  it('不回傳已刪除的紀錄', async () => {
    const record = await createRecord(baseInput({ title: '搜得到' }))
    await deleteRecord(record.id)
    expect(await searchAll('搜得到')).toHaveLength(0)
  })
})

describe('updateRecord', () => {
  it('推進 updatedAt，供同步判斷版本', async () => {
    const record = await createRecord(baseInput())
    await new Promise((r) => setTimeout(r, 2))
    await updateRecord(record.id, { episode: 5 })

    const updated = await db.watchRecords.get(record.id)
    expect(updated?.episode).toBe(5)
    expect(updated!.updatedAt > record.updatedAt).toBe(true)
  })
})

describe('sortRecords', () => {
  it('片名用中文定序，而非 UTF-16 碼位', () => {
    const records = [
      fakeRecord({ id: '1', title: '進擊的巨人' }),
      fakeRecord({ id: '2', title: '鬼滅之刃' }),
    ]

    // 碼位序會把「進」(U+9032) 排在「鬼」(U+9B3C) 前面
    expect('進擊的巨人' < '鬼滅之刃').toBe(true)

    // 中文定序的結果相反 — 這正是不能直接用 < 比較字串的理由
    expect(sortRecords(records, 'title', 'asc').map((r) => r.title)).toEqual([
      '鬼滅之刃',
      '進擊的巨人',
    ])
  })

  it('依季數排序時，同季再比集數', () => {
    const records = [
      fakeRecord({ id: '1', season: 2, episode: 3 }),
      fakeRecord({ id: '2', season: 1, episode: 9 }),
      fakeRecord({ id: '3', season: 2, episode: 1 }),
    ]
    expect(sortRecords(records, 'season', 'asc').map((r) => r.id)).toEqual(['2', '3', '1'])
  })

  it('觀看時間可遞減排序', () => {
    const records = [
      fakeRecord({ id: '1', watchTime: 100 }),
      fakeRecord({ id: '2', watchTime: 5000 }),
      fakeRecord({ id: '3', watchTime: 900 }),
    ]
    expect(sortRecords(records, 'watchTime', 'desc').map((r) => r.id)).toEqual(['2', '3', '1'])
  })

  it('更新時間遞減，最近修改的排前面', () => {
    const records = [
      fakeRecord({ id: '1', updatedAt: '2026-01-01T00:00:00.000Z' }),
      fakeRecord({ id: '2', updatedAt: '2026-08-01T00:00:00.000Z' }),
      fakeRecord({ id: '3', updatedAt: '2026-03-01T00:00:00.000Z' }),
    ]
    expect(sortRecords(records, 'updatedAt', 'desc').map((r) => r.id)).toEqual(['2', '3', '1'])
  })

  it('排序值相同時以片名穩定收尾', () => {
    const records = [
      fakeRecord({ id: '1', title: 'C', watchTime: 100 }),
      fakeRecord({ id: '2', title: 'A', watchTime: 100 }),
      fakeRecord({ id: '3', title: 'B', watchTime: 100 }),
    ]
    // 相同 watchTime 下順序必須可預期，否則每次重繪列表都會跳動
    expect(sortRecords(records, 'watchTime', 'desc').map((r) => r.title)).toEqual(['A', 'B', 'C'])
  })

  it('不改動傳入的陣列', () => {
    const records = [fakeRecord({ id: '1', title: 'B' }), fakeRecord({ id: '2', title: 'A' })]
    const before = records.map((r) => r.id)
    sortRecords(records, 'title', 'asc')
    expect(records.map((r) => r.id)).toEqual(before)
  })
})
