<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import { useCloudStore } from '@/stores/cloud'
import { useCategoryStore } from '@/stores/categories'
import { useRecordStore } from '@/stores/records'
import { formatRelative, formatDateTime } from '@/utils/datetime'
import type { DriveFile } from '@/services/google/sheets'
import {
  exportJson, downloadJson, parseBackup, importBackup, InvalidBackupError,
} from '@/services/backup'
import type { ImportMode } from '@/services/backup'

const router = useRouter()
const cloud = useCloudStore()

const confirmDisconnect = ref(false)
const confirmOverwrite = ref(false)
const pickerOpen = ref(false)
const confirmPull = ref(false)
const confirmImport = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const importMode = ref<ImportMode>('merge')
const pendingFile = ref<File | null>(null)
const message = ref('')
const conflicts = ref<{ title: string; fields: string[] }[]>([])
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

async function startLink() {
  message.value = ''
  try {
    const files = await cloud.signInAndList()
    if (files.length === 0) {
      // 這個帳號還沒有本 App 的試算表，直接建立
      await cloud.createAndLink()
      message.value = '已建立私人試算表並上傳目前的資料'
    } else {
      // 已經有了就讓使用者選，避免第二台裝置又建立一份各自為政的檔案
      pickerOpen.value = true
    }
  } catch {
    // 錯誤訊息由 store 的 error 顯示
  }
}

async function chooseExisting(file: DriveFile) {
  pickerOpen.value = false
  message.value = ''
  await cloud.linkExisting(file)
  message.value = `已連結「${file.name}」。確認無誤後再按「立即同步」`
}

async function createNew() {
  pickerOpen.value = false
  message.value = ''
  await cloud.createAndLink()
  if (cloud.state === 'idle') message.value = '已建立新的試算表並上傳目前的資料'
}

async function syncNow() {
  message.value = ''
  await cloud.sync(cloud.state === 'unauthorized')
  if (cloud.state === 'idle' && cloud.lastResult) {
    const { categories, records } = cloud.lastResult
    message.value =
      `同步完成：下載 ${categories.pulled + records.pulled} 筆，` +
      `上傳 ${categories.pushed + records.pushed} 筆`
    conflicts.value = cloud.lastResult.conflicts
    if (conflicts.value.length > 0) {
      message.value += `。有 ${conflicts.value.length} 筆兩邊修改時間相同但內容不同，` +
        '為避免誤刪資料，這些沒有被覆寫'
    }
  }
}

