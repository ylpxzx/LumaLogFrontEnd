<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLanguageStore } from '@/stores/language'

const authStore = useAuthStore()
const languageStore = useLanguageStore()
const router = useRouter()

const displayName = ref('')
const email = ref('')
const password = ref('')
const error = ref('')

async function submit() {
  error.value = ''
  try {
    const response = await authStore.register(email.value, password.value, displayName.value)
    languageStore.setLanguage(response.user.language_preference)
    router.push('/')
  } catch {
    error.value = languageStore.t('registerFailed')
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-panel">
      <div class="brand-mark">
        <span class="brand-dot" />
        <span>LumaLog</span>
      </div>

      <h1>{{ languageStore.t('registerTitle') }}</h1>
      <p class="muted">{{ languageStore.t('registerSubtitle') }}</p>

      <form class="form-stack" @submit.prevent="submit">
        <label class="field">
          <span>{{ languageStore.t('displayName') }}</span>
          <input v-model="displayName" class="input" required maxlength="40" autocomplete="name" />
        </label>
        <label class="field">
          <span>{{ languageStore.t('email') }}</span>
          <input v-model="email" class="input" type="email" required autocomplete="email" />
        </label>
        <label class="field">
          <span>{{ languageStore.t('password') }}</span>
          <input
            v-model="password"
            class="input"
            type="password"
            required
            minlength="6"
            autocomplete="new-password"
          />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="button" type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? languageStore.t('registerLoading') : languageStore.t('register') }}
        </button>
      </form>

      <p class="muted">
        {{ languageStore.t('hasAccount') }}
        <RouterLink to="/login">{{ languageStore.t('goLogin') }}</RouterLink>
      </p>
    </section>
  </main>
</template>

<style scoped>
h1 {
  margin: 0;
  font-size: 30px;
}

.auth-panel > .muted {
  margin-bottom: 22px;
}

a {
  color: var(--accent);
  font-weight: 700;
}
</style>
