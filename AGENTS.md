# AGENTS.md

给编码 Agent 的仓库指南。用户向说明见 [README.md](./README.md) / [README.zh-CN.md](./README.zh-CN.md)。

## 项目是什么

`chatgpt-api-demo` 是 OpenAI Chat Completions 的轻量 Demo：Astro SSR 提供页面和 API，SolidJS 负责流式聊天 UI。没有独立 backend、数据库或全局状态库。

默认模型是 `gpt-3.5-turbo`（`OPENAI_API_MODEL` 可覆盖）。

## 技术栈

- **Astro 2**，`output: 'server'`
- **SolidJS 1.7**（交互组件；`tsconfig` 里 `jsxImportSource` 为 `solid-js`）
- **UnoCSS**（attributify、图标、typography；快捷类在 `unocss.config.ts`）
- **markdown-it** + KaTeX + highlight.js
- **pnpm 7**，**Node >= 18**
- 适配器：`@astrojs/node`（默认）、`@astrojs/vercel/edge`、`@astrojs/netlify/edge-functions`

## 常用命令

```bash
pnpm install
cp .env.example .env          # 至少填 OPENAI_API_KEY
pnpm run dev                  # http://localhost:3000/
pnpm run lint
pnpm run lint:fix
pnpm run build                # Node standalone → dist/server/entry.mjs
pnpm run build:vercel         # OUTPUT=vercel
pnpm run build:netlify        # OUTPUT=netlify
pnpm run preview
```

没有单元测试或 e2e 脚本。改完后至少跑 `pnpm run lint`。PR 对 `main` 会跑 `.github/workflows/lint.yml`。

提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)（见 `.github/PULL_REQUEST_TEMPLATE.md`）。较大功能应先开 issue。

## 目录与改哪里

| 路径 | 职责 | 何时改 |
| --- | --- | --- |
| `src/pages/index.astro` | 聊天页；进页时校验 `localStorage.pass` | 页面骨架、鉴权跳转 |
| `src/pages/password.astro` | 站点密码输入 | 密码页 UI / 校验流程 |
| `src/pages/api/auth.ts` | `POST /api/auth`，对照 `SITE_PASSWORD` | 密码校验逻辑 |
| `src/pages/api/generate.ts` | `POST /api/generate`，鉴权并代理 OpenAI | 请求校验、代理、流式响应 |
| `src/utils/openAI.ts` | payload、模型名、SSE → 文本流 | 模型参数、流解析 |
| `src/utils/auth.ts` | `PUBLIC_SECRET_KEY` 签名 / 验签 | 签名算法 |
| `src/types.ts` | `ChatMessage`、`ErrorMessage` | 聊天相关类型 |
| `src/components/Generator.tsx` | 整页状态：消息、流式、重试、历史 | 对话行为 |
| `src/components/MessageItem.tsx` | Markdown、复制代码、Regenerate | 消息渲染 |
| `src/components/SystemRoleSettings.tsx` | system prompt + temperature | 系统角色 / 采样温度 |
| `src/components/SettingsSlider.tsx` / `Slider.tsx` | zag-js 滑块 | 设置控件 |
| `src/layouts/Layout.astro` | HTML、主题、PWA、`HEAD_SCRIPTS` | 全局 head / 暗色主题 |
| `src/components/Header.astro` / `Footer.astro` / `Themetoggle.astro` | 页头页脚与主题按钮 | 壳层 UI |
| `unocss.config.ts` | 工具类与 shortcuts | 样式约定 |
| `astro.config.mjs` | 适配器、PWA、`disableBlocks` | 构建与部署目标 |
| `plugins/disableBlocks.ts` | Edge 构建时删除 `#vercel-disable-blocks` | 平台相关代码裁剪 |
| `hack/docker-entrypoint.sh` / `hack/docker-env-replace.sh` | 容器启动时把环境变量写入 `dist/` | Docker 运行时配置 |

路径别名：`@/*` → `src/*`。

## 请求链路

