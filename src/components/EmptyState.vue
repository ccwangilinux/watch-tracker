<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  message?: string
}>()
</script>

<template>
  <div class="empty">
    <span class="empty__icon" aria-hidden="true">{{ icon }}</span>
    <p class="empty__title">{{ title }}</p>
    <p v-if="message" class="empty__message">{{ message }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-8) var(--sp-4);
  text-align: center;
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: var(--r-lg);
}

.empty__icon { font-size: 34px; opacity: 0.8; }
.empty__title { font-weight: 600; }
.empty__message { font-size: 13px; color: var(--text-faint); }
</style>
