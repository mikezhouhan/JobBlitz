import type { BatchProcessing, Config } from "../types"
import { STORAGE_KEYS } from "../constants"
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

// 执行直接初筛批量处理
export const executeDirectScreening = async (tabId: number): Promise<void> => {
  if (!scripting.isAvailable()) {
    throw new Error("Chrome API 不可用，无法执行初筛批量处理")
  }

  await scripting.executeFunction(tabId, screeningProcessDirectly, [])
}

// 完整的批量处理函数（从backup恢复）
function batchProcessDirectly(replyMessage: string) {
  
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
    const cards = document.querySelectorAll('.resume-item')
    
    currentPageProcessedCount = 0
    
    for (let index = 0; index < cards.length; index++) {
      // 检查是否应该停止
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['batchProcessing'])
        if (result.batchProcessing && (!result.batchProcessing.active || result.batchProcessing.stopped)) {
          isProcessing = false
          break
        }
      }
      
      const card = cards[index]
      try {
        // 提取申请人姓名
        const nameElement = card.querySelector('.resume-info__center-name')
        const applicantName = nameElement?.textContent?.trim() || `申请人${index + 1}`
        
        
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
          continue
        }
        
        // 点击沟通按钮
        ;(communicateButton as HTMLElement).click()
        
        // 等待聊天界面加载
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // 查找聊天输入框 - 使用原始的精确选择器
        let chatInput = document.querySelector('textarea[placeholder="请输入"]') as HTMLTextAreaElement
        
        // 如果没找到，再等一会儿
        if (!chatInput) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          chatInput = document.querySelector('textarea[placeholder="请输入"]') as HTMLTextAreaElement
        }
        
        if (!chatInput) {
          failedCount++
          
          // 尝试返回列表
          window.history.back()
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
        
        
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
        
        
        // 等待一下确保消息输入完成
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 使用回车键发送消息（已验证的方法）
        
        // 确保输入框有焦点
        chatInput.focus()
        
        // 1. KEYDOWN
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
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertLineBreak',
          data: null
        })
        chatInput.dispatchEvent(inputEvent)
        await new Promise(resolve => setTimeout(resolve, 10))
        
        // 4. KEYUP
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
        
        
        // 等待消息发送完成（增加延迟避免网络超时）
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // 返回列表页面（点击返回或关闭按钮）
        
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
          ;(backButton as HTMLElement).click()
        } else {
          // 如果没有找到返回按钮，尝试浏览器后退
          window.history.back()
        }
        
        // 等待页面返回到列表
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        totalProcessedCount++
        currentPageProcessedCount++
        
        
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
            // 更新进度失败 - 静默处理
          }
        }
        
      } catch (error) {
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
    
    try {
      while (isProcessing) {
        // 处理当前页面
        await processCurrentPage()
        
        if (!isProcessing) break
        
        // 查找下一页按钮
        const nextButton = findNextPageButton()
        if (!nextButton) {
          break
        }
        
        ;(nextButton as HTMLElement).click()
        
        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      
      
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
          // 发送更新消息失败 - 静默处理
        }
      }
      
    } catch (error) {
      
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

// 初筛批量处理函数
function screeningProcessDirectly() {
  let totalProcessedCount = 0
  let currentPageProcessedCount = 0
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
    const cards = document.querySelectorAll('.resume-item')
    
    currentPageProcessedCount = 0
    
    for (let index = 0; index < cards.length; index++) {
      // 检查是否应该停止
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['batchProcessing'])
        if (result.batchProcessing && (!result.batchProcessing.active || result.batchProcessing.stopped)) {
          isProcessing = false
          break
        }
      }
      
      const card = cards[index]
      try {
        // 提取申请人姓名
        const nameElement = card.querySelector('.resume-info__center-name')
        const applicantName = nameElement?.textContent?.trim() || `申请人${index + 1}`
        
        // 查找通过初筛按钮
        const buttons = card.querySelectorAll('button')
        let screeningButton: HTMLButtonElement | null = null
        
        for (const button of buttons) {
          const buttonText = button.textContent?.trim()
          if (buttonText === '通过初筛' || buttonText === '初筛通过' || buttonText === '通过') {
            screeningButton = button as HTMLButtonElement
            break
          }
        }
        
        if (!screeningButton) {
          // 如果没有找到初筛按钮，跳过该申请人
          continue
        }
        
        // 点击通过初筛按钮
        ;(screeningButton as HTMLElement).click()
        
        // 等待操作完成
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        totalProcessedCount++
        currentPageProcessedCount++
        
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
            // 更新进度失败 - 静默处理
          }
        }
        
      } catch (error) {
        failedCount++
      }
      
      // 处理间隔
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  // 主处理函数
  async function startProcessing() {
    try {
      while (isProcessing) {
        // 处理当前页面
        await processCurrentPage()
        
        if (!isProcessing) break
        
        // 查找下一页按钮
        const nextButton = findNextPageButton()
        if (!nextButton) {
          break
        }
        
        ;(nextButton as HTMLElement).click()
        
        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      
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
          // 发送更新消息失败 - 静默处理
        }
      }
      
    } catch (error) {
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