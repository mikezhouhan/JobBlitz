// 测试脚本：提取详细简历信息
// 使用方法：在申请人详情页（弹窗打开后）运行此脚本

console.log("=== 开始提取详细简历信息 ===");

// 模拟提取函数
function extractDetailedResumeInfo() {
  const detailInfo = {
    resumeDetails: {
      educationHistory: [],
      internshipHistory: [],
      projectHistory: [],
      academicHistory: [],
      honors: [],
      skills: [],
      otherSections: []
    }
  };

  // 1. 提取基本信息
  const nameElement = document.querySelector('.main-name');
  if (nameElement) {
    detailInfo.name = nameElement.textContent?.trim();
    console.log('姓名:', detailInfo.name);
  }

  // 2. 提取联系方式
  const phoneElement = document.querySelector('.phone-email-item .icon_resume_phone')?.parentElement;
  const emailElement = document.querySelector('.phone-email-item .icon_resume_email')?.parentElement;
  if (phoneElement) {
    detailInfo.phone = phoneElement.textContent?.trim().replace(/[^\d+\s()-]/g, '') || '';
    console.log('电话:', detailInfo.phone);
  }
  if (emailElement) {
    detailInfo.email = emailElement.textContent?.trim() || '';
    console.log('邮箱:', detailInfo.email);
  }

  // 3. 提取求职意向
  const jobIntentionElement = document.querySelector('.exp-jobs');
  if (jobIntentionElement) {
    const text = jobIntentionElement.textContent?.trim() || '';
    const match = text.match(/求职意向[：:]\s*(.+)/);
    if (match) {
      detailInfo.jobIntention = match[1].trim();
      console.log('求职意向:', detailInfo.jobIntention);
    }
  }

  // 4. 提取在线简历各个部分
  const resumeSections = document.querySelectorAll('.resume-online-item');
  console.log(`\n找到 ${resumeSections.length} 个简历部分`);
  
  resumeSections.forEach(section => {
    const titleElement = section.querySelector('.resume-online-item__title');
    const contentElement = section.querySelector('.resume-online-item__content');
    
    if (!titleElement || !contentElement) return;
    
    const sectionTitle = titleElement.textContent?.trim() || '';
    console.log(`\n处理部分: ${sectionTitle}`);
    
    switch (sectionTitle) {
      case '教育经历':
        extractEducationHistory(contentElement, detailInfo.resumeDetails);
        break;
      case '实习经历':
      case '工作经历':
        extractInternshipHistory(contentElement, detailInfo.resumeDetails);
        break;
      case '项目经历':
        extractProjectHistory(contentElement, detailInfo.resumeDetails);
        break;
      case '学术经历':
        extractAcademicHistory(contentElement, detailInfo.resumeDetails);
        break;
      case '荣誉奖项':
        extractHonors(contentElement, detailInfo.resumeDetails);
        break;
      case '技能':
      case '专业技能':
        extractSkills(contentElement, detailInfo.resumeDetails);
        break;
      case '自我评价':
        detailInfo.resumeDetails.selfEvaluation = contentElement.textContent?.trim();
        console.log('自我评价:', detailInfo.resumeDetails.selfEvaluation?.substring(0, 100) + '...');
        break;
      default:
        // 其他未识别的部分
        detailInfo.resumeDetails.otherSections.push({
          title: sectionTitle,
          content: contentElement.textContent?.trim() || ''
        });
        console.log(`其他部分 - ${sectionTitle}:`, contentElement.textContent?.trim().substring(0, 100) + '...');
    }
  });

  return detailInfo;
}

// 提取教育经历
function extractEducationHistory(element, resumeDetails) {
  const items = element.querySelectorAll('.experience-item');
  console.log(`  找到 ${items.length} 个教育经历项`);
  
  items.forEach((item, index) => {
    const periodElement = item.querySelector('.experience-time');
    const schoolElement = item.querySelector('.experience-item__title') || item.querySelector('h4');
    const majorElement = item.querySelector('.experience-item__desc') || item.querySelector('p');
    const descElement = item.querySelector('.experience-item__detail');
    
    const education = {
      period: periodElement?.textContent?.trim() || '',
      school: schoolElement?.textContent?.trim() || '',
      major: '',
      degree: '',
      description: descElement?.textContent?.trim() || ''
    };
    
    // 从专业信息中提取学历和专业
    const majorText = majorElement?.textContent?.trim() || '';
    const majorMatch = majorText.match(/(.+?)\s*[·|｜]\s*(.+)/);
    if (majorMatch) {
      education.major = majorMatch[1].trim();
      education.degree = majorMatch[2].trim();
    } else {
      education.major = majorText;
    }
    
    if (education.school) {
      resumeDetails.educationHistory.push(education);
      console.log(`  教育经历 ${index + 1}:`, education);
    }
  });
}

// 提取实习经历
function extractInternshipHistory(element, resumeDetails) {
  const items = element.querySelectorAll('.experience-item');
  console.log(`  找到 ${items.length} 个实习经历项`);
  
  items.forEach((item, index) => {
    const periodElement = item.querySelector('.experience-time');
    const companyElement = item.querySelector('.experience-item__title') || item.querySelector('h4');
    const positionElement = item.querySelector('.experience-item__desc') || item.querySelector('p');
    const descElement = item.querySelector('.experience-item__detail');
    
    const internship = {
      period: periodElement?.textContent?.trim() || '',
      company: companyElement?.textContent?.trim() || '',
      position: positionElement?.textContent?.trim() || '',
      description: descElement?.textContent?.trim() || ''
    };
    
    if (internship.company) {
      resumeDetails.internshipHistory.push(internship);
      console.log(`  实习经历 ${index + 1}:`, internship);
    }
  });
}

