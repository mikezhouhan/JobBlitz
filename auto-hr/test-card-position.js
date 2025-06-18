// 测试脚本：在申请人列表页查找卡片上的投递职位
// 使用方法：在申请人列表页打开控制台，粘贴运行此脚本

console.log("=== 开始查找卡片上的投递职位 ===");

// 获取所有申请人卡片
const cards = document.querySelectorAll('.resume-item');
console.log(`找到 ${cards.length} 个申请人卡片`);

cards.forEach((card, index) => {
  console.log(`\n--- 卡片 ${index + 1} ---`);
  
  // 1. 查找卡片顶部/头部区域
  console.log("1. 查找卡片顶部区域:");
  const headerSelectors = [
    '.resume-item__header',
    '.card-header',
    '[class*="header"]',
    '.resume-item > div:first-child',
    '.resume-item > *:first-child'
  ];
  
  headerSelectors.forEach(selector => {
    const header = card.querySelector(selector);
    if (header) {
      const text = header.textContent?.trim();
      if (text) {
        console.log(`${selector}: ${text.substring(0, 100)}`);
      }
    }
  });
  
  // 2. 查找第一行内容
  console.log("\n2. 查找第一行内容:");
  const firstLineElements = card.querySelectorAll('div, span');
  let foundPosition = false;
  
  for (const elem of firstLineElements) {
    const text = elem.textContent?.trim();
    // 查找包含"转发"或时间格式的元素，职位通常在其附近
    if (text && (text.includes('转发') || text.match(/\d{4}-\d{2}-\d{2}/))) {
      console.log("找到包含时间/转发的元素:", text);
      
      // 查找父元素
      const parent = elem.parentElement;
      if (parent) {
        console.log("父元素内容:", parent.textContent?.trim());
        
        // 查找兄弟元素
        const siblings = Array.from(parent.children);
        siblings.forEach((sibling, i) => {
          const siblingText = sibling.textContent?.trim();
          if (siblingText && !siblingText.includes('转发') && !siblingText.match(/\d{4}-\d{2}-\d{2}/)) {
            console.log(`兄弟元素${i}: ${siblingText}`);
          }
        });
      }
      
      foundPosition = true;
      break;
    }
  }
  
  // 3. 分析卡片结构
  if (!foundPosition) {
    console.log("\n3. 分析卡片结构:");
    const topLevel = card.children;
    Array.from(topLevel).forEach((child, i) => {
      const text = child.textContent?.trim();
      if (text && text.length < 200) {
        console.log(`顶层子元素${i} (${child.tagName}.${child.className}):`);
        console.log(`  内容: ${text.substring(0, 100)}`);
        
        // 如果是第一个元素，尝试提取职位
        if (i === 0) {
          // 尝试分割文本
          const parts = text.split(/\s{2,}|\t/);
          if (parts.length > 1) {
            console.log("  分割后的部分:");
            parts.forEach((part, j) => {
              console.log(`    ${j}: ${part.trim()}`);
            });
          }
        }
      }
    });
  }
  
  // 4. 查找申请人姓名，职位通常在姓名上方
  const nameElement = card.querySelector('.resume-info__center-name');
  if (nameElement) {
    console.log("\n4. 申请人姓名:", nameElement.textContent?.trim());
    
    // 查找姓名元素的前面兄弟或父元素的前面兄弟
    let current = nameElement;
    while (current) {
      current = current.previousElementSibling || current.parentElement?.previousElementSibling;
      if (current) {
        const text = current.textContent?.trim();
        if (text && text.length > 2 && text.length < 50) {
          console.log("姓名前的元素:", text);
          break;
        }
      }
    }
  }
});

console.log("\n=== 查找完成 ===");
console.log("提示：职位通常在卡片最上方，与投递时间和转发按钮在同一行");