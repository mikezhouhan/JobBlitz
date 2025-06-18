import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://hr.shixiseng.com/*"]
}

console.log("🚀 HR自动化内容脚本已加载!")

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📨 收到消息:", request.action)
  
  if (request.action === 'getPageStats') {
    const cards = document.querySelectorAll('.resume-item')
    const stats = {
      totalApplicants: cards.length,
      currentPage: window.location.href,
      timestamp: new Date().toISOString()
    }
    console.log("📊 返回统计:", stats)
    sendResponse(stats)
  } else if (request.action === 'ping') {
    sendResponse({ pong: true, loaded: true })
  } else if (request.action === 'startBatchProcess') {
    console.log("🔄 开始批量处理...")
    batchProcess(request.config)
    sendResponse({ success: true })
  }
  
  return true
})

// 批量处理函数
async function batchProcess(config: any) {
  console.log("配置:", config)
  const cards = document.querySelectorAll('.resume-item')
  console.log(`找到 ${cards.length} 个申请人`)
  
  // TODO: 实现批量处理逻辑
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i] as HTMLElement
    console.log(`处理第 ${i + 1} 个申请人`)
    
    // 查找沟通按钮
    const buttons = card.querySelectorAll('button')
    for (const button of buttons) {
      if (button.textContent?.includes('沟通')) {
        console.log("找到沟通按钮")
        // TODO: 点击按钮并发送消息
        break
      }
    }
  }
}