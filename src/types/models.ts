/**
 * 資料模型 — 與 Google Sheets 欄位一對一對應。
 *
 * 兩個全專案統一的格式約定：
 *   watchTime  : 總秒數（number），上限 999:59:59 = 3_599_999
 *   時間戳欄位  : ISO 8601 UTC 字串，固定長度，可直接字典序比較大小
 */

/** ISO 8601 UTC 字串，例：2026-08-28T06:15:33.000Z */
export type Timestamp = string

/** 所有可同步實體的共通欄位 */
export interface Syncable {
  id: string // UUID v4
  createdAt: Timestamp
  updatedAt: Timestamp
  /** 軟刪除；null 表示未刪除。查詢一律過濾此欄位 */
  deletedAt: Timestamp | null
}

export interface Category extends Syncable {
  name: string
  /** emoji 字元 */
  icon: string
  /** #RRGGBB */
  color: string
  sortOrder: number
}

/**
 * 觀看狀態。互斥的單一值，而非多選標籤——
 * 多選要序列化才能存進 Sheets，篩選與 UI 也複雜一個量級，
 * 而「待看」與「正在看」本來就不可能同時成立。
 *
 * 不包含「已完結」：完結是另一個獨立維度（由 completed 表示），
 * 一部劇可以同時是「等更新」且尚未完結。兩者混成同一個欄位會失去這個區別。
 */
export type WatchStatus = 'planned' | 'watching' | 'waiting'

export interface WatchRecord extends Syncable {
  categoryId: string
  title: string
  /** 0 = 未設定，1–99 = 第幾季 */
  season: number
  /** >= 0；0 代表還沒開始看 */
  episode: number
  /** 總秒數 */
  watchTime: number
  /** null 代表尚未標記狀態，不臆測使用者的意圖 */
  status: WatchStatus | null
  /** 是否完結。與 status 互相獨立 */
  completed: boolean
  sortOrder: number
  /** 規格預留欄位 */
  note: string
}

/** 紀錄列表的排序依據（規格第 15 節） */
export type SortKey =
  | 'title'
  | 'season'
  | 'episode'
  | 'watchTime'
  | 'status'
  | 'updatedAt'
  | 'createdAt'
  | 'custom'

export type SortDirection = 'asc' | 'desc'

/** key-value 表：UI 最後狀態與同步狀態（規格第 7 節） */
export interface MetaEntry {
  key: string
  value: unknown
}
