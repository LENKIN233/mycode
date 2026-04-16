# MyCode

> 个人 AI 编程助手 — 基于 GitHub Copilot 的终端 AI 编码工具

## 功能特性

- **GitHub Copilot 驱动** — 使用 GitHub Copilot 订阅，通过 Copilot 接口访问 Claude、GPT、Gemini 等多种模型
- **终端原生** — 基于 Ink 的交互式终端界面
- **丰富工具集** — 文件编辑、终端命令、代码搜索、MCP 集成等
- **上下文感知** — 自动理解项目结构与代码上下文
- **MCP 协议** — 支持 Model Context Protocol 扩展工具集
- **Bun 驱动** — 基于 Bun 运行时，启动快、性能高
- **技能系统** — 内置多种编码技能，可自定义扩展

## 快速开始

### 环境要求

- [Bun](https://bun.sh/) >= 1.3.5
- [GitHub Copilot](https://github.com/features/copilot) 订阅（个人版 $10/月，含免费额度）

### 安装

```bash
git clone https://github.com/LENKIN233/mycode.git
cd mycode
bun install
```

### 认证

MyCode 仅支持 **GitHub Copilot** 作为 API 后端。

```bash
# 第一次使用，先登录（会打开浏览器进行 GitHub 设备授权）
bun run dev --copilot-login

# 之后直接使用
bun run dev
```

登录后令牌缓存到 `~/.mycode/copilot_token.json`，后续无需重复登录。令牌过期时会自动提示重新授权。

配置与会话数据默认存放在 `~/.mycode/`（`config.json`、`projects/`、`sessions/`、`history.jsonl` 等）。

### 可用模型

通过 Copilot 可用的模型由 Copilot `/models` 接口动态发现，以会话内 `/model` 菜单为准。常见模型示例：

| 模型 | 消耗倍率 | 说明 |
|------|---------|------|
| claude-sonnet-4.6 | 1x | 默认主力模型 |
| claude-opus-4.6 | 3x | 最强模型 |
| claude-haiku-4.5 | 0.33x | 快速轻量 |
| gpt-4.1 / gpt-4o | **0x (免费)** | GPT 系列 |
| gpt-5-mini | **0x (免费)** | 经济实惠 |
| gemini-2.5-pro | 1x | Google 系列 |

### 基本使用

```bash
# 启动交互式 CLI
bun run dev

# 带初始提示启动
bun run dev "解释这个项目"

# 非交互模式（管道输入）
echo "说你好" | bun run dev --print

# 查看帮助
bun run dev --help

# 查看版本号
bun run version
```

### 常用会话命令

| 命令 | 说明 |
|------|------|
| `/model` | 查看/切换当前会话模型 |
| `/model <name>` | 直接切换到指定模型 |
| `/usage` | 查看当前会话用量统计 |
| `/provider login` | 触发 Copilot 重新授权 |

## 项目结构

```
src/
├── main.tsx              # 入口
├── commands/             # CLI 命令
├── components/           # Ink UI 组件
├── tools/                # AI 工具定义
├── skills/               # 内置技能
├── services/
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
| AI 后端 | GitHub Copilot |
| 协议 | MCP (Model Context Protocol) |

## 计划中的 API 支持

- [ ] OpenRouter
- [ ] 硅基流动（SiliconFlow）

## 许可证

见 [LICENSE.md](LICENSE.md)

---

**MyCode** by [LENKIN233](https://github.com/LENKIN233)
