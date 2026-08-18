# 🤖 AI‑Code‑Helper‑Frontend

>
> AI‑Code‑Helper 后端配套前端项目
> 基于 Vue3 + Vite 开发，为 LangChain4j AI 助手提供可视化对话界面

## 🚀 项目亮点

- 💬 **AI 智能对话**：支持普通问答、流式打字机回复效果
- 🛡️ **安全提示展示**：后端安全护栏拦截后，前端展示风险提示
- 📚 **知识库问答**：上传 PDF 文件，基于私有文档进行问答
- 🔗 **RESTful 请求**：对接后端 `/api` 接口，前后端完全分离
- 🎨 **简洁响应式 UI**：适配电脑浏览器，聊天窗口布局清爽易用

## 🛠️ 技术架构

表格

| 组件 | 版本 / 说明 |
| --- | --- |
| 前端框架 | Vue 3 |
| 构建工具 | Vite |
| 语言 | TypeScript（可选） |
| UI 组件库 | Element‑Plus / Vant |
| HTTP 请求 | Axios |
| 样式方案 | SCSS / TailwindCSS |
| 对接后端 | AI‑Code‑Helper(SpringBoot) |

## 📁 项目结构

```
ai-code-helper-frontend/
├── public/                 # 静态资源
├── src/
│   ├── api/                # 后端接口请求封装
│   │   └── chat.ts         # 对话、知识库上传接口
│   ├── components/         # 公共组件
│   │   ├── ChatBox.vue     # 聊天窗口组件
│   │   ├── MessageItem.vue# 单条消息渲染
│   │   └── UploadPdf.vue   # PDF上传组件
│   ├── views/              # 页面视图
│   │   └── Chat.vue        # AI对话主页
│   ├── router/             # 路由配置
│   ├── store/              # Pinia状态管理（聊天记录）
│   ├── App.vue
│   └── main.ts
├── .env.development        # 本地环境变量
├── .env.production         # 生产环境变量
├── package.json
└── vite.config.ts
```

## ⚙️ 环境配置指南

### 1、环境变量配置

>
> 后端统一上下文路径为 `/api`

**.env.development（本地开发）**

```
# 本地后端地址
VITE_API_BASE_URL=http://127.0.0.1:8081/api
```

**.env.production（微信云托管部署）**

```
# 云托管后端域名，后面带上/api
VITE_API_BASE_URL=https://你的云托管域名/api
```

>
> ⚠️ 前后端部署常见坑：后端端口生产环境为 **80**；生产接口地址不要带上 `:8081` 端口号

## ▶️ 启动方式

### 1、安装依赖

```
npm install
```

### 2、本地开发运行

```
npm run dev
```

访问控制台给出的本地地址即可打开聊天页面。

### 3、打包生产构建

```
npm run build
```

打包完成后 `dist` 文件夹即为可部署产物，可以上传至静态网站服务器、微信云托管静态资源、Nginx。

## 🔌 后端接口约定

>
> 后端项目：AI‑Code‑Helper
> 基础路径前缀：`/api`

表格

| 接口 | 请求方式 | 功能说明 |
| --- | --- | --- |
| `/chat/stream` | POST | 流式对话接口 |
| `/chat/normal` | POST | 普通问答接口 |
| `/knowledge/upload` | POST | 上传 PDF 知识库文档 |

## 🐞 踩坑日志 & 避坑清单

表格

| 问题类型 | 解决方案 |
| --- | --- |
| 🔴 请求后端接口报跨域错误 | 开发环境后端配置 CORS 跨域；线上部署同源一般无跨域 |
| 📡 流式响应无打字效果 | 使用 `EventSource` /fetch 读取 SSE 流，不要用普通 axios |
| 📤 PDF 上传失败 | 检查后端文件存储路径、文件大小限制、文件编码 |
| ☁️ 云托管部署后接口 404 | 确认环境变量 `VITE_API_BASE_URL` 域名正确，末尾带上 `/api` |
| 🛑 安全护栏拦截无提示 | 后端拦截会返回特定错误码，前端捕获后渲染风险提示文案 |

## 📚 学习资源

- [Vue3 官方文档](https://cn.vuejs.org/)
- [Vite 官方文档](https://cn.vitejs.dev/)
- [后端 AI‑Code‑Helper](%E5%90%8E%E7%AB%AF%E4%BB%93%E5%BA%93%E5%9C%B0%E5%9D%80)

>
> 配套后端教程来源：鱼皮 LangChain4j Java AI 零基础实战教程

## 📄 协议与许可

本项目采用 **MIT 协议** 开源，欢迎自由使用、修改、分发。
如有问题或建议，欢迎提交 Issue 或 Pull Request！
