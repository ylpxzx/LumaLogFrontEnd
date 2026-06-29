<script setup lang="ts">
import { useLanguageStore } from '@/stores/language'

defineProps<{
  open: boolean
  title: string
  message: string
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const languageStore = useLanguageStore()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="dialog-backdrop">
      <section class="dialog card" role="dialog" aria-modal="true">
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
        <div class="topbar-actions">
          <button class="button secondary" type="button" :disabled="loading" @click="emit('cancel')">
            {{ languageStore.t('cancel') }}
          </button>
          <button class="button danger" type="button" :disabled="loading" @click="emit('confirm')">
            {{ loading ? languageStore.t('deleteLoading') : languageStore.t('confirmDelete') }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  z-index: 20;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.42);
  padding: 20px;
}

.dialog {
  width: min(420px, 100%);
  padding: 22px;
}

.dialog h2 {
  margin: 0 0 8px;
  font-size: 20px;
}

.dialog p {
  margin: 0 0 18px;
  color: var(--muted);
  line-height: 1.6;
}
</style>
