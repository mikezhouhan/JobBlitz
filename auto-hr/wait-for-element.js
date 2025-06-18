// 辅助函数：等待元素出现
async function waitForElement(selector, maxWaitTime = 10000) {
  console.log(`等待元素出现: ${selector}`);
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`元素已出现: ${selector}`);
      return element;
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`等待超时，未找到元素: ${selector}`);
  return null;
}

// 测试等待详情页加载
async function testDetailPageLoading() {
  console.log("=== 测试详情页加载 ===");
  
  // 等待联系信息容器
  const container = await waitForElement('.phone-email, [class*="phone-email"]');
  if (container) {
    console.log("找到联系信息容器");
  }
  
  // 等待具体的联系信息元素
  const phoneItems = await waitForElement('.phone-email-item');
  if (phoneItems) {
    console.log("找到联系信息项");
    
    // 获取所有联系信息项
    const allItems = document.querySelectorAll('.phone-email-item');
    console.log(`共找到 ${allItems.length} 个联系信息项`);
    
    allItems.forEach((item, index) => {
      console.log(`项 ${index + 1}: ${item.textContent}`);
    });
  }
  
  // 检查是否有动态加载的指示器
  const loadingIndicators = document.querySelectorAll('.loading, [class*="loading"], .el-loading-mask');
  if (loadingIndicators.length > 0) {
    console.log("检测到加载指示器，等待加载完成...");
    
    // 等待加载指示器消失
    while (document.querySelector('.loading, [class*="loading"], .el-loading-mask')) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log("加载指示器已消失");
  }
}

// 执行测试
testDetailPageLoading();