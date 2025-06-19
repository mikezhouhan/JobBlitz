import type { BatchProcessing, Config } from "../types"
import { STORAGE_KEYS, STATUS_MESSAGES } from "../constants"
import { getCurrentTab, messaging, scripting, storage } from "./chrome"

/**
 * 批量处理辅助函数
 * 将 useBatchProcess 中的大函数拆分为更小的函数
 */

// 检查标签页可用性
export const checkBatchTabAvailability = async (): Promise<{ tab: chrome.tabs.Tab | null, error?: string }> => {
  const tab = await getCurrentTab()
  if (!tab?.id) {
    return { tab: null, error: '无法获取当前标签页' }
  }
  return { tab }
}

// 创建批量处理配置
export const createBatchConfig = (replyMessage: string, totalApplicants: number): { config: Config, batchProcessing: BatchProcessing } => {
  const config: Config = { 
    autoReply: { enabled: true, replyMessage } 
  }
  
  const batchProcessing: BatchProcessing = {
    active: true,
    startTime: new Date().toISOString(),
    totalCount: totalApplicants,
    processedCount: 0
  }

  return { config, batchProcessing }
}

// 保存批量处理配置到存储
export const saveBatchConfig = async (config: Config, batchProcessing: BatchProcessing): Promise<void> => {
  await storage.set({
    [STORAGE_KEYS.CONFIG]: config,
    [STORAGE_KEYS.BATCH_PROCESSING]: batchProcessing
  })
}

// 尝试通过内容脚本启动批量处理
export const tryContentScriptBatch = async (tabId: number, replyMessage: string): Promise<boolean> => {
  const response = await messaging.startBatchProcess(tabId, {
    autoReply: true,
    replyMessage: replyMessage
  })
  return !!response
}

// 执行直接批量处理
export const executeDirectBatch = async (tabId: number, replyMessage: string): Promise<void> => {
  if (!scripting.isAvailable()) {
    throw new Error("Chrome API 不可用，无法执行批量处理")
  }

  await scripting.executeFunction(tabId, batchProcessDirectly, [replyMessage])
}

