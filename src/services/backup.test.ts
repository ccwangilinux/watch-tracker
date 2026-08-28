import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/db'
import {
  exportJson, parseBackup, importBackup, InvalidBackupError, BACKUP_VERSION,
} from './backup'
import { createCategory, deleteCategory } from './categories'
import { createRecord } from './records'

beforeEach(async () => {
  await db.categories.clear()
  await db.watchRecords.clear()
})

describe('exportJson', () => {
  it('包含已軟刪除的資料', async () => {
    const cat = await createCategory({ name: 'A', icon: '🎬', color: '#fff' })
    await deleteCategory(cat.id)

    const backup = await exportJson()
    // 若備份不含刪除標記，還原到另一台裝置後這筆會從雲端被拉回來復活
    expect(backup.categories).toHaveLength(1)
    expect(backup.categories[0]!.deletedAt).not.toBeNull()
  })

  it('帶有 app 識別與版本號', async () => {
    const backup = await exportJson()
    expect(backup.app).toBe('watch-tracker')
    expect(backup.version).toBe(BACKUP_VERSION)
  })
})

describe('parseBackup', () => {
  const valid = JSON.stringify({
    app: 'watch-tracker', version: 1, exportedAt: '2026-01-01T00:00:00.000Z',
    categories: [], records: [],
  })

  it('接受有效的備份檔', () => {
    expect(parseBackup(valid).app).toBe('watch-tracker')
  })

  it('拒絕非 JSON 內容', () => {
    expect(() => parseBackup('不是 json')).toThrow(InvalidBackupError)
  })

  it('拒絕其他 App 的備份檔', () => {
    const other = JSON.stringify({ app: 'other-app', version: 1, categories: [], records: [] })
    expect(() => parseBackup(other)).toThrow(/不是「我的觀看紀錄」/)
  })

  it('拒絕來自較新版本的備份檔', () => {
    const future = JSON.stringify({
      app: 'watch-tracker', version: BACKUP_VERSION + 1, categories: [], records: [],
    })
    expect(() => parseBackup(future)).toThrow(/較新的版本/)
  })

  it('拒絕缺少資料欄位的檔案', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'watch-tracker', version: 1 })))
      .toThrow(/缺少必要的資料欄位/)
  })

  it('拒絕 null', () => {
    expect(() => parseBackup('null')).toThrow(InvalidBackupError)
  })
})

describe('importBackup', () => {
  it('merge 模式保留本機獨有的資料', async () => {
    const mine = await createCategory({ name: '本機獨有', icon: '🎬', color: '#fff' })
    const backup = {
      app: 'watch-tracker' as const, version: 1, exportedAt: '2026-01-01T00:00:00.000Z',
      categories: [{
        id: 'from-backup', name: '備份來的', icon: '📺', color: '#000', sortOrder: 0,
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
        deletedAt: null,
      }],
      records: [],
    }

    await importBackup(backup, 'merge')

    const ids = (await db.categories.toArray()).map((c) => c.id).sort()
    expect(ids).toEqual([mine.id, 'from-backup'].sort())
  })

  it('replace 模式清空後才還原', async () => {
    await createCategory({ name: '會被清掉', icon: '🎬', color: '#fff' })
    const backup = {
      app: 'watch-tracker' as const, version: 1, exportedAt: '2026-01-01T00:00:00.000Z',
      categories: [{
        id: 'only', name: '唯一', icon: '📺', color: '#000', sortOrder: 0,
        createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
        deletedAt: null,
      }],
      records: [],
    }

    await importBackup(backup, 'replace')

    const all = await db.categories.toArray()
    expect(all.map((c) => c.id)).toEqual(['only'])
  })

  it('同 id 的資料會被備份內容覆寫', async () => {
    const cat = await createCategory({ name: '原本', icon: '🎬', color: '#fff' })
    await importBackup({
      app: 'watch-tracker', version: 1, exportedAt: '2026-01-01T00:00:00.000Z',
      categories: [{ ...cat, name: '被覆寫' }],
      records: [],
    }, 'merge')

    expect((await db.categories.get(cat.id))?.name).toBe('被覆寫')
  })

  it('匯入的紀錄與類別數量正確回報', async () => {
    const cat = await createCategory({ name: 'A', icon: '🎬', color: '#fff' })
    await createRecord({
      categoryId: cat.id, title: 'X', season: 1, episode: 1,
      watchTime: 0, completed: false, note: '',
    })
    const backup = await exportJson()

    const result = await importBackup(backup, 'merge')
    expect(result).toEqual({ categories: 1, records: 1 })
  })
})
