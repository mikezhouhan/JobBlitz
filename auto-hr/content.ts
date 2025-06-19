import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://hr.shixiseng.com/*"]
}

// 立即标记脚本已加载
console.log("🚀 HR自动化内容脚本已加载!", window.location.href)

// 设置全局标记
;(window as any).__hrAutomationLoaded = true

// 页面检测函数
function detectApplicants() {
  const cards = document.querySelectorAll('.resume-item')
  console.log(`检测到 ${cards.length} 个申请人`)
  return cards.length
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("收到消息:", request.action)
  
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
      console.log("开始批量处理...")
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
  console.log("页面加载完成，申请人数量:", detectApplicants())
})