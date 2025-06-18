// 测试脚本：在详情页中查找联系方式
// 使用方法：在申请人详情页打开控制台，粘贴运行此脚本

console.log("=== 开始查找联系方式 ===");

// 0. 优先查找 phone-email 组合元素
console.log("\n0. 查找 phone-email 组合元素：");
const phoneEmailElements = document.querySelectorAll('.phone-email, [class*="phone-email"]');
console.log("找到", phoneEmailElements.length, "个 phone-email 元素");
phoneEmailElements.forEach((el, i) => {
  const text = el.textContent || '';
  console.log(`元素${i+1}:`, el.className, "内容:", text);
  
  // 尝试提取手机号和邮箱
  const phoneMatch = text.match(/(?:\+86\s*)?1[3-9]\d{9}/);
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/);
  
  if (phoneMatch) {
    console.log("  - 提取的手机号:", phoneMatch[0].replace(/\+86\s*/, ''));
  }
  if (emailMatch) {
    console.log("  - 提取的邮箱:", emailMatch[0]);
  }
});

// 1. 查找手机号
console.log("\n1. 查找手机号：");

// 方法1：通过class属性查找
const phoneClasses = document.querySelectorAll('[class*="phone"], [class*="mobile"], [class*="tel"], [class*="contact"]');
console.log("通过class查找:", phoneClasses.length, "个元素");
phoneClasses.forEach((el, i) => {
  const text = el.textContent || '';
  if (text.match(/1[3-9]\d{9}/)) {
    console.log(`  元素${i+1}:`, el.className, "内容:", text);
  }
});

// 方法2：通过标签文本查找
const allElements = document.querySelectorAll('*');
const phoneLabels = [];
allElements.forEach(el => {
  const text = el.textContent || '';
  if ((text.includes('手机') || text.includes('电话') || text.includes('联系方式')) && 
      text.match(/1[3-9]\d{9}/)) {
    phoneLabels.push({
      element: el,
      text: text.substring(0, 100),
      selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : '')
    });
  }
});
console.log("通过标签文本查找:", phoneLabels.length, "个元素");
phoneLabels.forEach((item, i) => {
  console.log(`  元素${i+1}:`, item.selector, "内容:", item.text);
});

// 方法3：直接在页面文本中查找
const bodyText = document.body.textContent || '';
const phoneMatches = bodyText.match(/1[3-9]\d{9}/g);
if (phoneMatches) {
  console.log("页面中找到的手机号:", [...new Set(phoneMatches)]);
}

// 2. 查找邮箱
console.log("\n2. 查找邮箱：");

// 方法1：通过class属性查找
const emailClasses = document.querySelectorAll('[class*="email"], [class*="mail"], [class*="contact"]');
console.log("通过class查找:", emailClasses.length, "个元素");
emailClasses.forEach((el, i) => {
  const text = el.textContent || '';
  if (text.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/)) {
    console.log(`  元素${i+1}:`, el.className, "内容:", text);
  }
});

// 方法2：通过标签文本查找
const emailLabels = [];
allElements.forEach(el => {
  const text = el.textContent || '';
  if ((text.includes('邮箱') || text.includes('Email') || text.includes('email')) && 
      text.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/)) {
    emailLabels.push({
      element: el,
      text: text.substring(0, 100),
      selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : '')
    });
  }
});
console.log("通过标签文本查找:", emailLabels.length, "个元素");
emailLabels.forEach((item, i) => {
  console.log(`  元素${i+1}:`, item.selector, "内容:", item.text);
});

// 方法3：直接在页面文本中查找
const emailMatches = bodyText.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/g);
if (emailMatches) {
  console.log("页面中找到的邮箱:", [...new Set(emailMatches)]);
}

// 3. 查找可能包含联系方式的区域
console.log("\n3. 可能包含联系方式的区域：");
const contactSections = document.querySelectorAll(
  '[class*="info"], [class*="contact"], [class*="detail"], [class*="profile"], ' +
  '[class*="personal"], [class*="basic"], section, .card, .panel'
);
console.log("找到", contactSections.length, "个可能的区域");

// 4. 输出页面结构提示
console.log("\n4. 页面结构分析：");
console.log("页面标题:", document.title);
console.log("URL:", window.location.href);

// 查找主要内容区域
const mainContent = document.querySelector('main, [role="main"], .main-content, #main');
if (mainContent) {
  console.log("主内容区域:", mainContent.className || mainContent.id || mainContent.tagName);
}

console.log("\n=== 查找完成 ===");
console.log("提示：如果没有找到联系方式，可能需要：");
console.log("1. 检查是否需要先点击某个标签页或展开按钮");
console.log("2. 检查联系方式是否在iframe中");
console.log("3. 检查是否需要特定权限才能查看");