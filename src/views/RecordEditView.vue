<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AutoTextarea from '@/components/AutoTextarea.vue'
import Stepper from '@/components/Stepper.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import StatusPicker from '@/components/StatusPicker.vue'
import SeasonPicker from '@/components/SeasonPicker.vue'
import DurationPicker from '@/components/DurationPicker.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useRecordStore } from '@/stores/records'
import { useCategoryStore } from '@/stores/categories'
import { formatWatchTime } from '@/utils/time'
import { formatDateTime } from '@/utils/datetime'
import { formatSeason, hasSeason, SEASON_UNSET } from '@/utils/season'
import type { WatchStatus } from '@/types/models'

const props = defineProps<{ recordId?: string; categoryId?: string }>()

const router = useRouter()
const recordStore = useRecordStore()
const categoryStore = useCategoryStore()

const isEdit = computed(() => Boolean(props.recordId))

const title = ref('')
/*
 * 新紀錄一律不預填季集：季數空白、集數 0。
 * 舊的預設值（第一季第 1 集）等於幫使用者先猜一個答案，
 * 只是剛新增就看到「第 1 集」，分不出是真的看了一集還是還沒開始。
 */
const season = ref(SEASON_UNSET)
const episode = ref(0)
const watchTime = ref(0)
const status = ref<WatchStatus | null>(null)
const completed = ref(false)
const note = ref('')
const resolvedCategoryId = ref(props.categoryId ?? '')

const seasonSheet = ref(false)
const timeSheet = ref(false)
const confirmDelete = ref(false)
const loaded = ref(false)
// 同步問題多半要靠兩台裝置比對這個值才查得出來
const updatedAt = ref<string | null>(null)
const createdAt = ref<string | null>(null)

const canSave = computed(() => title.value.trim().length > 0 && resolvedCategoryId.value !== '')
const category = computed(() =>
  categoryStore.items.find((c) => c.id === resolvedCategoryId.value),
)

onMounted(async () => {
  if (props.recordId) {
    const record = await recordStore.get(props.recordId)
    if (!record) {
      // 紀錄可能已在別的分頁刪除，直接退回而不是顯示空表單
      router.replace('/')
      return
    }
    title.value = record.title
    season.value = record.season
    episode.value = record.episode
    watchTime.value = record.watchTime
    status.value = record.status
    completed.value = record.completed
    note.value = record.note
    resolvedCategoryId.value = record.categoryId
    updatedAt.value = record.updatedAt
    createdAt.value = record.createdAt
  }
  loaded.value = true
})

/**
 * 離開編輯頁。
 *
 * 用 back 而不是 push：push 會建立新的歷史紀錄，
 * 瀏覽器就沒有 savedPosition 可還原，回到列表時會跳回最頂端。
 * 直接開啟網址進來（沒有上一頁）時才退回 fallback。
 */
function leave(fallback: string) {
  if (window.history.state?.back) router.back()
  else router.replace(fallback)
}

async function save() {
  if (!canSave.value) return

  const payload = {
    categoryId: resolvedCategoryId.value,
    title: title.value.trim(),
    season: season.value,
    episode: episode.value,
    watchTime: watchTime.value,
    status: status.value,
    completed: completed.value,
    note: note.value.trim(),
  }

  if (props.recordId) await recordStore.update(props.recordId, payload)
  else await recordStore.create(payload)

  leave(`/c/${resolvedCategoryId.value}`)
}

async function doDelete() {
  if (!props.recordId) return
  const backTo = resolvedCategoryId.value
  await recordStore.remove(props.recordId)
  leave(`/c/${backTo}`)
}
</script>