// 完整的批量处理函数（从backup恢复）
function batchProcessDirectly(replyMessage: string) {
  console.log("🚀 开始直接批量处理")
  console.log("回复消息模板:", replyMessage)
  
  let totalProcessedCount = 0
  let currentPageProcessedCount = 0
  let currentIndex = 0
  let isProcessing = true
  let failedCount = 0
  
  // 查找分页元素
  function findNextPageButton() {
    const nextPageSelectors = [
      '.el-pagination button.btn-next:not([disabled])',
      '.el-pagination .el-icon-arrow-right:not(.is-disabled)',
      '.pagination-next:not([disabled])',
      '[aria-label="下一页"]:not([disabled])',
      'button:has(.el-icon-arrow-right):not([disabled])',
      '.el-pager + button:not([disabled])'
    ]
    
    for (const selector of nextPageSelectors) {
      try {
        const button = document.querySelector(selector)
        if (button && !(button as HTMLButtonElement).disabled) {
          return button
        }
      } catch (e) {}
    }
    return null
  }
  
  // 处理当前页面的申请人
  async function processCurrentPage() {
    console.log(`开始处理第 ${Math.ceil((totalProcessedCount / 10) + 1)} 页`)
    
    const cards = document.querySelectorAll('.resume-item')
    console.log(`当前页面找到 ${cards.length} 个申请人`)
    
    currentPageProcessedCount = 0
    
    for (let index = 0; index < cards.length; index++) {
      // 检查是否应该停止
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['batchProcessing'])
        if (result.batchProcessing && (!result.batchProcessing.active || result.batchProcessing.stopped)) {
          console.log("批量处理已被用户停止")
          isProcessing = false
          break
        }
      }
      
      const card = cards[index]
      try {
        // 提取申请人姓名
        const nameElement = card.querySelector('.resume-info__center-name')
        const applicantName = nameElement?.textContent?.trim() || `申请人${index + 1}`
        
        console.log(`开始处理第 ${index + 1} 个申请人: ${applicantName}`)
        
        // 查找沟通按钮 - 使用原始逻辑
        const buttons = card.querySelectorAll('button')
        let communicateButton: HTMLButtonElement | null = null
        
        for (const button of buttons) {
          if (button.textContent?.trim() === '沟通') {
            communicateButton = button as HTMLButtonElement
            break
          }
        }
        
        if (!communicateButton) {
          console.log(`申请人 ${applicantName} 没有找到沟通按钮，跳过`)
          continue
        }
        
        // 点击沟通按钮
        console.log(`点击申请人 ${applicantName} 的沟通按钮`)
        ;(communicateButton as HTMLElement).click()
        
        // 等待聊天界面加载
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // 查找聊天输入框 - 使用原始的精确选择器
        let chatInput = document.querySelector('textarea[placeholder="请输入"]') as HTMLTextAreaElement
        
        // 如果没找到，再等一会儿
        if (!chatInput) {
          console.log("未找到输入框，再等待2秒...")
          await new Promise(resolve => setTimeout(resolve, 2000))
          chatInput = document.querySelector('textarea[placeholder="请输入"]') as HTMLTextAreaElement
        }
        
        if (!chatInput) {
          console.log(`申请人 ${applicantName} 未找到聊天输入框`)
          failedCount++
          
          // 尝试返回列表
          window.history.back()
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
        
        console.log("找到聊天输入框，准备输入消息")
        
        // 先点击输入框，确保获得焦点
        chatInput.click()
        chatInput.focus()
        
        // 等待一下
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 输入消息
        chatInput.value = replyMessage
        
        // 触发input事件，确保消息被识别
        chatInput.dispatchEvent(new InputEvent('input', { 
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: replyMessage
        }))
        
        console.log("消息输入完成:", chatInput.value)
        
        // 等待一下确保消息输入完成
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 使用回车键发送消息（已验证的方法）
        console.log("准备使用回车键发送消息...")
        
        // 确保输入框有焦点
        chatInput.focus()
        
        // 按照原始成功的事件序列
        console.log("触发回车键事件序列")
        
        // 1. KEYDOWN
        console.log("1. 触发 keydown")
        const keydownEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          code: 'Enter',
          bubbles: true,
          cancelable: true,
          composed: true
        })
        chatInput.dispatchEvent(keydownEvent)
        await new Promise(resolve => setTimeout(resolve, 10))
        
        // 2. KEYPRESS
        console.log("2. 触发 keypress")
        const keypressEvent = new KeyboardEvent('keypress', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          code: 'Enter',
          bubbles: true,
          cancelable: true,
          composed: true
        })
        chatInput.dispatchEvent(keypressEvent)
        await new Promise(resolve => setTimeout(resolve, 10))
        
        // 3. INPUT (关键！回车键也会触发input事件)
        console.log("3. 触发 input")
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertLineBreak',
          data: null
        })
        chatInput.dispatchEvent(inputEvent)
        await new Promise(resolve => setTimeout(resolve, 10))
        
        // 4. KEYUP
        console.log("4. 触发 keyup")
        const keyupEvent = new KeyboardEvent('keyup', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          code: 'Enter',
          bubbles: true,
          cancelable: true,
          composed: true
        })
        chatInput.dispatchEvent(keyupEvent)
        
        console.log("回车键事件序列完成，消息应该已发送")
        
        // 等待消息发送完成（增加延迟避免网络超时）
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // 返回列表页面（点击返回或关闭按钮）
        console.log("准备返回列表页面...")
        
        // 基于原始HTML结构，关闭按钮在 .chat-close 中
        let backButton = document.querySelector('.chat-close')
        
        if (!backButton) {
          // 查找包含关闭图标的元素
          backButton = document.querySelector('.iconsouxunrencai_you')?.parentElement
        }
        
        if (!backButton) {
          // 其他备选方案
          backButton = document.querySelector('[class*="close"]') ||
                      document.querySelector('[aria-label*="关闭"]')
        }
        
        if (backButton) {
          console.log("找到关闭按钮，返回列表页面")
          ;(backButton as HTMLElement).click()
        } else {
          // 如果没有找到返回按钮，尝试浏览器后退
          console.log("使用浏览器后退返回列表")
          window.history.back()
        }
        
        // 等待页面返回到列表
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        totalProcessedCount++
        currentPageProcessedCount++
        
        console.log(`成功处理申请人 ${applicantName}，总计: ${totalProcessedCount}`)
        
        // 更新处理进度到存储
        if (typeof chrome !== 'undefined' && chrome.storage) {
          try {
            await chrome.storage.local.set({
              batchProcessing: {
                active: true,
                processedCount: totalProcessedCount,
                currentPage: Math.ceil((totalProcessedCount / 10)),
                totalPages: null,
                startTime: new Date().toISOString()
              }
            })
          } catch (e) {
            console.log("更新进度失败:", e)
          }
        }
        
      } catch (error) {
        console.error(`处理申请人失败:`, error)
        failedCount++
        
        // 尝试关闭可能打开的模态框
        const closeButton = document.querySelector('.el-dialog__close, .modal-close, .close-btn')
        if (closeButton) {
          ;(closeButton as HTMLElement).click()
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      // 处理间隔
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  // 主处理函数
  async function startProcessing() {
    console.log("开始批量处理所有页面")
    
    try {
      while (isProcessing) {
        // 处理当前页面
        await processCurrentPage()
        
        if (!isProcessing) break
        
        // 查找下一页按钮
        const nextButton = findNextPageButton()
        if (!nextButton) {
          console.log("没有找到下一页按钮，处理完成")
          break
        }
        
        console.log("点击下一页")
        ;(nextButton as HTMLElement).click()
        
        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      
      console.log(`批量处理完成! 总计处理: ${totalProcessedCount} 个申请人，失败: ${failedCount} 个`)
      
      // 更新完成状态
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          batchProcessing: {
            active: false,
            processedCount: totalProcessedCount,
            totalPages: Math.ceil((totalProcessedCount / 10)),
            completed: true,
            failedCount: failedCount
          }
        })
        
        // 通知popup更新
        try {
          chrome.runtime.sendMessage({ action: 'updatePageStats' })
        } catch (e) {
          console.log("发送更新消息失败:", e)
        }
      }
      
    } catch (error) {
      console.error("批量处理过程中发生错误:", error)
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          batchProcessing: {
            active: false,
            error: error.message,
            processedCount: totalProcessedCount,
            failedCount: failedCount
          }
        })
      }
    }
  }
  
  // 开始处理
  startProcessing()
}

