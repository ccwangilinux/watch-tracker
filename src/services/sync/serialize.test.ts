import { describe, it, expect } from 'vitest'
import {
  CATEGORY_HEADERS,
  RECORD_HEADERS,
  categoryToRow,
  rowToCategory,
  recordToRow,
  rowToRecord,
  parseSheet,
} from './serialize'
import type { Category, WatchRecord } from '@/types/models'

const CATEGORY: Category = {
  id: 'c1', name: '韓劇', icon: '🇰🇷', color: '#ff4fa3', sortOrder: 3,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T12:30:00.000Z',
  deletedAt: null,
}

const RECORD: WatchRecord = {
  id: 'r1', categoryId: 'c1', title: '淚之女王', season: 2, episode: 14,
  watchTime: 22533, status: null, completed: true, sortOrder: 0, note: '好看',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T12:30:00.000Z',
  deletedAt: null,
}

describe('類別序列化', () => {
  it('來回轉換不失真', () => {
    const row = categoryToRow(CATEGORY)
    expect(rowToCategory(row, [...CATEGORY_HEADERS])).toEqual(CATEGORY)
  })

  it('未刪除時 deletedAt 欄留白，讀回為 null', () => {
    const row = categoryToRow(CATEGORY)
    expect(row[CATEGORY_HEADERS.indexOf('deletedAt')]).toBe('')
    expect(rowToCategory(row, [...CATEGORY_HEADERS])!.deletedAt).toBeNull()
  })

  it('已刪除時保留時間戳', () => {
    const deleted = { ...CATEGORY, deletedAt: '2026-07-01T00:00:00.000Z' }
    expect(rowToCategory(categoryToRow(deleted), [...CATEGORY_HEADERS])!.deletedAt)
      .toBe('2026-07-01T00:00:00.000Z')
  })
})

describe('紀錄序列化', () => {
  it('來回轉換不失真', () => {
    expect(rowToRecord(recordToRow(RECORD), [...RECORD_HEADERS])).toEqual(RECORD)
  })

  it('布林寫成 TRUE / FALSE', () => {
    const index = RECORD_HEADERS.indexOf('completed')
    expect(recordToRow(RECORD)[index]).toBe('TRUE')
    expect(recordToRow({ ...RECORD, completed: false })[index]).toBe('FALSE')
  })

  it('Sheets 可能回傳原生布林或數字型別，都要能解析', () => {
    // UNFORMATTED_VALUE 之下 Sheets 會回傳真正的 boolean / number
    const headers = [...RECORD_HEADERS]
    const row = headers.map((h) => {
      if (h === 'completed') return true
      if (h === 'watchTime') return 22533
      if (h === 'season') return 2
      if (h === 'episode') return 14
      if (h === 'sortOrder') return 0
      if (h === 'id') return 'r1'
      if (h === 'deletedAt') return ''
      return 'x'
    })
    const parsed = rowToRecord(row, headers)!
    expect(parsed.completed).toBe(true)
    expect(parsed.watchTime).toBe(22533)
  })

  it('狀態可往返，未標記時欄位留白', () => {
    const withStatus = { ...RECORD, status: 'waiting' as const }
    expect(rowToRecord(recordToRow(withStatus), [...RECORD_HEADERS])!.status).toBe('waiting')

    const row = recordToRow(RECORD)
    expect(row[RECORD_HEADERS.indexOf('status')]).toBe('')
    expect(rowToRecord(row, [...RECORD_HEADERS])!.status).toBeNull()
  })

  it('舊試算表沒有 status 欄時視為未標記', () => {
    // 這是跨版本同步的實際情況：另一台裝置還在跑舊版
    const headers = [...RECORD_HEADERS].filter((h) => h !== 'status')
    const row = headers.map((h) => (h === 'id' ? 'r1' : h === 'deletedAt' ? '' : 'x'))
    expect(rowToRecord(row, headers)!.status).toBeNull()
  })

  it('status 欄被手動改成無效值時視為未標記', () => {
    const headers = [...RECORD_HEADERS]
    const row = headers.map((h) => (h === 'id' ? 'r1' : h === 'status' ? '亂打的' : ''))
    expect(rowToRecord(row, headers)!.status).toBeNull()
  })

  it('ISO 時間戳原樣保留，不被當成日期轉換', () => {
    const row = recordToRow(RECORD)
    expect(row[RECORD_HEADERS.indexOf('updatedAt')]).toBe('2026-06-01T12:30:00.000Z')
  })
})

describe('欄位以名稱定位', () => {
  it('欄位順序不同也能正確解析', () => {
    // 使用者可能在 Sheet 上調整欄位順序，不能靠索引硬讀
    const headers = ['updatedAt', 'id', 'name', 'deletedAt', 'icon', 'color', 'sortOrder', 'createdAt']
    const row = ['2026-06-01T12:30:00.000Z', 'c1', '韓劇', '', '🇰🇷', '#ff4fa3', '3', '2026-01-01T00:00:00.000Z']
    expect(rowToCategory(row, headers)).toEqual(CATEGORY)
  })

  it('缺少的欄位以空值處理，不拋錯', () => {
    const parsed = rowToCategory(['c1'], ['id'])
    expect(parsed).not.toBeNull()
    expect(parsed!.name).toBe('')
    expect(parsed!.sortOrder).toBe(0)
  })
})

describe('parseSheet', () => {
  it('第一列為表頭，其餘為資料', () => {
    const values = [[...CATEGORY_HEADERS], categoryToRow(CATEGORY)]
    expect(parseSheet(values, rowToCategory)).toEqual([CATEGORY])
  })

  it('略過沒有 id 的空列', () => {
    const values = [[...CATEGORY_HEADERS], categoryToRow(CATEGORY), [], ['', '', '']]
    expect(parseSheet(values, rowToCategory)).toHaveLength(1)
  })

  it('完全空的表格回傳空陣列', () => {
    expect(parseSheet([], rowToCategory)).toEqual([])
  })

  it('只有表頭沒有資料時回傳空陣列', () => {
    expect(parseSheet([[...RECORD_HEADERS]], rowToRecord)).toEqual([])
  })
})
