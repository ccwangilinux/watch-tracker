<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Stepper from '@/components/Stepper.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import SeasonPicker from '@/components/SeasonPicker.vue'
import DurationPicker from '@/components/DurationPicker.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useRecordStore } from '@/stores/records'
import { useCategoryStore } from '@/stores/categories'
import { formatWatchTime } from '@/utils/time'
import { formatSeason } from '@/utils/season'

const props = defineProps<{ recordId?: string; categoryId?: string }>()

const router = useRouter()
const recordStore = useRecordStore()
const categoryStore = useCategoryStore()

const isEdit = computed(() => Boolean(props.recordId))

const title = ref('')
const season = ref(1)
const episode = ref(1)
const watchTime = ref(0)
const completed = ref(false)
const note = ref('')
const resolvedCategoryId = ref(props.categoryId ?? '')

const seasonSheet = ref(false)
const timeSheet = ref(false)
const confirmDelete = ref(false)
const loaded = ref(false)

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
    completed.value = record.completed
    note.value = record.note
    resolvedCategoryId.value = record.categoryId
  }
  loaded.value = true
})

async function save() {
  if (!canSave.value) return

  const payload = {
    categoryId: resolvedCategoryId.value,
    title: title.value.trim(),
    season: season.value,
    episode: episode.value,
    watchTime: watchTime.value,
    completed: completed.value,
    note: note.value.trim(),
  }

  if (props.recordId) await recordStore.update(props.recordId, payload)
  else await recordStore.create(payload)

  router.push(`/c/${resolvedCategoryId.value}`)
}

async function doDelete() {
  if (!props.recordId) return
  const backTo = resolvedCategoryId.value
  await recordStore.remove(props.recordId)
  router.push(`/c/${backTo}`)
}
</script>

<template>
  <header class="head">
    <button class="back" type="button" @click="router.back()">‹ 取消</button>
    <h1 class="head__title">{{ isEdit ? '修改紀錄' : '新增紀錄' }}</h1>
  </header>

  <p v-if="category" class="context">
    <span class="context__icon" :style="{ '--c': category.color }">{{ category.icon }}</span>
    {{ category.name }}
  </p>

  <form v-if="loaded" class="form" @submit.prevent="save">
    <label class="field">
      <span class="field__label">片名 <em>必填</em></span>
      <input
        v-model="title"
        class="field__input"
        type="text"
        maxlength="100"
        placeholder="例如：淚之女王"
        enterkeyhint="done"
        autocomplete="off"
      />
    </label>

    <div class="field">
      <span class="field__label">第幾集</span>
      <Stepper v-model="episode" :min="0" :max="9999" />
    </div>

    <div class="field">
      <span class="field__label">第幾季</span>
      <button class="picker" type="button" @click="seasonSheet = true">
        <span class="picker__value">{{ formatSeason(season) }}</span>
        <span class="picker__hint">選擇 ›</span>
      </button>
    </div>

    <div class="field">
      <span class="field__label">觀看時間</span>
      <button class="picker" type="button" @click="timeSheet = true">
        <span class="picker__value picker__value--time">{{ formatWatchTime(watchTime) }}</span>
        <span class="picker__hint">選擇 ›</span>
      </button>
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

    <div class="actions">
      <button class="btn btn--primary" type="submit" :disabled="!canSave">
        {{ isEdit ? '儲存' : '新增' }}
      </button>
      <button v-if="isEdit" class="btn btn--danger" type="button" @click="confirmDelete = true">
        刪除這筆紀錄
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

.picker__value { font-size: 17px; font-weight: 600; }
.picker__value--time { font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }
.picker__hint { font-size: 13px; color: var(--text-faint); }

.actions { display: flex; flex-direction: column; gap: var(--sp-3); margin-top: var(--sp-2); }

.btn {
  width: 100%;
  min-height: 54px;
  border-radius: var(--r-lg);
  font-weight: 700;
}

.btn--primary { background: var(--gradient); color: #fff; box-shadow: var(--shadow-fab); }
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
  color: #fff;
  font-weight: 700;
}
</style>
