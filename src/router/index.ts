import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
    },
    {
      path: '/items/new',
      name: 'item-create',
      component: () => import('@/views/ItemCreateView.vue'),
    },
    {
      path: '/items/:id/checkin',
      name: 'item-checkin',
      component: () => import('@/views/ItemCheckinView.vue'),
    },
    {
      path: '/items/:id/makeup',
      name: 'item-makeup',
      component: () => import('@/views/ItemMakeupView.vue'),
    },
    {
      path: '/items/:id/edit',
      name: 'item-edit',
      component: () => import('@/views/ItemEditView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('lumalog_token')
  if (!to.meta.public && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.public && token) {
    return { name: 'dashboard' }
  }
})

export default router
