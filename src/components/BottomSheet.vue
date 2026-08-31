<script setup lang="ts">
import { watch, onUnmounted } from 'vue'

const open = defineModel<boolean>({ required: true })
defineProps<{ title?: string }>()

/**
 * 開啟時鎖住背景捲動。iOS Safari 對 body overflow:hidden 的支援不完整，
 * 但配合 sheet 自身的 overscroll-behavior: contain 已足以避免捲動穿透。
 */
watch(open, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="backdrop" @click.self="open = false">
        <div class="sheet" role="dialog" aria-modal="true">
          <div class="sheet__grip" aria-hidden="true" />
          <header v-if="title" class="sheet__head">
            <h2 class="sheet__title">{{ title }}</h2>
            <button class="sheet__close" type="button" aria-label="關閉" @click="open = false">
              ✕
            </button>
          </header>
          <div class="sheet__body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: var(--scrim);
  backdrop-filter: blur(2px);
}

.sheet {
  width: 100%;
  max-width: 560px;
  max-height: 85dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border-radius: var(--r-xl) var(--r-xl) 0 0;
  border-top: 1px solid var(--border);
  padding-bottom: var(--safe-bottom);
}

.sheet__grip {
  width: 36px;
  height: 4px;
  margin: var(--sp-3) auto var(--sp-1);
  border-radius: var(--r-full);
  background: var(--surface-3);
}

.sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-2) var(--sp-4) var(--sp-3);
}

.sheet__title { font-size: 17px; font-weight: 700; }

.sheet__close {
  width: var(--touch);
  height: var(--touch);
  display: grid;
  place-items: center;
  margin-right: calc(var(--sp-2) * -1);
  color: var(--text-dim);
  border-radius: var(--r-full);
}

.sheet__body {
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 0 var(--sp-4) var(--sp-5);
}

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.2s var(--ease); }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform 0.25s var(--ease); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }
</style>
