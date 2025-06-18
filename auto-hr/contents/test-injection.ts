import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://hr.shixiseng.com/*"],
  all_frames: false,
  run_at: "document_idle"
}

console.log("🚀 测试内容脚本已注入!", window.location.href)

// 立即检查页面元素
const cards = document.querySelectorAll('.resume-item')
console.log(`🔍 立即检测到 ${cards.length} 个申请人卡片`)

// 标记脚本已加载
window.__hrTestScriptLoaded = true

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📨 测试脚本收到消息:", request)
  
  if (request.action === 'testPing') {
    sendResponse({ 
      pong: true, 
      cards: document.querySelectorAll('.resume-item').length,
      url: window.location.href
    })
  }
  
  return true
})

declare global {
  interface Window {
    __hrTestScriptLoaded: boolean
  }
}