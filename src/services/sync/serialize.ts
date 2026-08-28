import type { Category, WatchRecord, WatchStatus } from '@/types/models'

/**
 * 資料物件與 Google Sheets 列的互轉。
 *
 * 欄位一律以「表頭名稱」定位而非欄索引：
 * 這樣日後在 Sheet 中間插欄、或調整欄位順序都不會讓同步錯亂。
 *
 * 寫入時使用 valueInputOption=RAW，Sheets 不會解析內容——
 * 這很重要，否則 ISO 8601 字串會被當成日期轉成序列值，時間戳就毀了。
 */

export const CATEGORY_HEADERS = [
  'id', 'name', 'icon', 'color', 'sortOrder', 'createdAt', 'updatedAt', 'deletedAt',
] as const

export const RECORD_HEADERS = [
  'id', 'categoryId', 'title', 'season', 'episode', 'watchTime', 'status', 'completed',
  'sortOrder', 'note', 'createdAt', 'updatedAt', 'deletedAt',
] as const

const VALID_STATUSES = new Set(['planned', 'watching', 'waiting'])

export type SheetCell = string | number | boolean | null | undefined

function text(value: SheetCell): string {
  return value === null || value === undefined ? '' : String(value)
}

function num(value: SheetCell): number {
  const parsed = Number(text(value))
  return Number.isFinite(parsed) ? parsed : 0
}

function bool(value: SheetCell): boolean {
  if (typeof value === 'boolean') return value
  return ['true', 'TRUE', '1', 'yes'].includes(text(value).trim())
}

/** 空字串代表 null；未刪除的資料在 Sheet 上該欄留白 */
function nullableText(value: SheetCell): string | null {
  const t = text(value).trim()
  return t === '' ? null : t
}

/** 依表頭名稱取出對應欄的值 */
function pick(row: SheetCell[], headers: string[], field: string): SheetCell {
  const index = headers.indexOf(field)
  return index === -1 ? '' : row[index]
}

export function categoryToRow(category: Category): string[] {
  return CATEGORY_HEADERS.map((field) => text(category[field]))
}

export function rowToCategory(row: SheetCell[], headers: string[]): Category | null {
  const id = text(pick(row, headers, 'id')).trim()
  if (!id) return null // 空列或殘留列，略過

  return {
    id,
    name: text(pick(row, headers, 'name')),
    icon: text(pick(row, headers, 'icon')),
    color: text(pick(row, headers, 'color')),
    sortOrder: num(pick(row, headers, 'sortOrder')),
    createdAt: text(pick(row, headers, 'createdAt')),
    updatedAt: text(pick(row, headers, 'updatedAt')),
    deletedAt: nullableText(pick(row, headers, 'deletedAt')),
  }
}

export function recordToRow(record: WatchRecord): string[] {
  return RECORD_HEADERS.map((field) => {
    const value = record[field]
    // 布林寫成 TRUE/FALSE，在 Sheet 上人眼也看得懂
    return typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : text(value)
  })
}

export function rowToRecord(row: SheetCell[], headers: string[]): WatchRecord | null {
  const id = text(pick(row, headers, 'id')).trim()
  if (!id) return null

  // 舊試算表沒有 status 欄，或值被手動改壞時一律視為未標記
  const rawStatus = text(pick(row, headers, 'status')).trim()
  const status = VALID_STATUSES.has(rawStatus) ? (rawStatus as WatchStatus) : null

  return {
    id,
    categoryId: text(pick(row, headers, 'categoryId')),
    title: text(pick(row, headers, 'title')),
    season: num(pick(row, headers, 'season')),
    episode: num(pick(row, headers, 'episode')),
    watchTime: num(pick(row, headers, 'watchTime')),
    status,
    completed: bool(pick(row, headers, 'completed')),
    sortOrder: num(pick(row, headers, 'sortOrder')),
    note: text(pick(row, headers, 'note')),
    createdAt: text(pick(row, headers, 'createdAt')),
    updatedAt: text(pick(row, headers, 'updatedAt')),
    deletedAt: nullableText(pick(row, headers, 'deletedAt')),
  }
}

/** 把整份表格（含表頭列）解析成物件陣列 */
export function parseSheet<T>(
  values: SheetCell[][],
  toEntity: (row: SheetCell[], headers: string[]) => T | null,
): T[] {
  if (values.length === 0) return []

  const headers = (values[0] ?? []).map((h) => text(h).trim())
  return values
    .slice(1)
    .map((row) => toEntity(row, headers))
    .filter((entity): entity is T => entity !== null)
}
