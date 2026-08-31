<script setup lang="ts">
import { ref } from 'vue'
import { isSpeechSupported, createRecognition } from '@/utils/speech'

const model = defineModel<string>({ required: true })

const listening = ref(false)
/**
 * 規格第 10 節：iOS Safari 不支援 Web Speech API 時必須隱藏語音鍵，
 * 不能留下按了沒反應的按鈕，也不能影響一般文字搜尋。
 */
const speechAvailable = isSpeechSupported()

function startVoice() {
  const recognition = createRecognition()
  if (!recognition) return

  listening.value = true
  recognition.onresult = (event) => {
    model.value = event.results[0]?.[0]?.transcript ?? model.value
  }
  recognition.onerror = () => { listening.value = false }
  recognition.onend = () => { listening.value = false }
  recognition.start()
}
</script>

<template>
  <div class="search">
    <span class="search__icon" aria-hidden="true">🔍</span>
    <input
      v-model="model"
      class="search__input"
      type="search"
      inputmode="search"
      enterkeyhint="search"
      placeholder="搜尋片名 / 關鍵字"
      aria-label="搜尋觀看紀錄"
    />
    <button
      v-if="model"
      class="search__btn"
      type="button"
      aria-label="清除搜尋"
      @click="model = ''"
    >✕</button>
    <button
      v-if="speechAvailable"
      class="search__btn search__btn--mic"
      :class="{ 'is-listening': listening }"
      type="button"
      aria-label="語音輸入"
      @click="startVoice"
    >🎤</button>
  </div>
</template>

<style scoped>
.search {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  height: var(--touch);
  padding: 0 var(--sp-2) 0 var(--sp-3);
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-full);
}

.search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.search__icon { font-size: 15px; opacity: 0.7; }

.search__input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  background: none;
  border: none;
  color: var(--text);
  /* 字級 16px 由 base.css 統一設定，低於此值 iOS 聚焦時會放大整頁 */
}

.search__input::placeholder { color: var(--text-faint); }
.search__input:focus { outline: none; }

/* iOS Safari 的 type=search 原生清除鍵樣式不受控，隱藏後用自訂按鈕 */
.search__input::-webkit-search-cancel-button { -webkit-appearance: none; }

.search__btn {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: var(--r-full);
  font-size: 14px;
  color: var(--text-dim);
  background: var(--surface-2);
}

.search__btn--mic { font-size: 15px; }

.search__btn--mic.is-listening {
  background: var(--accent);
  color: var(--on-accent);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
</style>
