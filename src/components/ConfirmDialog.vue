<script setup lang="ts">
const open = defineModel<boolean>({ required: true })

withDefaults(
  defineProps<{
    title: string
    message?: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
  }>(),
  { confirmText: '確定', cancelText: '取消', danger: false },
)

const emit = defineEmits<{ confirm: [] }>()

function onConfirm() {
  open.value = false
  emit('confirm')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="backdrop" @click.self="open = false">
        <div class="dialog" role="alertdialog" aria-modal="true">
          <h2 class="dialog__title">{{ title }}</h2>
          <p v-if="message" class="dialog__message">{{ message }}</p>
          <div class="dialog__actions">
            <button class="btn" type="button" @click="open = false">{{ cancelText }}</button>
            <button
              class="btn"
              :class="danger ? 'btn--danger' : 'btn--primary'"
              type="button"
              @click="onConfirm"
            >{{ confirmText }}</button>
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
  z-index: 300;
  display: grid;
  place-items: center;
  padding: var(--sp-5);
  background: var(--scrim);
}

.dialog {
  width: 100%;
  max-width: 340px;
  padding: var(--sp-5);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-card);
}

.dialog__title { font-size: 17px; font-weight: 700; margin-bottom: var(--sp-2); }
.dialog__message { font-size: 14px; color: var(--text-dim); margin-bottom: var(--sp-5); }

.dialog__actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); }

.btn {
  min-height: var(--touch);
  border-radius: var(--r-md);
  background: var(--surface-2);
  font-weight: 600;
}

.btn--primary { background: var(--accent); color: #fff; }
.btn--danger { background: var(--danger); color: #fff; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s var(--ease); }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
