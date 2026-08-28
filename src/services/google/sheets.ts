import { requestToken, clearToken } from './auth'
import type { SheetCell } from '../sync/serialize'

/**
 * Google Sheets REST API。
 *
 * 直接用 fetch 而非 gapi.client：只用到四個端點，
 * 手寫比多載入一包 JS 可控，在 iOS Safari 上也少一次初始化等待。
 */

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

export const CATEGORY_SHEET = 'Categories'
export const RECORD_SHEET = 'WatchRecords'

export class AuthExpiredError extends Error {
  constructor() {
    super('Google 授權已過期，請重新授權')
    this.name = 'AuthExpiredError'
  }
}

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await requestToken(false)

  const response = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (response.status === 401 || response.status === 403) {
    // token 失效：清掉快取，讓下次呼叫重新取得。
    // 這裡不自動彈出授權視窗——那會在背景同步時突然打斷使用者。
    clearToken()
    throw new AuthExpiredError()
  }

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Google API 錯誤 ${response.status}：${body.slice(0, 200)}`)
  }

  return (await response.json()) as T
}

interface SpreadsheetResponse {
  spreadsheetId: string
  properties?: { title?: string }
}

/**
 * 建立一份新的試算表，含兩個工作表。
 * 用 drive.file 權限建立的檔案預設就是私人的，只有使用者本人看得到。
 */
export async function createSpreadsheet(title: string): Promise<string> {
  const result = await call<SpreadsheetResponse>(SHEETS_API, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: CATEGORY_SHEET } },
        { properties: { title: RECORD_SHEET } },
      ],
    }),
  })
  return result.spreadsheetId
}

export async function getSpreadsheetTitle(spreadsheetId: string): Promise<string> {
  const result = await call<SpreadsheetResponse>(
    `${SHEETS_API}/${spreadsheetId}?fields=properties.title`,
  )
  return result.properties?.title ?? '(未命名)'
}

interface ValuesResponse {
  values?: SheetCell[][]
}

/**
 * 讀取整個工作表。
 * UNFORMATTED_VALUE 讓 Sheets 回傳原始型別而非格式化字串——
 * 若用預設的 FORMATTED_VALUE，大數字會帶千分位逗號變成 "3,599,999"。
 */
export async function readSheet(
  spreadsheetId: string,
  sheetName: string,
): Promise<SheetCell[][]> {
  const range = encodeURIComponent(`${sheetName}!A:Z`)
  const result = await call<ValuesResponse>(
    `${SHEETS_API}/${spreadsheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`,
  )
  return result.values ?? []
}

/**
 * 以整表覆寫的方式寫回。
 *
 * 順序刻意是「先寫入、後清除多餘列」：
 * 若先 clear 再 update，中途失敗會讓雲端資料整份消失。
 * 反過來則最壞情況只是留下幾列殘留，而殘留列沒有 id 會被解析時略過。
 */
export async function writeSheet(
  spreadsheetId: string,
  sheetName: string,
  rows: string[][],
): Promise<void> {
  const writeRange = encodeURIComponent(`${sheetName}!A1`)
  await call(
    `${SHEETS_API}/${spreadsheetId}/values/${writeRange}?valueInputOption=RAW`,
    {
      method: 'PUT',
      // RAW：Sheets 不解析內容，ISO 8601 字串才不會被轉成日期序列值
      body: JSON.stringify({ values: rows, majorDimension: 'ROWS' }),
    },
  )

  const clearFrom = rows.length + 1
  const clearRange = encodeURIComponent(`${sheetName}!A${clearFrom}:Z`)
  await call(`${SHEETS_API}/${spreadsheetId}/values/${clearRange}:clear`, { method: 'POST' })
}

export interface DriveFile {
  id: string
  name: string
  createdTime?: string
  modifiedTime?: string
}

interface DriveListResponse {
  files?: DriveFile[]
}

/**
 * 列出本 App 曾建立的試算表。
 *
 * drive.file 權限只看得到這個 OAuth 用戶端自己建立的檔案，
 * 因此結果天然就只有本 App 的試算表，不會列出使用者的其他檔案。
 * 第二台裝置要連結時，必須先呼叫這個函式，否則會重複建立一份新的。
 */
export async function listAppSpreadsheets(): Promise<DriveFile[]> {
  const query = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
  )
  const result = await call<DriveListResponse>(
    `${DRIVE_API}?q=${query}&fields=files(id,name,createdTime,modifiedTime)` +
    `&orderBy=createdTime&pageSize=50`,
  )
  return result.files ?? []
}
