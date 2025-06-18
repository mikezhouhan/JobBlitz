// 查找发送按钮的脚本
function findSendButton() {
  console.log("🔍 开始查找发送按钮...");
  
  // 方法1: 通过按钮文本查找
  const allButtons = document.querySelectorAll('button');
  console.log(`找到 ${allButtons.length} 个按钮`);
  
  let sendButton = null;
  allButtons.forEach((btn, index) => {
    const text = btn.textContent?.trim();
    if (text === '发送' || text === '送信' || text === 'Send') {
      console.log(`找到发送按钮 (方法1): 索引 ${index}, 文本: "${text}"`);
      console.log('按钮详情:', {
        className: btn.className,
        id: btn.id,
        outerHTML: btn.outerHTML.substring(0, 100),
        style: btn.getAttribute('style')
      });
      sendButton = btn;
    }
  });
  
  // 方法2: 通过class查找
  const possibleClasses = [
    '.send-btn',
    '.send-button',
    '[class*="send"]',
    '[class*="submit"]',
    '.btn-primary',
    '.message-send'
  ];
  
  possibleClasses.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`选择器 "${selector}" 找到 ${elements.length} 个元素`);
      elements.forEach(el => {
        if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'DIV') {
          console.log('可能的发送按钮:', {
            tagName: el.tagName,
            text: el.textContent?.trim(),
            className: el.className
          });
        }
      });
    }
  });
  
  // 方法3: 查找输入框附近的按钮
  const textarea = document.querySelector('textarea[placeholder="请输入"]');
  if (textarea) {
    console.log("找到输入框，查找附近的按钮...");
    
    // 查找输入框的父容器
    let parent = textarea.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
      const nearbyButtons = parent.querySelectorAll('button');
      if (nearbyButtons.length > 0) {
        console.log(`在第 ${depth} 层父元素中找到 ${nearbyButtons.length} 个按钮`);
        nearbyButtons.forEach(btn => {
          console.log('附近的按钮:', {
            text: btn.textContent?.trim(),
            className: btn.className,
            distance: depth
          });
        });
      }
      parent = parent.parentElement;
      depth++;
    }
  }
  
  // 方法4: 查找包含发送图标的元素
  const allElements = document.querySelectorAll('*');
  const sendElements = Array.from(allElements).filter(el => {
    const text = el.textContent?.trim();
    return text === '发送' && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'DIV' || el.tagName === 'SPAN');
  });
  
  console.log(`找到 ${sendElements.length} 个包含"发送"文本的元素`);
  sendElements.forEach(el => {
    console.log('发送元素:', {
      tagName: el.tagName,
      className: el.className,
      parent: el.parentElement?.className,
      clickable: el.onclick !== null || el.hasAttribute('onclick')
    });
  });
  
  return sendButton;
}

// 执行查找
findSendButton();