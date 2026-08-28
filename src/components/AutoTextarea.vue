<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'

/**
 * 高度隨內容自動增長的輸入框。
 *
 * 片名可能很長（資料中有超過 50 字的），用單行 input 只能看到一小段，
 * 改不了也認不出改的是哪一筆。這裡用 textarea 撐開高度，
 * 但把它當單行欄位用——攔掉 Enter、貼上時把換行轉成空格。
 */
const model = defineModel<string>({ required: true })

type EnterKeyHint = 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'

withDefaults(
  defineProps<{ placeholder?: string; maxlength?: number; enterkeyhint?: EnterKeyHint }>(),
  { placeholder: '', maxlength: 200, enterkeyhint: 'done' },
)

const emit = defineEmits<{ submit: [] }>()

const el = ref<HTMLTextAreaElement | null>(null)

function resize() {
  const node = el.value
  if (!node) return
  // 先歸零才量得到縮小後的正確高度，否則刪字時高度不會回收
  node.style.height = 'auto'
  node.style.height = `${node.scrollHeight}px`
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter') return
  event.preventDefault()
  el.value?.blur()
  emit('submit')
}

function onInput() {
  // 貼上的內容可能含換行，片名不該有
  if (model.value.includes('\n')) {
    model.value = model.value.replace(/\s*\n+\s*/g, ' ')
  }
  resize()
}

watch(model, () => nextTick(resize))
onMounted(() => nextTick(resize))
</script>

<template>
  <textarea
    ref="el"
    v-model="model"
    class="auto"
    rows="1"
    :placeholder="placeholder"
    :maxlength="maxlength"
    :enterkeyhint="enterkeyhint"
    autocomplete="off"
    @input="onInput"
    @keydown="onKeydown"
  />
</template>

<style scoped>
.auto {
  display: block;
  width: 100%;
  min-height: 52px;
  padding: 14px var(--sp-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  color: var(--text);
  line-height: 1.5;
  resize: none;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.auto:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.auto::placeholder { color: var(--text-faint); }
</style>
