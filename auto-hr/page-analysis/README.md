# 实习僧 HR 系统页面分析

本目录用于收集和分析实习僧 HR 系统的页面结构，以便优化 Chrome 插件的功能。

## 目录结构

```
page-analysis/
├── README.md              # 本文件
├── screenshots/           # 页面截图
├── html-snippets/         # HTML 代码片段
├── css-selectors.md       # CSS 选择器总结
└── page-flow.md          # 页面流程分析
```

## 需要收集的信息

### 1. 页面截图
请将以下页面的截图保存到 `screenshots/` 目录：
- 申请人列表页面 ✅ (已有)
- 消息/沟通界面
- 申请人详情页面
- 其他相关页面

### 2. HTML 代码片段
请将关键元素的 HTML 代码保存到 `html-snippets/` 目录：
- 申请人卡片的 HTML 结构
- 消息输入框和发送按钮
- 沟通按钮的 HTML
- 申请人详细信息区域

### 3. CSS 选择器
在 `css-selectors.md` 中记录：
- 申请人信息的选择器
- 按钮元素的选择器
- 输入框的选择器
- 其他关键元素的选择器

### 4. 页面流程
在 `page-flow.md` 中记录：
- 从申请人列表到消息界面的流程
- 如何获取申请人详细联系方式
- 自动回复的最佳时机

## 如何使用

1. 将截图文件命名为描述性的名称，如：
   - `applicant-list.png`
   - `chat-interface.png`
   - `applicant-detail.png`

2. 将 HTML 片段保存为 `.html` 文件，如：
   - `applicant-card.html`
   - `chat-input.html`
   - `contact-button.html`

3. 在浏览器开发者工具中：
   - 右键点击目标元素
   - 选择"检查"
   - 在 Elements 面板中右键选择"Copy" → "Copy outerHTML"
   - 粘贴到对应的 HTML 文件中

这样可以帮助我更精确地优化插件功能！