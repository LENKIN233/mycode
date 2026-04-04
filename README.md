# MyCode

> 个人 AI 编程助手 — 基于多模型后端的终端 AI 编码工具

## 功能特性

- **多模型支持** — 支持 Claude、OpenRouter 等多种 AI 模型后端
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

### 运行

```bash
# 启动交互式 CLI
bun run dev

# 查看命令帮助
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
| AI 后端 | Anthropic SDK / OpenRouter |
| 协议 | MCP (Model Context Protocol) |

## 许可证

见 [LICENSE.md](LICENSE.md)

---

**MyCode** by [LENKIN233](https://github.com/LENKIN233)
