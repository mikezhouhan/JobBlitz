import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://hr.shixiseng.com/*"]
}

// 立即标记脚本已加载

// 设置全局标记
;(window as any).__hrAutomationLoaded = true

// 页面检测函数
function detectApplicants() {
  const cards = document.querySelectorAll('.resume-item')
  return cards.length
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  switch (request.action) {
    case 'ping':
      sendResponse({ pong: true, loaded: true })
      break
      
    case 'getPageStats':
      const totalApplicants = detectApplicants()
      sendResponse({
        totalApplicants,
        currentPage: window.location.href,
        timestamp: new Date().toISOString()
      })
      break
      
    case 'startBatchProcess':
      // 这里添加批量处理逻辑
      sendResponse({ success: true })
      break
      
    default:
      sendResponse({ error: 'Unknown action' })
  }
  
  return true
})

// 页面加载完成后再次检测
window.addEventListener('load', () => {
  detectApplicants()
})