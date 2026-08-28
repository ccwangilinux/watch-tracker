import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getMeta, setMeta, META_KEYS } from '@/services/meta'
import { isConfigured, requestToken, revoke, hasToken } from '@/services/google/auth'
import {
  createSpreadsheet, getSpreadsheetTitle, listAppSpreadsheets, AuthExpiredError,
} from '@/services/google/sheets'
import type { DriveFile } from '@/services/google/sheets'
import { runSync, pushAll, pullAll } from '@/services/sync'
import { useCategoryStore } from './categories'
import { useRecordStore } from './records'
import type { SyncResult } from '@/services/sync'

export type SyncState = 'idle' | 'syncing' | 'error' | 'unauthorized'

export const useCloudStore = defineStore('cloud', () => {
  const sheetId = ref<string | null>(null)
  const sheetTitle = ref<string>('')
  const lastSyncedAt = ref<string | null>(null)
  const state = ref<SyncState>('idle')
  const error = ref<string>('')
  const lastResult = ref<SyncResult | null>(null)
  const restored = ref(false)
  const available = ref<DriveFile[]>([])

  const configured = computed(() => isConfigured())
  const linked = computed(() => sheetId.value !== null)
  const authorized = computed(() => hasToken())

  async function restore() {
    if (restored.value) return
    sheetId.value = (await getMeta<string>(META_KEYS.sheetId)) ?? null
    lastSyncedAt.value = (await getMeta<string>(META_KEYS.lastSyncedAt)) ?? null
    restored.value = true
  }

  function describeError(e: unknown): string {
    if (e instanceof AuthExpiredError) return e.message
    return e instanceof Error ? e.message : '同步失敗'
  }

  /**
   * 登入並列出這個 Google 帳號底下、本 App 已建立的試算表。
   *
   * 第二台裝置必須走這一步再選擇既有的那份——sheetId 存在各裝置自己的
   * IndexedDB 裡不會跨裝置傳遞，若直接建立新的就會變成兩份各自為政。
   */
  async function signInAndList(): Promise<DriveFile[]> {
    state.value = 'syncing'
    error.value = ''

    try {
      // 必須在使用者點擊的事件流程中呼叫，否則 popup 會被 Safari 攔截
      await requestToken(true)
      available.value = await listAppSpreadsheets()
      state.value = 'idle'
      return available.value
    } catch (e) {
      state.value = e instanceof AuthExpiredError ? 'unauthorized' : 'error'
      error.value = describeError(e)
      throw e
    }
  }

  /** 建立一份新的試算表並把本機資料整份推上去 */
  async function createAndLink(): Promise<void> {
    state.value = 'syncing'
    error.value = ''

    try {
      const id = await createSpreadsheet('我的觀看紀錄 — Watch Tracker')
      await pushAll(id)
      await setLinked(id)
      state.value = 'idle'
    } catch (e) {
      state.value = 'error'
      error.value = describeError(e)
    }
  }

  /** 連結到既有的試算表，並立刻做一次雙向合併 */
  async function linkExisting(file: DriveFile): Promise<void> {
    await setLinked(file.id, file.name)
    await sync(false)
  }

  async function setLinked(id: string, title?: string): Promise<void> {
    sheetId.value = id
    await setMeta(META_KEYS.sheetId, id)
    sheetTitle.value = title ?? (await getSpreadsheetTitle(id))
    lastSyncedAt.value = (await getMeta<string>(META_KEYS.lastSyncedAt)) ?? null
  }

  /**
   * 執行同步。
   * interactive=false 用於背景同步：授權過期時安靜失敗，
   * 不在使用者沒有預期的時候彈出授權視窗。
   */
  async function sync(interactive: boolean): Promise<void> {
    if (!sheetId.value) return

    state.value = 'syncing'
    error.value = ''

    try {
      if (interactive) await requestToken(true)

      const result = await runSync(sheetId.value)
      lastResult.value = result
      lastSyncedAt.value = result.syncedAt

      // 同步可能改動了任何資料，重新載入畫面上的內容
      await Promise.all([useCategoryStore().load(), useRecordStore().reload()])

      state.value = 'idle'
    } catch (e) {
      state.value = e instanceof AuthExpiredError ? 'unauthorized' : 'error'
      error.value = describeError(e)
    }
  }

  /**
   * 啟動時的背景同步（規格第 6 節）。
   * 絕不阻塞畫面，失敗也不打擾使用者——本機資料本來就已經顯示出來了。
   */
  async function syncInBackground(): Promise<void> {
    await restore()
    if (!sheetId.value || !configured.value) return

    try {
      await requestToken(false)
    } catch {
      // 沒有有效授權就靜靜維持未同步狀態
      state.value = 'unauthorized'
      return
    }

    await sync(false)
  }

  /**
   * 以本機資料整份覆蓋雲端，不做合併。
   *
   * 用於本機資料才是正確版本的情況——例如剛用「取代全部」匯入了一批資料，
   * 這時走一般同步會把雲端的舊資料當成「只有雲端有」而拉回本機。
   */
  async function overwriteRemote(): Promise<void> {
    if (!sheetId.value) return

    state.value = 'syncing'
    error.value = ''

    try {
      await requestToken(true)
      await pushAll(sheetId.value)
      lastSyncedAt.value = (await getMeta<string>(META_KEYS.lastSyncedAt)) ?? null
      state.value = 'idle'
    } catch (e) {
      state.value = e instanceof AuthExpiredError ? 'unauthorized' : 'error'
      error.value = describeError(e)
    }
  }

  /** 以雲端資料整份覆蓋本機，不做合併 */
  async function overwriteLocal(): Promise<void> {
    if (!sheetId.value) return

    state.value = 'syncing'
    error.value = ''

    try {
      await requestToken(true)
      await pullAll(sheetId.value)
      lastSyncedAt.value = (await getMeta<string>(META_KEYS.lastSyncedAt)) ?? null

      const categoryStore = useCategoryStore()
      categoryStore.ready = false
      await categoryStore.init()
      await useRecordStore().reload()

      state.value = 'idle'
    } catch (e) {
      state.value = e instanceof AuthExpiredError ? 'unauthorized' : 'error'
      error.value = describeError(e)
    }
  }

  async function disconnect(): Promise<void> {
    await revoke()
    sheetId.value = null
    sheetTitle.value = ''
    lastSyncedAt.value = null
    lastResult.value = null
    state.value = 'idle'
    error.value = ''
    await setMeta(META_KEYS.sheetId, null)
    await setMeta(META_KEYS.lastSyncedAt, null)
  }

  return {
    sheetId, sheetTitle, lastSyncedAt, state, error, lastResult,
    configured, linked, authorized,
    available,
    restore, signInAndList, createAndLink, linkExisting,
    sync, syncInBackground, overwriteRemote, overwriteLocal, disconnect,
  }
})
