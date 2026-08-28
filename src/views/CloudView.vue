<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useCloudStore } from '@/stores/cloud'
import { useCategoryStore } from '@/stores/categories'
import { useRecordStore } from '@/stores/records'
import { formatRelative } from '@/utils/datetime'
import {
  exportJson, downloadJson, parseBackup, importBackup, InvalidBackupError,
} from '@/services/backup'
import type { ImportMode } from '@/services/backup'

const router = useRouter()
const cloud = useCloudStore()

const confirmDisconnect = ref(false)
const confirmOverwrite = ref(false)
const confirmImport = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const importMode = ref<ImportMode>('merge')
const pendingFile = ref<File | null>(null)
const message = ref('')
const busy = ref(false)

const statusText = computed(() => {
  if (!cloud.configured) return '尚未設定'
  if (!cloud.linked) return '未連結'
  if (cloud.state === 'syncing') return '同步中…'
  if (cloud.state === 'unauthorized') return '需要重新授權'
  if (cloud.state === 'error') return '同步失敗'
  return '已連結'
})

onMounted(() => cloud.restore())

async function connect() {
  message.value = ''
  try {
    await cloud.connect()
    message.value = '已建立私人試算表並上傳目前的資料'
  } catch {
    // 錯誤訊息由 store 的 error 顯示
  }
}

async function syncNow() {
  message.value = ''
  await cloud.sync(cloud.state === 'unauthorized')
  if (cloud.state === 'idle' && cloud.lastResult) {
    const { categories, records } = cloud.lastResult
    message.value =
      `同步完成：下載 ${categories.pulled + records.pulled} 筆，` +
      `上傳 ${categories.pushed + records.pushed} 筆`
    const ambiguous = categories.ambiguous + records.ambiguous
    if (ambiguous > 0) {
      message.value += `（${ambiguous} 筆版本相同但內容不一致，已保留兩邊未覆寫）`
    }
  }
}

async function overwriteRemote() {
  message.value = ''
  await cloud.overwriteRemote()
  if (cloud.state === 'idle') message.value = '已用本機資料覆蓋雲端'
}

async function doExport() {
  busy.value = true
  try {
    downloadJson(await exportJson())
    message.value = '已下載備份檔'
  } finally {
    busy.value = false
  }
}

function pickFile(mode: ImportMode) {
  importMode.value = mode
  fileInput.value?.click()
}

function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement
  pendingFile.value = input.files?.[0] ?? null
  input.value = '' // 讓同一個檔案可以再次選取
  if (pendingFile.value) confirmImport.value = true
}

async function doImport() {
  const file = pendingFile.value
  if (!file) return

  busy.value = true
  message.value = ''
  try {
    const backup = parseBackup(await file.text())
    const result = await importBackup(backup, importMode.value)
    await Promise.all([useCategoryStore().load(), useRecordStore().reload()])
    message.value = `已匯入 ${result.categories} 個類別、${result.records} 筆紀錄`
  } catch (e) {
    message.value = e instanceof InvalidBackupError ? e.message : '匯入失敗'
  } finally {
    busy.value = false
    pendingFile.value = null
  }
}
</script>