// 创建批量处理进度更新器
export const createProgressUpdater = (
  setStatus: (status: string) => void,
  setProcessing: (processing: boolean) => void
): number => {
  const progressInterval = setInterval(async () => {
    const result = await storage.get([STORAGE_KEYS.BATCH_PROCESSING])
    const batchProcessing: BatchProcessing | undefined = result[STORAGE_KEYS.BATCH_PROCESSING]

    if (batchProcessing) {
      if (!batchProcessing.active) {
        clearInterval(progressInterval)
        setProcessing(false)

        const pageInfo = batchProcessing.totalPages ? 
          `${batchProcessing.totalPages} 页，` : ''

        setStatus(`批量处理完成，共处理 ${pageInfo}${batchProcessing.processedCount} 个申请人`)
      } else {
        const currentPage = batchProcessing.currentPage ? '(处理中...)' : ''
        setStatus(`正在处理... 已完成 ${batchProcessing.processedCount} 个 ${currentPage}`)
      }
    }
  }, 1000)

  return progressInterval
}

// 停止批量处理
export const stopBatchProcessing = async (): Promise<void> => {
  const batchProcessing: BatchProcessing = {
    active: false,
    stopped: true,
    processedCount: 0
  }
  
  await storage.set({
    [STORAGE_KEYS.BATCH_PROCESSING]: batchProcessing
  })
}