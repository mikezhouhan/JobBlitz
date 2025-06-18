import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://hr.shixiseng.com/*"],
  run_at: "document_end"
}

console.log("✅ HR助手内容脚本已加载")

// 消息监听
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📨 收到消息:", request)
  
  if (request.action === 'getPageStats') {
    const cards = document.querySelectorAll('.resume-item')
    sendResponse({
      totalApplicants: cards.length,
      currentPage: window.location.href
    })
  } else if (request.action === 'startBatchProcess') {
    console.log("开始批量处理...")
    sendResponse({ success: true })
    // 这里添加批量处理逻辑
  }
  
  return true
})