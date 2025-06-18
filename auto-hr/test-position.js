// 测试脚本：在详情页中查找职位信息
// 使用方法：在申请人详情页打开控制台，粘贴运行此脚本

console.log("=== 开始查找职位信息 ===");

// 1. 通过class查找
console.log("\n1. 通过class查找职位:");
const positionClasses = [
  '.position-name',
  '.job-name',
  '.job-title',
  '.position',
  '.job',
  '[class*="position"]',
  '[class*="job"]',
  '[class*="title"]',
  '[class*="role"]'
];

positionClasses.forEach(selector => {
  try {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`${selector}: 找到 ${elements.length} 个元素`);
      elements.forEach((el, i) => {
        const text = el.textContent?.trim();
        if (text && text.length < 100) {
          console.log(`  - ${text}`);
        }
      });
    }
  } catch (e) {}
});

// 2. 通过标题标签查找
console.log("\n2. 通过标题标签查找:");
const headings = document.querySelectorAll('h1, h2, h3, h4');
headings.forEach((heading, i) => {
  const text = heading.textContent?.trim();
  if (text && text.length > 2 && text.length < 50) {
    console.log(`${heading.tagName}: ${text}`);
  }
});

// 3. 通过文本内容查找
console.log("\n3. 查找包含特定关键词的元素:");
const keywords = ['工程师', '经理', '专员', '主管', '开发', '设计', '运营', '产品', '销售', '实习'];
const allElements = document.querySelectorAll('*');
const foundPositions = new Set();

allElements.forEach(el => {
  const text = el.textContent?.trim();
  if (text && text.length > 2 && text.length < 50 && el.children.length === 0) {
    keywords.forEach(keyword => {
      if (text.includes(keyword) && !text.includes('申请') && !text.includes('简历')) {
        foundPositions.add({
          text: text,
          selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''),
          element: el
        });
      }
    });
  }
});

console.log("可能的职位名称:");
foundPositions.forEach(item => {
  console.log(`${item.selector}: ${item.text}`);
});

// 4. 查找页面结构
console.log("\n4. 页面结构分析:");
console.log("当前URL:", window.location.href);
console.log("页面标题:", document.title);

// 查找包含"投递"或"职位"的元素
const applyElements = document.querySelectorAll('*');
applyElements.forEach(el => {
  const text = el.textContent?.trim();
  if (text && (text.includes('投递职位') || text.includes('应聘职位') || text.includes('申请职位'))) {
    console.log("\n找到职位相关元素:");
    console.log("元素:", el);
    console.log("文本:", text);
    
    // 查找附近的元素
    const nextElement = el.nextElementSibling;
    const parentElement = el.parentElement;
    
    if (nextElement) {
      console.log("下一个元素:", nextElement.textContent?.trim());
    }
    if (parentElement) {
      console.log("父元素子元素:");
      Array.from(parentElement.children).forEach((child, i) => {
        console.log(`  子元素${i}: ${child.textContent?.trim()}`);
      });
    }
  }
});

console.log("\n=== 查找完成 ===");