async function overwriteLocal() {
  message.value = ''
  await cloud.overwriteLocal()
  if (cloud.state === 'idle') message.value = '已用雲端資料覆蓋本機'
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
    <button class="help" type="button" aria-label="設定說明"
      @click="router.push('/settings/cloud-guide')">?</button>
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
        @click="startLink">
        使用 Google 登入
      </button>
    </template>

    <template v-else>
      <dl class="meta">
        <div><dt>試算表</dt><dd>{{ cloud.sheetTitle || '我的觀看紀錄' }}</dd></div>
        <div><dt>檔案 ID</dt><dd class="meta__id">{{ cloud.sheetId }}</dd></div>
        <div><dt>最後同步</dt><dd>{{ formatRelative(cloud.lastSyncedAt) }}</dd></div>
      </dl>

      <button class="btn btn--primary" type="button" :disabled="cloud.state === 'syncing'"
        @click="syncNow">
        {{ cloud.state === 'syncing' ? '同步中…' : '立即同步' }}
      </button>
      <label class="switch">
        <span>
          啟動時自動同步
          <small>關閉時完全由你按下「立即同步」才會與雲端交換資料</small>
        </span>
        <input
          type="checkbox"
          :checked="cloud.autoSync"
          @change="cloud.setAutoSync(($event.target as HTMLInputElement).checked)"
        />
      </label>

      <button class="btn" type="button" :disabled="cloud.state === 'syncing'"
        @click="startLink">
        更換連結的試算表
      </button>
      <p class="hint">
        多台裝置必須連到<strong>同一份</strong>試算表才會互相同步。
        比對上方的檔案 ID，若與其他裝置不同，用這個切換過去。
      </p>

      <button class="btn" type="button" :disabled="cloud.state === 'syncing'"
        @click="confirmPull = true">
        以雲端資料覆蓋本機
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

    <div v-if="conflicts.length" class="conflicts">
      <p class="conflicts__title">無法自動判定的項目</p>
      <ul>
        <li v-for="(item, i) in conflicts.slice(0, 8)" :key="i">
          {{ item.title }}
          <span class="conflicts__fields">{{ item.fields.join('、') }}</span>
        </li>
      </ul>
      <p v-if="conflicts.length > 8" class="conflicts__more">
        還有 {{ conflicts.length - 8 }} 筆
      </p>
      <p class="conflicts__help">
        用下方的「以雲端覆蓋本機」或「以本機覆蓋雲端」明確指定要以哪一邊為準。
      </p>
    </div>
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

  <BottomSheet v-model="pickerOpen" title="選擇要連結的試算表">
    <p class="note">
      這個 Google 帳號底下已經有本 App 建立的試算表。
      <strong>若要與其他裝置共用同一份資料，請選擇既有的那份</strong>，
      不要建立新的——每份試算表都是獨立的，不會互相同步。
    </p>

    <ul class="files">
      <li v-for="file in cloud.available" :key="file.id">
        <button
          class="file"
          :class="{ 'is-current': file.id === cloud.sheetId }"
          type="button"
          @click="chooseExisting(file)"
        >
          <span class="file__name">
            {{ file.name }}
            <span v-if="file.id === cloud.sheetId" class="file__badge">目前連結中</span>
          </span>
          <span class="file__time">
            建立於 {{ formatDateTime(file.createdTime ?? null) }}
          </span>
          <span class="file__id">{{ file.id }}</span>
        </button>
      </li>
    </ul>

    <button class="btn" type="button" @click="createNew">建立另一份新的試算表</button>
  </BottomSheet>

  <ConfirmDialog
    v-model="confirmPull"
    title="以雲端資料覆蓋本機"
    message="這台裝置上的資料會被雲端試算表的內容完全取代。若本機有尚未同步的變更，那些變更會遺失。"
    confirm-text="覆蓋本機"
    danger
    @confirm="overwriteLocal"
  />

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
.head__title { flex: 1 1 auto; font-size: 20px; font-weight: 700; }

.help {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  font-weight: 700;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: var(--r-full);
}

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

.meta__id {
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--text-faint);
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.files { display: flex; flex-direction: column; gap: var(--sp-2); margin: var(--sp-4) 0; }

.file {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  min-height: 56px;
  padding: var(--sp-2) var(--sp-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  text-align: left;
}

.file:active { border-color: var(--accent); background: var(--accent-soft); }
.file.is-current { border-color: var(--accent); background: var(--accent-soft); }

.file__name { font-weight: 600; display: flex; align-items: center; gap: var(--sp-2); }

.file__badge {
  padding: 1px var(--sp-2);
  font-size: 10px;
  font-weight: 700;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  border-radius: var(--r-full);
}

.file__time { font-size: 12px; color: var(--text-faint); }

.file__id {
  font-size: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--text-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  min-height: 52px;
  padding: var(--sp-2) var(--sp-3);
  background: var(--surface-2);
  border-radius: var(--r-md);
  font-size: 14px;
  font-weight: 600;
}

.switch small {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--text-faint);
}

.switch input {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  accent-color: var(--accent);
}

.conflicts {
  padding: var(--sp-3);
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
  border-radius: var(--r-md);
  font-size: 12px;
}

.conflicts__title { font-weight: 700; color: var(--warning); margin-bottom: var(--sp-2); }
.conflicts li { padding: 2px 0; color: var(--text-dim); }
.conflicts__fields { color: var(--text-faint); margin-left: var(--sp-2); }
.conflicts__more { margin-top: var(--sp-1); color: var(--text-faint); }
.conflicts__help { margin-top: var(--sp-2); color: var(--text-faint); line-height: 1.6; }

.hidden-input { display: none; }
</style>
