<template>
  <div class="app-shell">
    <!-- 左侧边栏：品牌、模块导航、搜索、历史记录、当前用户 -->
    <SidebarView
      :sessions="store.sessions"
      :active-session-id="store.activeSessionId"
      :active-module="activeModule"
      :user="store.user"
      :remaining-quota="store.quotaRemaining"
      @new-chat="newChat"
      @select-session="selectSession"
      @select-module="selectModule"
      @delete-session="deleteSession"
      @open-admin="openAdmin"
      @logout="logout"
    />

    <!-- 主区域：业务路由视图 -->
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script>
import SidebarView from './Sidebar.vue'
import { store } from '../store/index.js'
import { ADMIN_HOME_PATH } from '../config.js'

export default {
  name: 'MainLayout',
  components: { SidebarView },
  computed: {
    store() {
      return store
    },
    // 当前业务模块 = 路由名（chat / quote / research / compliance / fabric）
    activeModule() {
      return this.$route.name || 'chat'
    }
  },
  methods: {
    goChat() {
      if (this.$route.name !== 'chat') {
        this.$router.push({ name: 'chat' })
      }
    },
    newChat() {
      store.newChat()
      this.goChat()
    },
    selectSession(id) {
      store.selectSession(id)
      this.goChat()
    },
    // 模块跳转交给路由守卫做权限校验
    selectModule(module) {
      this.$router.push({ name: module })
    },
    deleteSession(id) {
      store.deleteSession(id)
    },
    // 管理后台：权限校验通过后跳转应用内后台路由
    openAdmin() {
      if (store.openAdmin()) {
        this.$router.push(ADMIN_HOME_PATH)
      }
    },
    async logout() {
      await store.logout()
      this.$router.replace({ name: 'login' })
    }
  }
}
</script>

<style scoped>
.app-shell {
  height: 100%;
  display: flex;
  overflow: hidden;
  background: var(--c-bg);
}

.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
