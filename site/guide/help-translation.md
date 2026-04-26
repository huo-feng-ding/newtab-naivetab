# 🌐 贡献指南

NaiveTab 是开源项目，欢迎贡献代码、翻译、文档和建议。

## 🌍 翻译贡献

NaiveTab 目前支持 **简体中文**（zh-CN）和 **英文**（en-US），欢迎添加新语言或改善现有翻译。

### 翻译文件位置

翻译文件存放在 `src/locales/` 目录下：

```
src/locales/
├── zh-CN.json    # 简体中文
├── en-US.json    # 英文
└── xx-XX.json    # 你要添加的语言
```

### 新增语言步骤

1. **复制基准文件**：复制 `zh-CN.json` 为新文件，命名为 `<语言代码>.json`（如 `ja-JP.json`）
2. **翻译所有值**：保持 key 不变，将 value 翻译为目标语言
3. **注册语言**：在项目的 i18n 配置文件中注册新语言
4. **提交 PR**：将翻译好的文件提交到 GitHub

### 改善现有翻译

1. 找到对应语言文件（如 `zh-CN.json`）
2. 修改需要调整的翻译值
3. 提交 PR 并说明改进原因

### 翻译规范

- key 格式为嵌套结构，如 `general.name`、`clock.showSeconds`
- 变量占位符使用 `__xxx__` 格式（如 `__field__`、`__count__`）
- 保持与原文相同的 key 数量和层级

## 💻 代码贡献

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/GXFG/newtab-naivetab.git
cd newtab-naivetab

# 安装依赖
npm install

# 启动开发模式
npm run dev
```

### 提交 PR

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feat/your-feature`
3. 提交改动并推送到你的 Fork
4. 在 GitHub 上创建 Pull Request

### 代码规范

项目使用 ESLint + Prettier 进行代码检查和格式化，提交前请运行：

```bash
npm run lint
```

### 新增 Widget

新增 Widget 组件需要修改多个文件，建议先阅读 [Widget 开发文档](/guide/keyboard-bookmark) 了解完整流程。

## 📖 文档贡献

本文档站（VitePress）的源文件在 `site/` 目录下，欢迎改善文案、补充内容或修正错误。

## 🐛 报告问题

- 功能 Bug：[GitHub Issues](https://github.com/GXFG/newtab-naivetab/issues)
- 功能建议：[GitHub Issues](https://github.com/GXFG/newtab-naivetab/issues)
- 邮件联系：gxfgim@outlook.com
