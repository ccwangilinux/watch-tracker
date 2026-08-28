import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getMeta, setMeta, META_KEYS } from '@/services/meta'
import { isConfigured, requestToken, revoke, hasToken } from '@/services/google/auth'
import { createSpreadsheet, getSpreadsheetTitle, AuthExpiredError } from '@/services/google/sheets'
import { runSync, pushAll } from '@/services/sync'
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

  /** 首次連結：登入 → 建立私人試算表 → 把本機資料整份推上去 */
  async function connect(): Promise<void> {
    state.value = 'syncing'
    error.value = ''

    try {
      // 必須在使用者點擊的事件流程中呼叫，否則 popup 會被 Safari 攔截
      await requestToken(true)

      const id = await createSpreadsheet('我的觀看紀錄 — Watch Tracker')
      await pushAll(id)

      sheetId.value = id
      sheetTitle.value = await getSpreadsheetTitle(id)
      await setMeta(META_KEYS.sheetId, id)
      lastSyncedAt.value = (await getMeta<string>(META_KEYS.lastSyncedAt)) ?? null

      state.value = 'idle'
    } catch (e) {
      state.value = 'error'
      error.value = describeError(e)
      throw e
    }
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
    restore, connect, sync, syncInBackground, disconnect,
  }
})
