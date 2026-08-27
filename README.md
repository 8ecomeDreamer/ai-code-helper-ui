# AI 编程小助手 - 前端应用

基于 Vue 3 + Vite 构建的 AI 编程助手前端界面，配合 LangChain4j 后端 Agent 使用。

![Vue](https://img.shields.io/badge/Vue-3.3.4-4FC08D?logo=vue.js)
![Vite](https://img.shields.io/badge/Vite-4.4.9-646CFF?logo=vite)
![License](https://img.shields.io/badge/License-MIT-blue)

## 功能特性

- 💬 **实时对话**：使用 SSE (Server-Sent Events) 实现流式响应，打字机效果
- 🤖 **AI 编程助手**：专注解答编程学习和求职面试相关问题
- 📝 **Markdown 支持**：代码高亮、列表、表格等丰富格式渲染
- 📱 **响应式设计**：适配桌面和移动端
- 🎨 **简洁界面**：清新现代的 UI 设计

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.3.4 | 前端框架 |
| Vite | 4.4.9 | 构建工具 |
| Axios | 1.5.0 | HTTP 客户端 |
| Marked | 16.0.0 | Markdown 渲染 |

## 快速开始

### 环境要求

- Node.js >= 16
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

默认启动在 http://localhost:3000

### 生产构建

```bash
npm run build
```

构建产物在 `dist/` 目录

## 项目结构

```
ai-code-helper-ui/
├── index.html              # 入口 HTML
├── package.json            # 项目配置
├── vite.config.js          # Vite 配置
├── src/
│   ├── main.js             # 应用入口
│   ├── App.vue             # 根组件
│   ├── api/
│   │   └── chatApi.js      # 聊天 API 封装 (SSE)
│   ├── components/
│   │   ├── ChatInput.vue   # 消息输入组件
│   │   ├── ChatMessage.vue # 消息展示组件
│   │   └── LoadingDots.vue # 加载动画组件
│   └── utils/
│       └── index.js        # 工具函数
└── README.md
```

## 后端接口配置

编辑 `src/api/chatApi.js` 配置后端地址：

```javascript
const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? '/api'                              // 生产环境
    : 'http://localhost:8081/api'         // 开发环境
```

### 接口规范

前端通过 SSE 连接后端 `/api/ai/chat` 接口：

**请求方式**: `GET`  
**参数**:
- `memoryId` - 会话 ID
- `message` - 用户消息

**响应格式**: `text/event-stream`

后端需按 SSE 格式返回数据：
```
data: 第一段内容

data: 第二段内容

data: [DONE]
```

## 部署说明

### 腾讯云开发 (CloudBase)

本项目已配置支持腾讯云开发部署：

```bash
# 使用 CloudBase CLI 部署
cloudbase hosting:deploy dist -e <环境ID>
```

### 静态服务器

```bash
npm run build
npm run preview
```

## 与 LangChain4j 后端集成

本前端项目配合 LangChain4j 开发的 Agent 应用使用：

1. 启动 LangChain4j 后端服务（默认端口 8081）
2. 确保后端支持 SSE 流式输出
3. 配置前端 `API_BASE_URL` 指向后端地址
4. 访问前端页面开始对话

## 自定义配置

### 修改端口

编辑 `vite.config.js`：

```javascript
export default defineConfig({
  server: {
    port: 3000,      // 修改端口
    host: true
  }
})
```

### 修改标题/图标

编辑 `index.html`：

```html
<title>你的应用名称</title>
<link rel="icon" href="...">
```

## 浏览器支持

- Chrome / Edge 最新版
- Firefox 最新版
- Safari 最新版

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