<template>
  <header class="head">
    <button class="back" type="button" @click="leave('/')">‹ 取消</button>
    <h1 class="head__title">{{ isEdit ? '修改紀錄' : '新增紀錄' }}</h1>
  </header>

  <p v-if="category" class="context">
    <span class="context__icon" :style="{ '--c': category.color }">{{ category.icon }}</span>
    {{ category.name }}
  </p>

  <form v-if="loaded" class="form" @submit.prevent="save">
    <label class="field">
      <span class="field__label">片名 <em>必填</em></span>
      <AutoTextarea
        v-model="title"
        :maxlength="200"
        placeholder="例如：淚之女王"
        @submit="save"
      />
    </label>

    <div class="field field--episode">
      <span class="field__label">第幾集</span>
      <Stepper v-model="episode" :min="0" :max="9999" />
    </div>

    <div class="field">
      <span class="field__label">第幾季</span>
      <button class="picker" type="button" @click="seasonSheet = true">
        <span
          class="picker__value picker__value--season"
          :class="{ 'picker__value--empty': !hasSeason(season) }"
        >{{ formatSeason(season) }}</span>
        <span class="picker__hint">選擇 ›</span>
      </button>
    </div>

    <div class="field">
      <span class="field__label">觀看時間</span>
      <!-- 歸零與選擇並排：每季看完就重新計時，是和「選擇時間」一樣頻繁的操作 -->
      <div class="time-row">
        <button class="picker picker--grow" type="button" @click="timeSheet = true">
          <span class="picker__value picker__value--time">{{ formatWatchTime(watchTime) }}</span>
          <span class="picker__hint">選擇 ›</span>
        </button>
        <button
          class="time-reset"
          type="button"
          :disabled="watchTime === 0"
          @click="watchTime = 0"
        >歸零</button>
      </div>
      <p class="field__hint">新的一季可按「歸零」重新計算，按下儲存才會生效</p>
    </div>

    <div class="field">
      <span class="field__label">觀看狀態 <em class="optional">選填</em></span>
      <StatusPicker v-model="status" />
      <p class="field__hint">點選已選中的項目可取消標記</p>
    </div>

    <div class="field">
      <span class="field__label">是否完結</span>
      <ToggleSwitch v-model="completed" on-label="已完結" off-label="未完結" />
    </div>

    <label class="field">
      <span class="field__label">備註</span>
      <textarea
        v-model="note"
        class="field__input field__input--area"
        rows="3"
        maxlength="500"
        placeholder="選填"
      />
    </label>

    <dl v-if="isEdit" class="stamps">
      <div><dt>最後修改</dt><dd>{{ formatDateTime(updatedAt) }}</dd></div>
      <div><dt>建立時間</dt><dd>{{ formatDateTime(createdAt) }}</dd></div>
    </dl>

    <!-- 刪除不放進固定列：一個誤觸就刪資料的按鈕不該一直停在拇指下 -->
    <button v-if="isEdit" class="btn btn--danger" type="button" @click="confirmDelete = true">
      刪除這筆紀錄
    </button>

    <div class="save-bar">
      <button class="btn btn--primary" type="submit" :disabled="!canSave">
        {{ isEdit ? '儲存' : '新增' }}
      </button>
    </div>
  </form>

  <BottomSheet v-model="seasonSheet" title="選擇季數">
    <SeasonPicker v-model="season" />
    <button class="sheet-done" type="button" @click="seasonSheet = false">確定</button>
  </BottomSheet>

  <BottomSheet v-model="timeSheet" title="選擇觀看時間">
    <DurationPicker v-model="watchTime" />
    <button class="sheet-done" type="button" @click="timeSheet = false">確定</button>
  </BottomSheet>

  <ConfirmDialog
    v-model="confirmDelete"
    title="刪除紀錄"
    :message="`確定要刪除「${title}」嗎？`"
    confirm-text="刪除"
    danger
    @confirm="doDelete"
  />
</template>

<style scoped>
.head { display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-2); }
.back { min-height: var(--touch); padding-right: var(--sp-1); color: var(--text-dim); font-weight: 600; }
.head__title { font-size: 20px; font-weight: 700; }

