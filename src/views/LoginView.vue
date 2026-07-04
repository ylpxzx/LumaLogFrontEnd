<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLanguageStore } from '@/stores/language'

const authStore = useAuthStore()
const languageStore = useLanguageStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')

async function submit() {
  error.value = ''
  try {
    const response = await authStore.login(email.value, password.value)
    languageStore.setLanguage(response.user.language_preference)
    router.push((route.query.redirect as string | undefined) ?? '/')
  } catch {
    error.value = languageStore.t('loginFailed')
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

      <h1>{{ languageStore.t('loginTitle') }}</h1>
      <p class="muted">{{ languageStore.t('loginSubtitle') }}</p>

      <form class="form-stack" @submit.prevent="submit">
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
            autocomplete="current-password"
          />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="button" type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? languageStore.t('loginLoading') : languageStore.t('login') }}
        </button>
      </form>

      <p class="muted">
        {{ languageStore.t('noAccount') }}
        <RouterLink to="/register">{{ languageStore.t('createAccountLink') }}</RouterLink>
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
