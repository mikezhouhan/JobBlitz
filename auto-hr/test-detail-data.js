// 测试脚本：在申请人详情页中查找求职意向、投递职位、在线简历
// 使用方法：在申请人详情页（弹窗打开后）运行此脚本

console.log("=== 开始查找详情页数据 ===");

// 存储找到的数据
let foundData = {
  jobIntention: '',    // 求职意向
  appliedPosition: '', // 投递职位
  onlineResume: ''     // 在线简历
};

// 1. 查找所有可能包含目标数据的元素
console.log("\n1. 扫描页面所有元素:");
const allElements = document.querySelectorAll('*');
const keywordElements = [];

allElements.forEach(el => {
  const text = el.textContent?.trim() || '';
  
  // 查找包含关键词的元素
  if (text && el.children.length === 0) { // 只看叶子节点
    if (text === '求职意向' || text === '求职意向：' || text === '求职意向:' ||
        text === '期望职位' || text === '期望职位：' || text === '期望职位:' ||
        text === '意向职位' || text === '意向职位：' || text === '意向职位:') {
      keywordElements.push({ type: 'jobIntention', element: el, text: text });
    }
    if (text === '投递职位' || text === '投递职位：' || text === '投递职位:' || 
        text === '应聘职位' || text === '应聘职位：' || text === '应聘职位:') {
      keywordElements.push({ type: 'appliedPosition', element: el, text: text });
    }
    if (text === '在线简历' || text === '在线简历：' || text === '在线简历:' || 
        text === '简历链接' || text === '简历链接：' || text === '简历链接:') {
      keywordElements.push({ type: 'onlineResume', element: el, text: text });
    }
  }
});

console.log(`找到 ${keywordElements.length} 个关键词元素`);

// 2. 对每个关键词元素，查找其对应的值
keywordElements.forEach(item => {
  console.log(`\n处理 "${item.text}":`);  
  console.log('  元素详情:', item.element);
  console.log('  元素class:', item.element.className);
  console.log('  父元素:', item.element.parentElement);
  console.log('  父元素class:', item.element.parentElement?.className);
  
  // 方法1: 查找下一个兄弟元素
  let nextSibling = item.element.nextElementSibling;
  if (nextSibling) {
    const nextText = nextSibling.textContent?.trim();
    console.log(`  下一个兄弟元素: ${nextText}`);
    console.log(`  下一个兄弟元素标签: ${nextSibling.tagName}`);
    
    // 特殊处理在线简历 - 可能是链接
    if (item.type === 'onlineResume') {
      const link = nextSibling.querySelector('a') || (nextSibling.tagName === 'A' ? nextSibling : null);
      if (link) {
        console.log(`  找到简历链接: ${link.href}`);
        console.log(`  链接文本: ${link.textContent?.trim()}`);
        foundData[item.type] = link.textContent?.trim() || link.href;
      } else if (nextText && !nextText.includes('附件')) {
        foundData[item.type] = nextText;
      }
    } else if (nextText && !foundData[item.type]) {
      foundData[item.type] = nextText;
    }
  }
  
  // 方法2: 查找父元素的下一个兄弟
  const parent = item.element.parentElement;
  if (parent) {
    const parentNext = parent.nextElementSibling;
    if (parentNext) {
      const parentNextText = parentNext.textContent?.trim();
      console.log(`  父元素的下一个兄弟: ${parentNextText}`);
      if (parentNextText && !foundData[item.type]) {
        foundData[item.type] = parentNextText;
      }
    }
    
    // 方法3: 在父元素内查找（标签和值可能在同一个容器内）
    const parentText = parent.textContent?.trim();
    if (parentText && parentText !== item.text) {
      // 移除标签文本，获取剩余内容
      const valueText = parentText.replace(item.text, '').trim();
      if (valueText) {
        console.log(`  同一容器内的值: ${valueText}`);
        if (!foundData[item.type]) {
          foundData[item.type] = valueText;
        }
      }
    }
  }
  
  // 方法4: 查找最近的包含类名的容器
  const containers = [
    item.element.closest('.form-item'),
    item.element.closest('.detail-item'),
    item.element.closest('[class*="item"]'),
    item.element.closest('[class*="row"]'),
    item.element.closest('[class*="field"]')
  ];
  
  containers.forEach((container, index) => {
    if (container && !foundData[item.type]) {
      const containerText = container.textContent?.trim();
      if (containerText && containerText !== item.text) {
        const valueText = containerText.replace(item.text, '').trim();
        if (valueText && valueText.length < 200) {
          console.log(`  容器${index}内的值: ${valueText}`);
          foundData[item.type] = valueText;
        }
      }
    }
  });
});

// 3. 通过class查找
console.log("\n3. 通过class属性查找:");
const classSelectors = {
  jobIntention: ['.job-intention', '.intention', '[class*="intention"]', '[class*="expect"]'],
  appliedPosition: ['.applied-position', '.position', '[class*="position"]:not(.position-name)'],
  onlineResume: ['.online-resume', '.resume-link', '[class*="resume"]:not(.resume-item)']
};

Object.entries(classSelectors).forEach(([type, selectors]) => {
  if (!foundData[type]) {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          if (text && text.length > 2 && text.length < 200) {
            console.log(`${type} - ${selector}: ${text}`);
            foundData[type] = text;
            break;
          }
        }
      } catch (e) {}
    }
  }
});

