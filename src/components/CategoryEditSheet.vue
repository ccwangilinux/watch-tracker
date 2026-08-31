<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import BottomSheet from './BottomSheet.vue'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/palette'
import type { Category } from '@/types/models'
import type { CategoryInput } from '@/services/categories'

const open = defineModel<boolean>({ required: true })
const props = defineProps<{ category?: Category | null }>()
const emit = defineEmits<{ save: [input: CategoryInput] }>()

const name = ref('')
const icon = ref<string>(CATEGORY_ICONS[0])
const color = ref<string>(CATEGORY_COLORS[0])

const isEdit = computed(() => Boolean(props.category))
const canSave = computed(() => name.value.trim().length > 0)

// 每次開啟時重置為當前類別的值，避免殘留上一次編輯的內容
watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = props.category?.name ?? ''
  icon.value = props.category?.icon ?? CATEGORY_ICONS[0]
  color.value = props.category?.color ?? CATEGORY_COLORS[0]
})

function save() {
  if (!canSave.value) return
  emit('save', { name: name.value.trim(), icon: icon.value, color: color.value })
  open.value = false
}
</script>

<template>
  <BottomSheet v-model="open" :title="isEdit ? '修改類別' : '新增類別'">
    <div class="preview" :style="{ '--c': color }">
      <span class="preview__icon">{{ icon }}</span>
      <span class="preview__name">{{ name || '類別名稱' }}</span>
    </div>

    <label class="field">
      <span class="field__label">名稱</span>
      <input
        v-model="name"
        class="field__input"
        type="text"
        maxlength="20"
        placeholder="例如：韓劇"
        enterkeyhint="done"
        @keyup.enter="save"
      />
    </label>

    <div class="field">
      <span class="field__label">圖示</span>
      <div class="grid grid--icons">
        <button
          v-for="option in CATEGORY_ICONS"
          :key="option"
          class="chip"
          :class="{ 'is-active': icon === option }"
          type="button"
          @click="icon = option"
        >{{ option }}</button>
      </div>
    </div>

    <div class="field">
      <span class="field__label">顏色</span>
      <div class="grid grid--colors">
        <button
          v-for="option in CATEGORY_COLORS"
          :key="option"
          class="swatch"
          :class="{ 'is-active': color === option }"
          :style="{ '--c': option }"
          type="button"
          :aria-label="`顏色 ${option}`"
          @click="color = option"
        />
      </div>
    </div>

    <button class="save" type="button" :disabled="!canSave" @click="save">
      {{ isEdit ? '儲存' : '新增' }}
    </button>
  </BottomSheet>
</template>

<style scoped>
.preview {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  margin-bottom: var(--sp-5);
  background: var(--surface);
  border: 1px solid color-mix(in srgb, var(--c) 35%, transparent);
  border-radius: var(--r-lg);
}

.preview__icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  font-size: 22px;
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--c) 20%, transparent);
}

.preview__name { font-weight: 600; }

.field { display: block; margin-bottom: var(--sp-5); }

.field__label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-faint);
  margin-bottom: var(--sp-2);
}

.field__input {
  width: 100%;
  min-height: var(--touch);
  padding: 0 var(--sp-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--text);
}

.field__input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.grid { display: grid; gap: var(--sp-2); }
.grid--icons { grid-template-columns: repeat(8, 1fr); }
.grid--colors { grid-template-columns: repeat(6, 1fr); }

.chip {
  aspect-ratio: 1;
  min-height: 40px;
  display: grid;
  place-items: center;
  font-size: 20px;
  border-radius: var(--r-md);
  background: var(--surface);
  border: 1px solid transparent;
}

.chip.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.swatch {
  aspect-ratio: 1;
  min-height: 40px;
  border-radius: var(--r-md);
  background: var(--c);
  border: 2px solid transparent;
}

.swatch.is-active {
  border-color: var(--text);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 40%, transparent);
}

.save {
  width: 100%;
  min-height: 52px;
  border-radius: var(--r-lg);
  background: var(--gradient);
  color: var(--on-accent);
  font-weight: 700;
}

.save:disabled { opacity: 0.4; }
</style>
