# MyCode

> Personal AI coding assistant for the terminal, with GitHub Copilot and manual API routing.  
> 个人终端 AI 编程助手，支持 GitHub Copilot 与手工 API 混搭路由。

## English

### What It Is

MyCode is a Bun-based terminal coding assistant focused on personal use. It is not trying to mirror every official cloud feature. The project prioritizes:

- GitHub Copilot as a supported provider
- Manual API / compatible endpoints as another provider
- Per-task request routing via `/model-config`
- MCP tools, local skills, and terminal-native workflows

### Features

- **Provider routing**: use Copilot and manual API side by side
- **Per-task model routing**: configure `provider + model` for main loop, title, summary, memory, hooks, and other request categories
- **Terminal-native UI**: built with Ink
- **MCP support**: extend capabilities with Model Context Protocol servers
- **Skills system**: built-in and project-level skills
- **Local-first workflow**: optimized for personal/local usage rather than official cloud product flows

### Requirements

- [Bun](https://bun.sh/) >= 1.3.5
- A [GitHub Copilot](https://github.com/features/copilot) subscription if you want to use the Copilot provider
- Optional: an API key and compatible endpoint if you want to use the manual API provider

### Install

```bash
git clone https://github.com/LENKIN233/mycode.git
cd mycode
bun install
```

### Authentication and Providers

MyCode currently supports two practical provider paths:

- `copilot`
- `api` (manual API / compatible endpoint)

First-time Copilot login:

```bash
bun run dev --copilot-login
```

Manual API:

```bash
export ANTHROPIC_API_KEY=your_api_key
export ANTHROPIC_BASE_URL=https://your-gateway.example/v1 # optional

bun run dev --provider api
```

Interactive switching:

```text
/provider
/provider copilot
/provider api
```

### Model Routing

Use `/model-config` to configure request categories individually. Each category can choose its own:

- provider
- model

Examples:

- Route `title` to a free Copilot model
- Route `mainLoop` to a manual API model
- Route `memory` and `analysis` differently if needed

`/model-config` now supports:

- common vs advanced routes
- Copilot model availability warnings
- discovered API model lists when the endpoint exposes them
- custom model IDs for both Copilot and API

### Basic Usage

```bash
bun run dev
bun run dev "Explain this project"
echo "hello" | bun run dev --print
bun run dev --help
bun run version
```

### Useful Commands

| Command | Description |
|------|------|
| `/provider` | Choose the default provider interactively |
| `/model-config` | Configure per-task `provider + model` routing |
| `/model` | Change the current session main-loop model |
| `/usage` | Show session usage and request counts |
| `/context` | Inspect current context usage |

### Project Layout

```text
src/
├── main.tsx
├── commands/
├── components/
├── tools/
├── skills/
├── services/
├── hooks/
├── utils/
└── types/

shims/
vendor/
```

### Runtime Data

Configuration and session data are stored under `~/.mycode/` by default.

### License

See [LICENSE.md](LICENSE.md)

## 中文

### 项目定位

MyCode 是一个基于 Bun 的个人终端 AI 编程助手。项目不追求完整复刻所有官方云功能，重点放在本地可闭环的个人使用场景：

- 支持 GitHub Copilot
- 支持手工 API / 兼容端点
- 支持按任务类别配置 `provider + model`
- 支持 MCP、技能系统、终端工作流

### 功能特性

- **Provider 混搭**：Copilot 和 API 可以并存
- **任务级模型路由**：`/model-config` 可分别配置主对话、标题、摘要、记忆、hooks 等请求类别
- **终端原生界面**：基于 Ink
- **MCP 协议支持**：可接入外部工具能力
- **技能系统**：支持内置技能与项目级 agent/skill
- **本地优先**：优先服务个人项目和本地编码流程

### 环境要求

- [Bun](https://bun.sh/) >= 1.3.5
- 如果要使用 Copilot，需要有效的 [GitHub Copilot](https://github.com/features/copilot) 订阅
- 如果要使用手工 API，需要 `ANTHROPIC_API_KEY`，兼容网关可选配 `ANTHROPIC_BASE_URL`

### 安装

```bash
git clone https://github.com/LENKIN233/mycode.git
cd mycode
bun install
```

### 认证与 Provider

当前项目主要支持两种 provider：

- `copilot`
- `api`

首次登录 Copilot：

```bash
bun run dev --copilot-login
```

使用手工 API：

```bash
export ANTHROPIC_API_KEY=your_api_key
export ANTHROPIC_BASE_URL=https://your-gateway.example/v1 # 可选

bun run dev --provider api
```

交互模式切换：

```text
/provider
/provider copilot
/provider api
```

### 模型路由

`/model-config` 现在不是只改一个全局模型，而是给每个请求类别分别配置：

- provider
- model

例如：

- `title` 用 Copilot 免费模型
- `mainLoop` 用 API 模型
- `memory`、`analysis` 各自走不同 provider

当前 `/model-config` 已支持：

- 常用项 / 高级项分层显示
- Copilot 不可用模型预警
- API 端点模型发现与缓存
- Copilot / API 自定义模型 ID 输入

### 基本使用

```bash
bun run dev
bun run dev "解释这个项目"
echo "你好" | bun run dev --print
bun run dev --help
bun run version
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `/provider` | 交互式选择默认 provider |
| `/model-config` | 配置任务级 `provider + model` 路由 |
| `/model` | 修改当前会话主模型 |
| `/usage` | 查看当前会话用量和请求统计 |
| `/context` | 查看上下文使用情况 |

### 目录结构

```text
src/
├── main.tsx
├── commands/
├── components/
├── tools/
├── skills/
├── services/
├── hooks/
├── utils/
└── types/

shims/
vendor/
```

### 运行数据

默认配置与会话数据保存在 `~/.mycode/`。

### 许可证

见 [LICENSE.md](LICENSE.md)

---

**MyCode** by [LENKIN233](https://github.com/LENKIN233)
