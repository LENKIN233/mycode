# MyCode

> 个人 AI 编程助手 — 基于多模型后端的终端 AI 编码工具

## 功能特性

- **多模型支持** — 支持 Claude、GitHub Copilot、AWS Bedrock、Google Vertex、Azure Foundry 等
- **终端原生** — 基于 Ink 的交互式终端界面
- **丰富工具集** — 文件编辑、终端命令、代码搜索、MCP 集成等
- **上下文感知** — 自动理解项目结构与代码上下文
- **MCP 协议** — 支持 Model Context Protocol 扩展工具集
- **Bun 驱动** — 基于 Bun 运行时，启动快、性能高
- **技能系统** — 内置多种编码技能，可自定义扩展

## 快速开始

### 环境要求

- [Bun](https://bun.sh/) >= 1.3.5
- [Node.js](https://nodejs.org/) >= 24

### 安装

```bash
git clone https://github.com/LENKIN233/mycode.git
cd mycode
bun install
```

### 认证与运行

MyCode 支持多种 API 后端。**推荐使用 GitHub Copilot**（只需要一个 GitHub 账号 + Copilot 订阅即可）。

#### 方式一：GitHub Copilot（推荐）

只需有 [GitHub Copilot](https://github.com/features/copilot) 订阅（个人版 $10/月，包含免费额度）。

```bash
# 第一次使用，先登录 Copilot（会打开浏览器进行 GitHub 设备授权）
bun run dev --copilot-login

# 之后每次使用，指定 copilot 作为提供商
bun run dev --provider copilot

# 或者设置环境变量，就不用每次传 --provider 了
export MYCODE_USE_COPILOT=1
bun run dev
```

登录后令牌会缓存到 `~/.mycode/copilot_token.json`，后续无需重复登录。

通过 Copilot 可使用的模型（在会话中 `/model` 切换）：

| 模型 | 消耗倍率 | 说明 |
|------|---------|------|
| claude-sonnet-4 | 1x | 默认模型 |
| claude-sonnet-4.5 / 4.6 | 1x | 更强推理 |
| claude-opus-4.5 / 4.6 | 3x | 最强模型 |
| claude-haiku-4.5 | 0.33x | 快速轻量 |
| gpt-4.1 / gpt-4o | **0x (免费)** | GPT 系列 |
| gemini-2.5-pro / 3-pro | 1x | Google 系列 |
| gpt-5-mini | **0x (免费)** | 经济实惠 |

#### 方式二：Anthropic API Key

直接使用 Anthropic 官方 API（需要在 [console.anthropic.com](https://console.anthropic.com/) 获取 key）。

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
bun run dev
```

#### 方式三：AWS Bedrock

```bash
export MYCODE_USE_BEDROCK=1
# 确保 AWS 凭证已配置（aws configure 或环境变量）
bun run dev
```

#### 方式四：Google Vertex AI

```bash
export MYCODE_USE_VERTEX=1
export ANTHROPIC_VERTEX_PROJECT_ID="your-project-id"
export CLOUD_ML_REGION="us-east5"
# 确保 GCP 凭证已配置
bun run dev
```

#### 方式五：Azure Foundry

```bash
export MYCODE_USE_FOUNDRY=1
export ANTHROPIC_FOUNDRY_RESOURCE="your-resource-name"
# 使用 Azure AD 认证或设置 ANTHROPIC_FOUNDRY_API_KEY
bun run dev
```

### 运行时切换提供商

在交互式会话中，可以随时用 `/provider` 命令切换：

```
/provider              # 查看当前提供商
/provider copilot      # 切换到 GitHub Copilot
/provider anthropic    # 切换到 Anthropic API
/provider login        # 触发 Copilot 登录流程
```

### 基本使用

```bash
# 启动交互式 CLI
bun run dev

# 带初始提示启动
bun run dev "解释这个项目"

# 查看帮助
bun run dev --help

# 查看版本号
bun run version
```

## 项目结构

```
src/
├── main.tsx              # 入口
├── commands/             # CLI 命令
├── components/           # Ink UI 组件
├── tools/                # AI 工具定义
├── skills/               # 内置技能
├── services/             # API 与服务层
│   └── copilot/          # GitHub Copilot 集成
├── bridge/               # 远程桥接
├── hooks/                # React hooks
├── utils/                # 工具函数
└── types/                # 类型定义

shims/                    # 原生模块兼容层
vendor/                   # 原生扩展源码
```

## 技术栈

| 组件 | 技术 |
|------|------|
| 运行时 | Bun |
| 语言 | TypeScript |
| UI 框架 | Ink (React for CLI) |
| AI 后端 | Anthropic SDK / GitHub Copilot / Bedrock / Vertex / Foundry |
| 协议 | MCP (Model Context Protocol) |

## 环境变量参考

| 变量 | 说明 |
|------|------|
| `MYCODE_USE_COPILOT=1` | 启用 GitHub Copilot 提供商 |
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 |
| `MYCODE_USE_BEDROCK=1` | 启用 AWS Bedrock |
| `MYCODE_USE_VERTEX=1` | 启用 Google Vertex AI |
| `MYCODE_USE_FOUNDRY=1` | 启用 Azure Foundry |
| `ANTHROPIC_MODEL` | 覆盖默认模型 |
| `ANTHROPIC_BASE_URL` | 自定义 API 基础 URL |

## 许可证

见 [LICENSE.md](LICENSE.md)

---

**MyCode** by [LENKIN233](https://github.com/LENKIN233)
