// 测试脚本V2：基于提供的HTML结构精确查找
// 使用方法：在申请人详情页（弹窗打开后）运行此脚本

console.log("=== 开始查找详情页数据 V2 ===");

// 存储找到的数据
let foundData = {
  jobIntention: '',    // 求职意向
  appliedPosition: '', // 投递职位  
  onlineResume: ''     // 在线简历
};

// 1. 查找求职意向 - 在 main-detail-sub 中
console.log("\n1. 查找求职意向:");
const jobIntentionElement = document.querySelector('.exp-jobs');
if (jobIntentionElement) {
  const text = jobIntentionElement.textContent?.trim() || '';
  // 提取 "求职意向：" 后面的内容
  const match = text.match(/求职意向[：:]\s*(.+)/);
  if (match) {
    foundData.jobIntention = match[1].trim();
    console.log(`找到求职意向: ${foundData.jobIntention}`);
  }
} else {
  // 备选方法：在 main-detail-sub 中查找
  const mainDetailSub = document.querySelector('.main-detail-sub');
  if (mainDetailSub) {
    const spans = mainDetailSub.querySelectorAll('span');
    spans.forEach(span => {
      const text = span.textContent?.trim() || '';
      if (text.includes('求职意向')) {
        const match = text.match(/求职意向[：:]\s*(.+)/);
        if (match) {
          foundData.jobIntention = match[1].trim();
          console.log(`从 main-detail-sub 找到求职意向: ${foundData.jobIntention}`);
        }
      }
    });
  }
}

// 2. 查找投递职位 - 在 resume-tools__title 中
console.log("\n2. 查找投递职位:");
const positionElement = document.querySelector('.resume-tools__title');
if (positionElement) {
  const text = positionElement.textContent?.trim() || '';
  // 提取 "投递职位：" 后面的内容
  const match = text.match(/投递职位[：:]\s*(.+?)(?:·|$)/);
  if (match) {
    foundData.appliedPosition = match[1].trim();
    console.log(`找到投递职位: ${foundData.appliedPosition}`);
  } else {
    // 如果没有"投递职位："前缀，直接使用文本
    foundData.appliedPosition = text.replace(/·.+$/, '').trim();
    console.log(`找到投递职位（无前缀）: ${foundData.appliedPosition}`);
  }
}

// 3. 处理在线简历
console.log("\n3. 处理在线简历:");

// 方法1：获取整个在线简历内容的文本摘要
const resumeOnlineDiv = document.querySelector('.resume-online');
if (resumeOnlineDiv) {
  // 获取第一个section的内容作为摘要
  const firstSection = resumeOnlineDiv.querySelector('.resume-online-item__content');
  if (firstSection) {
    const summaryText = firstSection.textContent?.trim().substring(0, 100) + '...';
    foundData.onlineResume = `在线简历 - ${summaryText}`;
    console.log("在线简历内容摘要:", foundData.onlineResume);
  } else {
    foundData.onlineResume = '在线简历（已查看）';
  }
}

// 方法2：查找是否有简历链接
const resumeLinks = document.querySelectorAll('a[href*="resume"], a[href*="简历"]');
resumeLinks.forEach(link => {
  if (link.textContent?.includes('在线简历') || link.textContent?.includes('查看简历')) {
    foundData.onlineResume = link.textContent?.trim() || link.href;
    console.log("找到简历链接:", link.href);
  }
});

// 方法3：检查标签页状态
const onlineResumeTab = document.querySelector('#tab-在线简历');
if (onlineResumeTab && onlineResumeTab.classList.contains('is-active')) {
  if (!foundData.onlineResume) {
    foundData.onlineResume = '在线简历（当前查看）';
  }
  console.log("当前正在查看在线简历标签页");
}

// 4. 额外信息提取
console.log("\n4. 额外信息:");

// 提取姓名
const nameElement = document.querySelector('.main-name');
const name = nameElement?.textContent?.trim() || '';
console.log("姓名:", name);

// 提取基本信息
const mainDetail = document.querySelector('.main-detail');
if (mainDetail) {
  const details = Array.from(mainDetail.querySelectorAll('.main-detail__item')).map(el => el.textContent?.trim());
  console.log("基本信息:", details.join(' | '));
}

// 提取联系方式
const phoneElement = document.querySelector('.phone-email-item .icon_resume_phone')?.parentElement;
const emailElement = document.querySelector('.phone-email-item .icon_resume_email')?.parentElement;
const phone = phoneElement?.textContent?.trim().replace(/[^\d+\s()-]/g, '');
const email = emailElement?.textContent?.trim();
console.log("手机:", phone);
console.log("邮箱:", email);

// 5. 分析在线简历结构
console.log("\n5. 在线简历结构分析:");
const resumeSections = document.querySelectorAll('.resume-online-item');
console.log(`在线简历包含 ${resumeSections.length} 个部分:`);
resumeSections.forEach(section => {
  const title = section.querySelector('.resume-online-item__title')?.textContent?.trim();
  console.log(`- ${title}`);
});

// 6. 输出最终结果
console.log("\n=== 最终结果 ===");
console.log("求职意向:", foundData.jobIntention || '未找到');
console.log("投递职位:", foundData.appliedPosition || '未找到');
console.log("在线简历:", foundData.onlineResume || '未找到');

// 7. 建议的数据结构
console.log("\n=== 建议保存的数据 ===");
const suggestedData = {
  name: name,
  phone: phone,
  email: email,
  appliedPosition: foundData.appliedPosition,    // 投递职位：AI 大模型算法工程师
  jobIntention: foundData.jobIntention,          // 求职意向：算法工程师
  hasOnlineResume: !!resumeOnlineDiv,            // 是否有在线简历：true/false
  onlineResumeText: foundData.onlineResume,      // 在线简历文本描述
  resumeSections: Array.from(resumeSections).map(section => ({
    title: section.querySelector('.resume-online-item__title')?.textContent?.trim(),
    hasContent: !!section.querySelector('.resume-online-item__content')?.textContent?.trim()
  }))
};

console.log(suggestedData);

// 返回结果
foundData;