<template>
  <header class="head">
    <button class="back" type="button" @click="router.back()">‹ 返回</button>
    <h1 class="head__title">雲端同步</h1>
  </header>

  <section class="card">
    <div class="status">
      <span class="status__dot" :class="`is-${cloud.state}`" />
      <span class="status__text">{{ statusText }}</span>
    </div>

    <template v-if="!cloud.configured">
      <p class="note">
        這台裝置尚未設定 Google Client ID，雲端功能無法使用。
        本機資料與 JSON 備份不受影響，仍可正常使用。
      </p>
    </template>

    <template v-else-if="!cloud.linked">
      <p class="note">
        連結後會在你的 Google 雲端硬碟建立一份<strong>私人</strong>試算表，
        作為備份與跨裝置同步的來源。本 App 只能存取自己建立的這個檔案，
        看不到你雲端硬碟裡的其他內容。
      </p>
      <button class="btn btn--primary" type="button" :disabled="cloud.state === 'syncing'"
        @click="connect">
        使用 Google 登入並建立試算表
      </button>
    </template>

    <template v-else>
      <dl class="meta">
        <div><dt>試算表</dt><dd>{{ cloud.sheetTitle || '我的觀看紀錄' }}</dd></div>
        <div><dt>最後同步</dt><dd>{{ formatRelative(cloud.lastSyncedAt) }}</dd></div>
      </dl>

      <button class="btn btn--primary" type="button" :disabled="cloud.state === 'syncing'"
        @click="syncNow">
        {{ cloud.state === 'syncing' ? '同步中…' : '立即同步' }}
      </button>
      <button class="btn" type="button" :disabled="cloud.state === 'syncing'"
        @click="confirmOverwrite = true">
        以本機資料覆蓋雲端
      </button>
      <p class="hint">
        一般情況用「立即同步」即可。剛用「取代全部」匯入資料後，
        要改用這個把本機版本推上去，否則同步會把雲端的舊資料合併回來。
      </p>

      <button class="btn" type="button" @click="confirmDisconnect = true">解除 Google 綁定</button>
    </template>

    <p v-if="cloud.error" class="error">{{ cloud.error }}</p>
    <p v-if="message" class="success">{{ message }}</p>
  </section>

  <section class="card">
    <h2 class="card__title">本機備份</h2>
    <p class="note">
      不需要 Google 也能完整備份。即使雲端服務無法使用，這個檔案也能還原你的所有資料。
    </p>

    <button class="btn" type="button" :disabled="busy" @click="doExport">匯出 JSON</button>
    <button class="btn" type="button" :disabled="busy" @click="pickFile('merge')">
      匯入 JSON（合併）
    </button>
    <button class="btn btn--danger" type="button" :disabled="busy" @click="pickFile('replace')">
      匯入 JSON（取代全部）
    </button>

    <input
      ref="fileInput"
      class="hidden-input"
      type="file"
      accept="application/json,.json"
      @change="onFileChosen"
    />
  </section>

  <ConfirmDialog
    v-model="confirmOverwrite"
    title="以本機資料覆蓋雲端"
    message="雲端試算表的內容會被這台裝置上的資料完全取代。若其他裝置有尚未同步的變更，那些變更會遺失。"
    confirm-text="覆蓋雲端"
    danger
    @confirm="overwriteRemote"
  />

  <ConfirmDialog
    v-model="confirmDisconnect"
    title="解除 Google 綁定"
    message="本機資料會完整保留，雲端的試算表也不會被刪除。之後可以重新連結。"
    confirm-text="解除綁定"
    danger
    @confirm="cloud.disconnect()"
  />

  <ConfirmDialog
    v-model="confirmImport"
    :title="importMode === 'replace' ? '取代全部資料' : '合併匯入'"
    :message="importMode === 'replace'
      ? '目前裝置上的所有資料會被備份檔完全取代，這個動作無法復原。'
      : '備份檔中的資料會寫入本機，相同項目以備份檔為準，本機獨有的資料會保留。'"
    :confirm-text="importMode === 'replace' ? '取代' : '匯入'"
    :danger="importMode === 'replace'"
    @confirm="doImport"
  />
</template>

<style scoped>
.head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-4); }
.back { min-height: var(--touch); padding-right: var(--sp-1); color: var(--text-dim); font-weight: 600; }
.head__title { font-size: 20px; font-weight: 700; }

.card {
  padding: var(--sp-4);
  margin-bottom: var(--sp-4);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-lg);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.card__title { font-size: 15px; font-weight: 700; }

.status { display: flex; align-items: center; gap: var(--sp-2); }

.status__dot {
  width: 10px;
  height: 10px;
  border-radius: var(--r-full);
  background: var(--text-faint);
}

.status__dot.is-syncing { background: var(--warning); animation: blink 1s ease-in-out infinite; }
.status__dot.is-idle { background: var(--success); }
.status__dot.is-error { background: var(--danger); }
.status__dot.is-unauthorized { background: var(--warning); }

@keyframes blink { 50% { opacity: 0.3; } }

.status__text { font-weight: 700; }

.note { font-size: 13px; line-height: 1.6; color: var(--text-dim); }
.note strong { color: var(--text); }

.meta { display: flex; flex-direction: column; gap: var(--sp-2); }
.meta > div { display: flex; justify-content: space-between; gap: var(--sp-3); font-size: 14px; }
.meta dt { color: var(--text-faint); }
.meta dd { margin: 0; font-weight: 600; text-align: right; overflow: hidden; text-overflow: ellipsis; }

.btn {
  width: 100%;
  min-height: 52px;
  border-radius: var(--r-lg);
  background: var(--surface-2);
  font-weight: 700;
}

.btn:disabled { opacity: 0.45; }
.btn--primary { background: var(--gradient); color: #fff; }
.btn--danger {
  background: color-mix(in srgb, var(--danger) 14%, transparent);
  color: var(--danger);
  border: 1px solid color-mix(in srgb, var(--danger) 35%, transparent);
}

.error {
  font-size: 13px;
  color: var(--danger);
  padding: var(--sp-2) var(--sp-3);
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  border-radius: var(--r-md);
}

.success {
  font-size: 13px;
  color: var(--success);
  padding: var(--sp-2) var(--sp-3);
  background: color-mix(in srgb, var(--success) 12%, transparent);
  border-radius: var(--r-md);
}

.hint { font-size: 12px; line-height: 1.6; color: var(--text-faint); }

.hidden-input { display: none; }
</style>