```
浏览器
  → GET /                  index.astro（Generator client:load）
  → POST /api/auth         { pass }  未配置 SITE_PASSWORD 则视为公开
  → POST /api/generate     { messages, time, pass, sign, temperature }
       1. 需要 messages
       2. 若配置了 SITE_PASSWORD，校验 pass
       3. 生产环境校验 sign = SHA-256(`${time}:${lastMessage}:${PUBLIC_SECRET_KEY}`)
       4. POST ${OPENAI_API_BASE_URL}/v1/chat/completions  stream:true
       5. eventsource-parser 抽出 choices[0].delta.content，以文本流返回
  → Generator 用 ReadableStream 拼 currentAssistantMessage，结束后写入 messageList
```

上下文窗口：`messageList.slice(-PUBLIC_MAX_HISTORY_MESSAGES)`（默认 9），若有 system role 则 `unshift` 到最前。

会话：`sessionStorage.messageList` / `systemRoleSettings`；密码：`localStorage.pass`；贴底：`localStorage.stickToBottom`。

## 平台差异（不要弄丢条件编译）

`src/pages/api/generate.ts` 里：

```ts
// #vercel-disable-blocks
import { ProxyAgent, fetch } from 'undici'
// ...
if (httpsProxy)
  initOptions.dispatcher = new ProxyAgent(httpsProxy)
// #vercel-end
```

仅 Node/Docker 需要这段（`HTTPS_PROXY`）。`OUTPUT=vercel|netlify` 时 `plugins/disableBlocks.ts` 会删掉标记之间的代码。改代理或 fetch 时必须保留这对标记，并确认 Edge 构建在去掉 `undici` 后仍能编译。

`astro.config.mjs` 用 `process.env.OUTPUT` 选择适配器，默认 Node standalone。

## 环境变量

类型声明在 `src/env.d.ts`，示例在 `.env.example`。

服务端：`OPENAI_API_KEY`、`HTTPS_PROXY`、`OPENAI_API_BASE_URL`、`SITE_PASSWORD`、`OPENAI_API_MODEL`、`HEAD_SCRIPTS`。

客户端（`PUBLIC_` 会被 Vite 内联）：`PUBLIC_SECRET_KEY`、`PUBLIC_MAX_HISTORY_MESSAGES`。

Docker 不会在运行时读 Astro 的 `import.meta.env`；`hack/docker-env-replace.sh` 用 `sed` 把编译产物里的 `({}).VAR_NAME` 替换成容器环境变量。新增环境变量时要同时改：

1. `.env.example`
2. `src/env.d.ts`
3. 实际读取点
4. `hack/docker-env-replace.sh`
5. README 环境变量表

## 代码约定

- **Astro**：静态壳、路由、无状态布局。带交互的聊天状态放 Solid 组件，并加 `client:load`（或合适的 client 指令）。
- **Solid**：用 `createSignal` / `Show` / `Index`。`Generator.tsx` 是状态中心，不要再引入 Redux/Store。
- **样式**：优先 UnoCSS attributify 和 `unocss.config.ts` 里的 shortcuts（如 `gen-slate-btn`、`fi`、`fcc`）。全局主题变量在 `Layout.astro`（`--c-bg`、`--c-fg`）。消息/滑块补充样式在 `src/message.css`、`src/slider.css`。
- **类型**：聊天类型放 `src/types.ts`。不要新增无关依赖。
- **日志**：ESLint 禁止 `console.log`，只允许 `console.error`。
- **签名时间窗**：`verifySignature` 里 5 分钟过期检查是注释掉的，不要在没有明确需求时打开。

## 已知缺口

`src/components/SettingsSlider.tsx` 从 `@/types/provider` 引入 `SettingsUI` / `SettingsUISlider`，仓库里没有这个文件（多半是从 Anse 一类产品拆出来时的残留）。运行时靠字面量 props，改滑块相关代码时不要假设该模块存在；补类型应写在本仓库的 `src/types.ts`（或新建真实文件并改 import）。

## 不要做的事

- 不要把 `OPENAI_API_KEY` 暴露到客户端或 Solid 组件。
- 不要删除 `#vercel-disable-blocks` 标记，除非同时改掉 Edge 构建插件。
- 不要把 Vercel/Netlify 没有的 Node API（如 `undici.ProxyAgent`）加到未保护的服务端代码里。
- 不要新增测试框架、状态库或 UI 库，除非任务明确要求。
- 不要改用户没点名的部署按钮、截图或营销文案。
- 文档：用户说明放 README；Agent 约定放本文件。结构说明两处都要改时保持一致。
