import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db'
import { createRecord, updateRecord } from '@/services/records'
import { createCategory } from '@/services/categories'
import {
  RECORD_HEADERS, recordToRow, rowToRecord, parseSheet,
} from '@/services/sync/serialize'

beforeEach(async () => {
  await db.categories.clear()
  await db.watchRecords.clear()
  await db.meta.clear()
})

describe('狀態跨裝置往返', () => {
  it('本機標記狀態後，序列化到 Sheet 再讀回仍保留', async () => {
    const cat = await createCategory({ name: 'A', icon: '🎬', color: '#fff' })
    const record = await createRecord({
      categoryId: cat.id, title: '測試片', season: 1, episode: 5,
      watchTime: 100, status: null, completed: false, note: '',
    })

    await updateRecord(record.id, { status: 'waiting' })
    const local = await db.watchRecords.get(record.id)
    expect(local?.status).toBe('waiting')

    // 模擬 writeSheet → readSheet 的完整往返
    const sheet = [[...RECORD_HEADERS], recordToRow(local!)]
    const parsed = parseSheet(sheet, rowToRecord)

    expect(parsed[0]!.status).toBe('waiting')
    expect(parsed[0]!.updatedAt).toBe(local!.updatedAt)
  })

  it('雲端是舊表頭（無 status 欄）時，本機的狀態不會被清掉', async () => {
    const cat = await createCategory({ name: 'A', icon: '🎬', color: '#fff' })
    const record = await createRecord({
      categoryId: cat.id, title: '測試片', season: 1, episode: 5,
      watchTime: 100, status: 'watching', completed: false, note: '',
    })
    const local = await db.watchRecords.get(record.id)

    // 舊裝置寫上去的列：沒有 status 欄，且 updatedAt 較舊
    const oldHeaders = [...RECORD_HEADERS].filter((h) => h !== 'status')
    const oldRow = oldHeaders.map((h) => {
      if (h === 'id') return local!.id
      if (h === 'updatedAt') return '2020-01-01T00:00:00.000Z'
      if (h === 'deletedAt') return ''
      return String((local as unknown as Record<string, unknown>)[h] ?? '')
    })

    const remote = parseSheet([oldHeaders, oldRow], rowToRecord)
    expect(remote[0]!.status).toBeNull()

    const { mergeById } = await import('@/services/sync/merge')
    const plan = mergeById([local!], remote)

    // 本機較新 → 應該推上雲端，而不是被雲端的 null 覆蓋
    expect(plan.toLocal).toHaveLength(0)
    expect(plan.toRemote[0]!.status).toBe('watching')
  })

  it('雲端較新且有狀態時會拉下來', async () => {
    const cat = await createCategory({ name: 'A', icon: '🎬', color: '#fff' })
    const record = await createRecord({
      categoryId: cat.id, title: '測試片', season: 1, episode: 5,
      watchTime: 100, status: null, completed: false, note: '',
    })
    const local = await db.watchRecords.get(record.id)

    const remoteRow = recordToRow({ ...local!, status: 'planned', updatedAt: '2099-01-01T00:00:00.000Z' })
    const remote = parseSheet([[...RECORD_HEADERS], remoteRow], rowToRecord)

    const { mergeById } = await import('@/services/sync/merge')
    const plan = mergeById([local!], remote)

    expect(plan.toLocal[0]!.status).toBe('planned')
  })
})