// 4. 查找链接（在线简历通常是链接）
if (!foundData.onlineResume) {
  console.log("\n4. 查找简历链接:");
  const links = document.querySelectorAll('a');
  links.forEach(link => {
    const href = link.href;
    const text = link.textContent?.trim();
    
    if (href && (href.includes('resume') || href.includes('简历') || 
                 text?.includes('查看简历') || text?.includes('在线简历'))) {
      console.log(`找到简历链接: ${href}`);
      console.log(`链接文本: ${text}`);
      if (!foundData.onlineResume) {
        foundData.onlineResume = href;
      }
    }
  });
}

// 5. 使用表格结构查找
console.log("\n5. 查找表格结构:");
const tables = document.querySelectorAll('table');
const dls = document.querySelectorAll('dl');
const formItems = document.querySelectorAll('.el-form-item, .form-item');

// 处理表格
tables.forEach(table => {
  const rows = table.querySelectorAll('tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td, th');
    if (cells.length >= 2) {
      const label = cells[0].textContent?.trim();
      const value = cells[1].textContent?.trim();
      
      if (label?.includes('求职意向') && !foundData.jobIntention) {
        foundData.jobIntention = value || '';
      }
      if (label?.includes('投递职位') && !foundData.appliedPosition) {
        foundData.appliedPosition = value || '';
      }
      if (label?.includes('在线简历') && !foundData.onlineResume) {
        foundData.onlineResume = value || '';
      }
    }
  });
});

// 处理定义列表
dls.forEach(dl => {
  const dts = dl.querySelectorAll('dt');
  const dds = dl.querySelectorAll('dd');
  
  dts.forEach((dt, index) => {
    const label = dt.textContent?.trim();
    const dd = dds[index];
    const value = dd?.textContent?.trim();
    
    if (label?.includes('求职意向') && !foundData.jobIntention) {
      foundData.jobIntention = value || '';
    }
    if (label?.includes('投递职位') && !foundData.appliedPosition) {
      foundData.appliedPosition = value || '';
    }
    if (label?.includes('在线简历') && !foundData.onlineResume) {
      foundData.onlineResume = value || '';
    }
  });
});

// 6. 深度查找求职意向（使用更广泛的搜索）
if (!foundData.jobIntention) {
  console.log("\n6. 深度查找求职意向:");
  
  // 查找所有文本节点
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent?.trim();
    if (text && (text.includes('求职意向') || text.includes('期望职位') || text.includes('意向职位'))) {
      console.log(`找到包含关键词的文本: ${text}`);
      
      // 获取父元素
      const parent = node.parentElement;
      if (parent) {
        console.log(`父元素: ${parent.tagName}.${parent.className}`);
        console.log(`父元素完整文本: ${parent.textContent?.trim()}`);
        
        // 尝试提取值
        const fullText = parent.textContent?.trim() || '';
        const valueMatch = fullText.match(/(?:求职意向|期望职位|意向职位)[：:]\s*(.+?)(?:\s{2,}|$)/);
        if (valueMatch) {
          foundData.jobIntention = valueMatch[1].trim();
          console.log(`提取到求职意向: ${foundData.jobIntention}`);
        }
      }
    }
  }
}

// 7. 查找所有包含职位相关信息的容器
console.log("\n7. 查找职位信息容器:");
const containers = document.querySelectorAll('[class*="info"], [class*="detail"], [class*="content"]');
containers.forEach(container => {
  const text = container.textContent?.trim();
  if (text && text.length < 500) {
    if (text.includes('求职意向') || text.includes('投递职位') || text.includes('在线简历')) {
      console.log(`\n容器 ${container.className}:`);
      console.log(text.substring(0, 200) + '...');
    }
  }
});

// 8. 输出结果
console.log("\n=== 查找结果 ===");
console.log("求职意向:", foundData.jobIntention || '未找到');
console.log("投递职位:", foundData.appliedPosition || '未找到');
console.log("在线简历:", foundData.onlineResume || '未找到');

// 9. 特别查找在线简历和附件简历的区别
console.log("\n=== 查找简历相关元素 ===");
const resumeElements = document.querySelectorAll('*');
resumeElements.forEach(el => {
  const text = el.textContent?.trim();
  if (text && (text === '在线简历' || text === '附件简历') && el.children.length === 0) {
    console.log(`\n找到: ${text}`);
    console.log('元素:', el);
    console.log('父元素:', el.parentElement);
    console.log('父元素HTML:', el.parentElement?.outerHTML);
    
    // 查找相邻的所有兄弟元素
    let sibling = el.nextElementSibling;
    let siblingIndex = 1;
    while (sibling && siblingIndex <= 3) {
      console.log(`兄弟元素${siblingIndex}: ${sibling.tagName}`);
      console.log(`  内容: ${sibling.textContent?.trim()}`);
      if (sibling.querySelector('a')) {
        const link = sibling.querySelector('a');
        console.log(`  包含链接: ${link.href}`);
        console.log(`  链接文本: ${link.textContent?.trim()}`);
      }
      sibling = sibling.nextElementSibling;
      siblingIndex++;
    }
  }
});

// 10. 输出页面结构供调试
console.log("\n=== 页面结构分析 ===");
console.log("URL:", window.location.href);
console.log("弹窗元素:", document.querySelector('.el-dialog'));

// 查找主要内容区域
const dialogBody = document.querySelector('.el-dialog__body');
if (dialogBody) {
  console.log("\n弹窗内容结构:");
  const topLevelChildren = dialogBody.children;
  Array.from(topLevelChildren).forEach((child, index) => {
    console.log(`第${index + 1}层 (${child.tagName}.${child.className}):`);
    const text = child.textContent?.trim();
    if (text && text.length < 500) {
      console.log(`  内容预览: ${text.substring(0, 100)}...`);
    }
  });
}

console.log("\n=== 完成 ===");
console.log("提示：如果某些数据未找到，请查看上面的日志了解页面结构");

// 返回结果
foundData;