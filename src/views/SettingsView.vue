<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import SortSheet from '@/components/SortSheet.vue'
import { useUiStore } from '@/stores/ui'
import { useCloudStore } from '@/stores/cloud'
import { useCategoryStore } from '@/stores/categories'
import { useRecordStore } from '@/stores/records'
import { SORT_OPTIONS } from '@/services/records'
import { formatRelative } from '@/utils/datetime'
import { db } from '@/db'

const router = useRouter()
const cloud = useCloudStore()
const { sortKey, sortDirection } = storeToRefs(useUiStore())

const sortOpen = ref(false)
const confirmClear = ref(false)

onMounted(() => cloud.restore())

function sortLabel(): string {
  const label = SORT_OPTIONS.find((o) => o.key === sortKey.value)?.label ?? '最後修改時間'
  return `${label} ${sortDirection.value === 'asc' ? '↑' : '↓'}`
}

/**
 * 清除全部資料（規格第 26 節要求二次確認）。
 * 連同 meta 一起清空，讓 App 回到全新安裝的狀態並重新寫入預設類別。
 */
async function clearAll() {
  await db.transaction('rw', db.categories, db.watchRecords, db.meta, async () => {
    await db.categories.clear()
    await db.watchRecords.clear()
    await db.meta.clear()
  })

  const categoryStore = useCategoryStore()
  categoryStore.ready = false
  await categoryStore.init()
  await useRecordStore().reload()

  router.push('/')
}
</script>

<template>
  <header class="head">
    <button class="back" type="button" @click="router.push('/')">‹ 首頁</button>
    <h1 class="head__title">設定</h1>
  </header>

  <section class="group">
    <h2 class="group__title">外觀</h2>
    <div class="row row--static">
      <span>主題</span>
      <span class="row__value">深色</span>
    </div>
    <p class="hint">目前僅提供深色模式，淺色模式已預留於樣式層，未來可再開啟。</p>
  </section>

  <section class="group">
    <h2 class="group__title">類別</h2>
    <button class="row" type="button" @click="router.push('/settings/categories')">
      <span>類別管理</span>
      <span class="row__value">新增 · 修改 · 刪除 · 排序 ›</span>
    </button>
  </section>

  <section class="group">
    <h2 class="group__title">顯示</h2>
    <button class="row" type="button" @click="sortOpen = true">
      <span>預設排序</span>
      <span class="row__value">{{ sortLabel() }} ›</span>
    </button>
  </section>

  <section class="group">
    <h2 class="group__title">雲端與備份</h2>
    <button class="row" type="button" @click="router.push('/settings/cloud')">
      <span>Google 雲端同步</span>
      <span class="row__value">
        {{ cloud.linked ? formatRelative(cloud.lastSyncedAt) : '未連結' }} ›
      </span>
    </button>
    <button class="row" type="button" @click="router.push('/settings/cloud')">
      <span>JSON 匯出 / 匯入</span>
      <span class="row__value">›</span>
    </button>
  </section>

  <section class="group">
    <h2 class="group__title">資料</h2>
    <button class="row row--danger" type="button" @click="confirmClear = true">
      <span>清除全部資料</span>
      <span class="row__value">›</span>
    </button>
    <p class="hint">
      會刪除這台裝置上的所有類別與觀看紀錄。若已連結雲端，試算表中的資料不會被刪除。
    </p>
  </section>

  <section class="group">
    <h2 class="group__title">關於</h2>
    <div class="row row--static">
      <span>我的觀看紀錄</span>
      <span class="row__value">Watch Tracker</span>
    </div>
    <p class="hint">追劇不忘，記錄精彩時刻</p>
  </section>

  <SortSheet v-model="sortOpen" v-model:sort-key="sortKey" v-model:sort-direction="sortDirection" />

  <ConfirmDialog
    v-model="confirmClear"
    title="清除全部資料"
    message="這台裝置上的所有類別與觀看紀錄都會被刪除，且無法復原。建議先匯出 JSON 備份。"
    confirm-text="全部清除"
    danger
    @confirm="clearAll"
  />
</template>

<style scoped>
.head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-4); }
.back { min-height: var(--touch); padding-right: var(--sp-1); color: var(--text-dim); font-weight: 600; }
.head__title { font-size: 20px; font-weight: 700; }

.group { margin-bottom: var(--sp-6); }

.group__title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  margin-bottom: var(--sp-2);
  padding-left: var(--sp-1);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  width: 100%;
  min-height: 56px;
  padding: 0 var(--sp-4);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-lg);
  margin-bottom: var(--sp-2);
  font-weight: 600;
  text-align: left;
}

.row--static { cursor: default; }
.row--danger { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 30%, transparent); }

.row__value {
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-faint);
}

.hint { font-size: 12px; line-height: 1.6; color: var(--text-faint); padding: 0 var(--sp-1); }
</style>
