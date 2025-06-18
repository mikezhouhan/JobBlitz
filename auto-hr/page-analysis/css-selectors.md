# CSS 选择器参考

基于已收集的页面信息，记录实习僧 HR 系统的关键 CSS 选择器。

## 申请人相关选择器

### 申请人卡片
```css
/* 基于页面分析推测的选择器 */
[class*="resumeCard"]
[class*="candidate"]
[class*="applicant"]
div:has(button:contains("沟通"))
```

### 申请人信息字段
```css
/* 姓名 */
.name
[class*="name"]

/* 年龄 */
span:contains("岁")

/* 现居地 */
span:contains("现居:")

/* 联系方式 */
.phone, [class*="phone"]
.email, [class*="email"]
a[href^="tel:"]
a[href^="mailto:"]
```

## 按钮选择器

### 沟通按钮
```css
button:contains("沟通")
[class*="contact-btn"]
[class*="chat-btn"]
```

### 其他操作按钮
```css
button:contains("通过初筛")
button:contains("不合适")
button:contains("添加标签")
```

## 消息相关选择器

### 消息输入区域
```css
/* 待补充：需要消息界面的 HTML */
textarea[placeholder*="输入"]
input[placeholder*="消息"]
[class*="message-input"]
[class*="chat-input"]
```

### 发送按钮
```css
/* 待补充：需要消息界面的 HTML */
button:contains("发送")
[class*="send-btn"]
[class*="submit-btn"]
```

### 消息列表
```css
/* 待补充：需要消息界面的 HTML */
[class*="message-list"]
[class*="chat-history"]
.message-item
```

## 页面容器选择器

### 主要内容区域
```css
/* 申请人列表容器 */
[class*="candidate-list"]
[class*="resume-list"]

/* 筛选条件区域 */
[class*="filter"]
[class*="search"]
```

## 注意事项

1. **动态类名**: 实习僧可能使用动态生成的类名，需要使用部分匹配 `[class*="..."]`
2. **文本选择器**: `button:contains("沟通")` 语法在某些情况下可能不工作，需要使用 JavaScript 查找
3. **嵌套结构**: 申请人信息可能嵌套在多层 div 中，需要遍历查找

## 待完善

- [ ] 消息界面的具体选择器
- [ ] 申请人详情页面的选择器  
- [ ] 分页和加载更多的选择器
- [ ] 错误提示和确认对话框的选择器