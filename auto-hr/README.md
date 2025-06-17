# HR 自动化助手

这是一个基于 Plasmo 框架开发的 Chrome 扩展，专为 hr.shixiseng.com 网站设计，提供自动化 HR 管理功能。

## 功能特性

- 🤖 **自动回复**: 自动检测并回复岗位申请人的消息
- 📊 **数据收集**: 自动提取申请人的联系方式（电话、邮箱）
- 📈 **统计分析**: 实时显示申请人数据统计
- 📄 **CSV 导出**: 一键导出申请人信息为 CSV 文件
- ⚙️ **个性化配置**: 自定义自动回复消息和关键词

## 安装和使用

### 开发环境

1. 安装依赖：
```bash
pnpm install
# 或者
npm install
```

2. 启动开发服务器：
```bash
pnpm dev
# 或者
npm run dev
```

3. 在 Chrome 中加载扩展：
   - 打开 Chrome 浏览器
   - 进入 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `build/chrome-mv3-dev` 目录

### 生产环境构建

```bash
pnpm build
# 或者
npm run build
```

## 使用说明

1. **安装扩展后**，访问 hr.shixiseng.com 网站
2. **点击扩展图标** 打开控制面板
3. **配置自动回复** 消息和启用/禁用功能
4. **查看数据统计** 了解申请人信息收集情况
5. **导出 CSV** 下载申请人联系方式数据

## 项目结构

```
├── contents/
│   └── hr-automation.ts    # 内容脚本，负责页面自动化
├── src/
│   ├── types/
│   │   └── index.ts        # TypeScript 类型定义
│   └── utils/
│       ├── storage.ts      # 数据存储管理
│       └── csv.ts          # CSV 导出功能
├── background.ts           # 后台脚本
├── popup.tsx              # 弹出窗口界面
└── package.json           # 项目配置和依赖
```

## 技术栈

- **Plasmo**: Chrome 扩展开发框架
- **React**: 用户界面框架
- **TypeScript**: 类型安全的 JavaScript
- **PapaParse**: CSV 数据处理
- **Chrome APIs**: 存储、下载、标签页管理

## Making production build

Run the following:

```bash
pnpm build
# or
npm run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!
