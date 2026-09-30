<template>
  <!-- 路由出口：登录页 / 主布局由路由决定 -->
  <router-view />

  <!-- 全局轻提示 -->
  <div class="toasts">
    <div v-for="toast in store.toasts" :key="toast.id" :class="['toast', toast.type]">
      {{ toast.message }}
    </div>
  </div>
</template>

<script>
import { store } from './store/index.js'

export default {
  name: 'App',
  computed: {
    store() {
      return store
    }
  },
  beforeUnmount() {
    store.closeEventSource()
  }
}
</script>

<style scoped>
/* 轻提示 */
.toasts {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 1000;
  pointer-events: none;
}

.toast {
  padding: 9px 18px;
  border-radius: 999px;
  font-size: 13px;
  color: #fff;
  background: rgba(33, 43, 63, 0.92);
  box-shadow: var(--shadow-md);
  animation: toastIn 0.25s ease-out;
}

.toast.error {
  background: rgba(178, 58, 46, 0.95);
}

@keyframes toastIn {
  from {
    transform: translateY(-12px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
