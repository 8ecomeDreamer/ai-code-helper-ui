import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import { store } from './store/index.js'
import './styles/global.css'

// 初始化全局状态（会话 / 登录态），随后挂载路由应用
store.init()

createApp(App).use(router).mount('#app')
