<template>
  <div class="login-page">
    <div class="login-card">
      <!-- 品牌 -->
      <div class="login-brand">
        <div class="login-logo">
          <AppIcon name="logo" :size="22" />
        </div>
        <div class="login-brand-text">
          <div class="login-title">纺织智能体</div>
          <div class="login-sub">Textile AI Agent · 登录后使用完整能力</div>
        </div>
      </div>

      <!-- 登录表单 -->
      <form class="login-form" @submit.prevent="submit">
        <label class="field">
          <AppIcon name="user" :size="15" />
          <input
            v-model.trim="username"
            type="text"
            placeholder="用户名"
            autocomplete="username"
            :disabled="loading"
          />
        </label>
        <label class="field">
          <AppIcon name="lock" :size="15" />
          <input
            v-model.trim="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="密码"
            autocomplete="current-password"
            :disabled="loading"
          />
          <button type="button" class="field-eye" @click="showPassword = !showPassword">
            <AppIcon :name="showPassword ? 'eye-off' : 'eye'" :size="15" />
          </button>
        </label>

        <div v-if="errorMessage" class="login-error">{{ errorMessage }}</div>

        <button class="login-submit" type="submit" :disabled="loading || !username || !password">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>

      <!-- 演示账号（后端鉴权未接入时自动启用） -->
      <div class="demo-area">
        <div class="demo-title">演示账号（后端鉴权接口未接入时自动启用）</div>
        <div class="demo-chips">
          <button
            v-for="item in demoAccounts"
            :key="item.username"
            type="button"
            class="demo-chip"
            :disabled="loading"
            @click="fill(item)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AppIcon from '../components/AppIcon.vue'
import { login } from '../api/authApi.js'
import { store } from '../store/index.js'

export default {
  name: 'LoginView',
  components: { AppIcon },
  data() {
    return {
      username: '',
      password: '',
      showPassword: false,
      loading: false,
      errorMessage: '',
      demoAccounts: [
        { label: '管理员 admin', username: 'admin', password: 'admin123' },
        { label: '正式用户 user', username: 'user', password: 'user123' },
        { label: '体验用户 guest', username: 'guest', password: 'guest123' }
      ]
    }
  },
  methods: {
    fill(item) {
      this.username = item.username
      this.password = item.password
      this.errorMessage = ''
    },
    async submit() {
      if (this.loading || !this.username || !this.password) return
      this.loading = true
      this.errorMessage = ''
      try {
        const { token, user } = await login(this.username, this.password)
        store.setAuth({ token, user })
        // 登录成功后回到来源路由（路由守卫记录的 redirect），默认问答页
        this.$router.replace(this.$route.query.redirect || '/chat')
      } catch (error) {
        this.errorMessage = error.message || '登录失败，请稍后重试'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(720px 420px at 18% 12%, rgba(47, 84, 150, 0.12), transparent 70%),
    radial-gradient(680px 420px at 84% 88%, rgba(194, 106, 74, 0.1), transparent 70%),
    linear-gradient(160deg, #f7f5f0 0%, var(--c-bg) 55%, #efece4 100%);
}

.login-card {
  width: 100%;
  max-width: 396px;
  padding: 34px 32px 26px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--c-border-soft);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(8px);
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}

.login-logo {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #2f5496 0%, #4a72c0 100%);
  box-shadow: 0 8px 18px rgba(47, 84, 150, 0.3);
}

.login-title {
  font-size: 19px;
  font-weight: 800;
  color: var(--c-text);
}

.login-sub {
  font-size: 11.5px;
  color: var(--c-text-3);
  margin-top: 2px;
}

.login-form {
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 13px;
  border-radius: 12px;
  background: var(--c-primary-softer);
  border: 1px solid var(--c-border-soft);
  color: var(--c-text-3);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.field:focus-within {
  border-color: rgba(47, 84, 150, 0.4);
  background: #fff;
}

.field input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--c-text);
}

.field input::placeholder {
  color: var(--c-text-3);
}

.field-eye {
  display: flex;
  color: var(--c-text-3);
  transition: color 0.15s ease;
}

.field-eye:hover {
  color: var(--c-primary);
}

.login-error {
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(192, 57, 43, 0.08);
  border: 1px solid rgba(192, 57, 43, 0.2);
  color: #b23a2b;
  font-size: 12.5px;
}

.login-submit {
  margin-top: 4px;
  padding: 12px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 4px;
  color: #fff;
  background: linear-gradient(135deg, #2f5496, #4a72c0);
  box-shadow: 0 8px 20px rgba(47, 84, 150, 0.3);
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.login-submit:hover:not(:disabled) {
  transform: translateY(-1px);
}

.login-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.demo-area {
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px dashed var(--c-border);
}

.demo-title {
  font-size: 11px;
  color: var(--c-text-3);
  text-align: center;
}

.demo-chips {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.demo-chip {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11.5px;
  color: var(--c-text-2);
  background: #fff;
  border: 1px solid var(--c-border);
  transition: all 0.15s ease;
}

.demo-chip:hover:not(:disabled) {
  color: var(--c-primary);
  border-color: rgba(47, 84, 150, 0.35);
}

.demo-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
