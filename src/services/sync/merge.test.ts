import { describe, it, expect } from 'vitest'
import { mergeById, selectPurgeable, PURGE_AFTER_DAYS } from './merge'
import type { Category } from '@/types/models'

function cat(id: string, updatedAt: string, overrides: Partial<Category> = {}): Category {
  return {
    id,
    name: `類別${id}`,
    icon: '🎬',
    color: '#fff',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
    deletedAt: null,
    ...overrides,
  }
}

const T1 = '2026-01-01T00:00:00.000Z'
const T2 = '2026-06-01T00:00:00.000Z'

describe('mergeById', () => {
  it('只有本機有的資料要推上雲端', () => {
    const plan = mergeById([cat('a', T1)], [])
    expect(plan.toRemote.map((c) => c.id)).toEqual(['a'])
    expect(plan.toLocal).toHaveLength(0)
  })

  it('只有雲端有的資料要寫入本機', () => {
    const plan = mergeById([], [cat('a', T1)])
    expect(plan.toLocal.map((c) => c.id)).toEqual(['a'])
    expect(plan.toRemote).toHaveLength(0)
  })

  it('兩邊都有時由 updatedAt 較新者勝', () => {
    const localWins = mergeById([cat('a', T2, { name: '新' })], [cat('a', T1, { name: '舊' })])
    expect(localWins.toRemote[0]!.name).toBe('新')
    expect(localWins.toLocal).toHaveLength(0)

    const remoteWins = mergeById([cat('a', T1, { name: '舊' })], [cat('a', T2, { name: '新' })])
    expect(remoteWins.toLocal[0]!.name).toBe('新')
    expect(remoteWins.toRemote).toHaveLength(0)
  })

  it('完全相同的資料不需要任何動作', () => {
    const plan = mergeById([cat('a', T1)], [cat('a', T1)])
    expect(plan.toLocal).toHaveLength(0)
    expect(plan.toRemote).toHaveLength(0)
    expect(plan.unchanged).toBe(1)
    expect(plan.ambiguous).toBe(0)
  })

  it('updatedAt 相同但內容不同時不覆寫任何一邊，只回報', () => {
    // 代表某一邊的 updatedAt 沒有正確推進，貿然覆寫會無聲丟失資料
    const plan = mergeById([cat('a', T1, { name: 'X' })], [cat('a', T1, { name: 'Y' })])
    expect(plan.toLocal).toHaveLength(0)
    expect(plan.toRemote).toHaveLength(0)
    expect(plan.ambiguous).toBe(1)
  })

  it('回報無法判定的項目時，指出實際不同的欄位', () => {
    // 只給數字的話使用者看不出是哪幾筆、差在哪，只會覺得同步沒生效
    const plan = mergeById(
      [cat('a', T1, { name: 'X', icon: '🎬' })],
      [cat('a', T1, { name: 'Y', icon: '🎬' })],
    )
    expect(plan.ambiguousItems).toHaveLength(1)
    expect(plan.ambiguousItems[0]!.fields).toEqual(['name'])
    expect(plan.ambiguousItems[0]!.id).toBe('a')
  })

  it('刪除視為一般更新：本機刪除會傳播到雲端', () => {
    const plan = mergeById([cat('a', T2, { deletedAt: T2 })], [cat('a', T1)])
    expect(plan.toRemote[0]!.deletedAt).toBe(T2)
  })

  it('刪除視為一般更新：雲端刪除會傳播到本機', () => {
    const plan = mergeById([cat('a', T1)], [cat('a', T2, { deletedAt: T2 })])
    expect(plan.toLocal[0]!.deletedAt).toBe(T2)
  })

  it('刪除後又修改，較新的修改勝出（復原刪除）', () => {
    const revived = cat('a', T2, { deletedAt: null, name: '救回來' })
    const plan = mergeById([revived], [cat('a', T1, { deletedAt: T1 })])
    expect(plan.toRemote[0]!.deletedAt).toBeNull()
  })

  it('兩邊都空時不產生任何動作', () => {
    expect(mergeById<Category>([], [])).toEqual({
      toLocal: [], toRemote: [], unchanged: 0, ambiguous: 0, ambiguousItems: [],
    })
  })

  it('混合情境：各種狀態同時存在也能正確分流', () => {
    const local = [
      cat('only-local', T1),
      cat('local-newer', T2, { name: '本機新' }),
      cat('remote-newer', T1),
      cat('same', T1),
    ]
    const remote = [
      cat('only-remote', T1),
      cat('local-newer', T1),
      cat('remote-newer', T2, { name: '雲端新' }),
      cat('same', T1),
    ]

    const plan = mergeById(local, remote)
    expect(plan.toRemote.map((c) => c.id).sort()).toEqual(['local-newer', 'only-local'])
    expect(plan.toLocal.map((c) => c.id).sort()).toEqual(['only-remote', 'remote-newer'])
    expect(plan.unchanged).toBe(1)
  })

  it('不修改傳入的陣列與物件', () => {
    const local = [cat('a', T2)]
    const remote = [cat('a', T1)]
    const snapshot = JSON.stringify({ local, remote })
    mergeById(local, remote)
    expect(JSON.stringify({ local, remote })).toBe(snapshot)
  })
})

describe('selectPurgeable', () => {
  const NOW = '2026-06-01T00:00:00.000Z'
  const daysBefore = (days: number) =>
    new Date(new Date(NOW).getTime() - days * 86_400_000).toISOString()

  it('刪除未滿 30 天的不清除', () => {
    expect(selectPurgeable([cat('a', NOW, { deletedAt: daysBefore(PURGE_AFTER_DAYS - 1) })], NOW))
      .toHaveLength(0)
  })

  it('刪除超過 30 天的可清除', () => {
    expect(selectPurgeable([cat('a', NOW, { deletedAt: daysBefore(PURGE_AFTER_DAYS + 1) })], NOW)
      .map((c) => c.id)).toEqual(['a'])
  })

  it('未刪除的資料永遠不會被清除', () => {
    expect(selectPurgeable([cat('a', daysBefore(999))], NOW)).toHaveLength(0)
  })
})