// 提取项目经历
function extractProjectHistory(element, resumeDetails) {
  const items = element.querySelectorAll('.experience-item');
  console.log(`  找到 ${items.length} 个项目经历项`);
  
  items.forEach((item, index) => {
    const periodElement = item.querySelector('.experience-time');
    const nameElement = item.querySelector('.experience-item__title') || item.querySelector('h4');
    const roleElement = item.querySelector('.experience-item__desc') || item.querySelector('p');
    const descElement = item.querySelector('.experience-item__detail');
    
    const project = {
      period: periodElement?.textContent?.trim() || '',
      name: nameElement?.textContent?.trim() || '',
      role: roleElement?.textContent?.trim() || '',
      description: descElement?.textContent?.trim() || ''
    };
    
    if (project.name) {
      resumeDetails.projectHistory.push(project);
      console.log(`  项目经历 ${index + 1}:`, project);
    }
  });
}

// 提取学术经历
function extractAcademicHistory(element, resumeDetails) {
  const items = element.querySelectorAll('.experience-item');
  console.log(`  找到 ${items.length} 个学术经历项`);
  
  items.forEach((item, index) => {
    const periodElement = item.querySelector('.experience-time');
    const titleElement = item.querySelector('.experience-item__title') || item.querySelector('h4');
    const typeElement = item.querySelector('.experience-item__desc') || item.querySelector('p');
    const descElement = item.querySelector('.experience-item__detail');
    
    const academic = {
      period: periodElement?.textContent?.trim() || '',
      title: titleElement?.textContent?.trim() || '',
      type: typeElement?.textContent?.trim() || '',
      description: descElement?.textContent?.trim() || ''
    };
    
    if (academic.title) {
      resumeDetails.academicHistory.push(academic);
      console.log(`  学术经历 ${index + 1}:`, academic);
    }
  });
}

// 提取荣誉奖项
function extractHonors(element, resumeDetails) {
  const items = element.querySelectorAll('.honor-item') || element.querySelectorAll('li');
  console.log(`  找到 ${items.length} 个荣誉奖项`);
  
  items.forEach((item, index) => {
    const text = item.textContent?.trim() || '';
    // 尝试解析格式: "2023-05 国家级 奖项名称"
    const match = text.match(/(\d{4}-\d{2})?\s*([^\s]+级)?\s*(.+)/);
    
    if (match) {
      const honor = {
        date: match[1] || '',
        level: match[2] || '',
        name: match[3]?.trim() || text
      };
      
      if (honor.name) {
        resumeDetails.honors.push(honor);
        console.log(`  荣誉 ${index + 1}:`, honor);
      }
    } else if (text) {
      // 如果无法解析，直接保存原文
      resumeDetails.honors.push({
        date: '',
        level: '',
        name: text
      });
      console.log(`  荣誉 ${index + 1}:`, text);
    }
  });
}

// 提取技能
function extractSkills(element, resumeDetails) {
  const skillText = element.textContent?.trim() || '';
  console.log(`  技能原文:`, skillText);
  
  // 尝试按类别分组（如：编程语言：xxx；工具：xxx）
  const categoryMatches = skillText.match(/([^：:]+)[：:]([^；;]+)/g);
  
  if (categoryMatches) {
    categoryMatches.forEach((match, index) => {
      const [category, items] = match.split(/[：:]/);
      const skill = {
        category: category.trim(),
        items: items.split(/[,，、]/).map(item => item.trim())
      };
      resumeDetails.skills.push(skill);
      console.log(`  技能类别 ${index + 1}:`, skill);
    });
  } else {
    // 如果没有明确分类，作为一个整体
    const items = skillText.split(/[,，、；;]/).map(item => item.trim()).filter(item => item);
    if (items.length > 0) {
      const skill = {
        category: '技能',
        items: items
      };
      resumeDetails.skills.push(skill);
      console.log(`  技能:`, skill);
    }
  }
}

// 执行提取
const result = extractDetailedResumeInfo();

console.log('\n=== 提取结果汇总 ===');
console.log('基本信息:', {
  name: result.name,
  phone: result.phone,
  email: result.email,
  jobIntention: result.jobIntention
});

console.log('\n简历详情统计:');
console.log(`- 教育经历: ${result.resumeDetails.educationHistory.length} 条`);
console.log(`- 实习经历: ${result.resumeDetails.internshipHistory.length} 条`);
console.log(`- 项目经历: ${result.resumeDetails.projectHistory.length} 条`);
console.log(`- 学术经历: ${result.resumeDetails.academicHistory.length} 条`);
console.log(`- 荣誉奖项: ${result.resumeDetails.honors.length} 条`);
console.log(`- 技能类别: ${result.resumeDetails.skills.length} 个`);
console.log(`- 其他部分: ${result.resumeDetails.otherSections.length} 个`);

console.log('\n完整结果对象:', result);

// 返回结果
result;