.context {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-5);
  font-size: 14px;
  color: var(--text-dim);
}

.context__icon {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  font-size: 14px;
  border-radius: var(--r-sm);
  background: color-mix(in srgb, var(--c) 20%, transparent);
}

.form { display: flex; flex-direction: column; gap: var(--sp-5); }

.field { display: block; }

.field__label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-faint);
  margin-bottom: var(--sp-2);
}

.field__label em { font-style: normal; color: var(--accent-2); margin-left: var(--sp-1); }
.field__label em.optional { color: var(--text-faint); font-weight: 400; }

.field__hint { margin-top: var(--sp-2); font-size: 12px; color: var(--text-faint); }

.field__input {
  width: 100%;
  min-height: 52px;
  padding: var(--sp-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  color: var(--text);
}

.field__input--area { min-height: 88px; resize: vertical; line-height: 1.5; }

.field__input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 56px;
  padding: 0 var(--sp-4);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-lg);
}

.time-row { display: flex; align-items: stretch; gap: var(--sp-2); }
.picker--grow { flex: 1; min-width: 0; }

.time-reset {
  flex: 0 0 auto;
  min-height: 56px;
  padding: 0 var(--sp-4);
  font-size: 15px;
  font-weight: 600;
  color: var(--text-dim);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-lg);
}

/* 已經是 0 就沒有東西可歸零，留著能按只會讓人以為按了沒反應 */
.time-reset:disabled { opacity: 0.4; }

.picker__value { font-size: 17px; font-weight: 600; }

/* 與列表上的標籤同色，兩處才對得起來 */
.picker__value--season { color: var(--season); }
/* 未設定不套用季數色，否則看起來像已經填了值 */
.picker__value--empty { color: var(--text-faint); font-weight: 500; }
.picker__value--time {
  color: var(--watched);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.field--episode :deep(.stepper__input) { color: var(--episode); }
.picker__hint { font-size: 13px; color: var(--text-faint); }

.stamps {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  padding: var(--sp-3);
  background: var(--surface);
  border-radius: var(--r-md);
  font-size: 12px;
}

.stamps > div { display: flex; justify-content: space-between; gap: var(--sp-3); }
.stamps dt { color: var(--text-faint); }
.stamps dd { margin: 0; color: var(--text-dim); font-variant-numeric: tabular-nums; }

/*
 * 儲存固定在畫面底部：表單比一個螢幕長，改個集數也要滑到最底才存得到。
 *
 * 用 sticky 而不是 fixed：fixed 在 iOS 鍵盤彈出時會抖動錯位，
 * 而且 sticky 仍留在版面流程裡，捲到最下方時它就停在自己原本的位置，
 * 不會蓋住備註或時間戳。
 */
.save-bar {
  position: sticky;
  bottom: 0;
  z-index: 20;
  /* 背景延伸到容器左右邊緣，捲動中的內容才不會從縫隙透出來 */
  margin-left: calc((var(--sp-4) + var(--safe-left)) * -1);
  margin-right: calc((var(--sp-4) + var(--safe-right)) * -1);
  padding: var(--sp-3) calc(var(--sp-4) + var(--safe-right))
           calc(var(--sp-3) + var(--safe-bottom)) calc(var(--sp-4) + var(--safe-left));
  background: var(--bg);
}

.btn {
  width: 100%;
  min-height: 54px;
  border-radius: var(--r-lg);
  font-weight: 700;
}

.btn--primary { background: var(--gradient); color: var(--on-accent); box-shadow: var(--shadow-fab); }
.btn--primary:disabled { opacity: 0.4; box-shadow: none; }

.btn--danger {
  background: color-mix(in srgb, var(--danger) 14%, transparent);
  color: var(--danger);
  border: 1px solid color-mix(in srgb, var(--danger) 35%, transparent);
}

.sheet-done {
  width: 100%;
  min-height: 52px;
  margin-top: var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
}
</style>
