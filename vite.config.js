import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    host: true,
    // 开发环境通过代理转发 /api 请求到本地后端，
    // 与生产环境 Nginx 同域代理行为保持一致，避免跨域问题
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        // 代理属服务端转发，去掉 Origin 头，
        // 避免后端 CORS 校验拒绝（403 Invalid CORS request）
        configure: proxy => {
          proxy.on('proxyReq', proxyReq => {
            proxyReq.removeHeader('origin')
          })
        }
      }
    }
  }
})
