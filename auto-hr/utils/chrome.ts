import type { StorageData, ChromeMessage } from "../types"
import { STORAGE_KEYS, MESSAGE_ACTIONS } from "../constants"

/**
 * Chrome API 工具函数
 */

// 检查 Chrome API 是否可用
export const isChromeApiAvailable = (): boolean => {
  return typeof chrome !== 'undefined' && !!chrome.storage
}

// 获取当前活动标签页
export const getCurrentTab = async (): Promise<chrome.tabs.Tab | null> => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return tab || null
  } catch (error) {
    console.error('获取当前标签页失败:', error)
    return null
  }
}

// Chrome 存储操作
export const storage = {
  // 获取存储数据
  async get<K extends keyof StorageData>(keys: K[]): Promise<Pick<StorageData, K>> {
    try {
      const result = await chrome.storage.local.get(keys)
      return result as Pick<StorageData, K>
    } catch (error) {
      console.error('获取存储数据失败:', error)
      return {} as Pick<StorageData, K>
    }
  },

  // 设置存储数据
  async set(data: Partial<StorageData>): Promise<boolean> {
    try {
      await chrome.storage.local.set(data)
      return true
    } catch (error) {
      console.error('设置存储数据失败:', error)
      return false
    }
  },

  // 删除存储数据
  async remove(keys: (keyof StorageData)[]): Promise<boolean> {
    try {
      await chrome.storage.local.remove(keys)
      return true
    } catch (error) {
      console.error('删除存储数据失败:', error)
      return false
    }
  },

  // 清空所有存储数据
  async clear(): Promise<boolean> {
    try {
      await chrome.storage.local.clear()
      return true
    } catch (error) {
      console.error('清空存储数据失败:', error)
      return false
    }
  }
}

// Chrome 消息传递
export const messaging = {
  // 向标签页发送消息
  async sendToTab(tabId: number, message: ChromeMessage): Promise<any> {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message)
      return response
    } catch (error: any) {
      // 内容脚本未加载的常见错误
      if (error.message?.includes('Could not establish connection') || 
          error.message?.includes('Receiving end does not exist')) {
        console.log('内容脚本未加载或标签页已关闭')
        return null
      }
      console.error('发送消息到标签页失败:', error)
      throw error
    }
  },

  // Ping 内容脚本
  async pingContentScript(tabId: number): Promise<boolean> {
    try {
      const response = await this.sendToTab(tabId, { action: MESSAGE_ACTIONS.PING })
      return response && response.pong
    } catch (error) {
      return false
    }
  },

  // 获取页面统计
  async getPageStats(tabId: number): Promise<any> {
    try {
      return await this.sendToTab(tabId, { action: MESSAGE_ACTIONS.GET_PAGE_STATS })
    } catch (error) {
      return null
    }
  },

  // 开始批量处理
  async startBatchProcess(tabId: number, config: any): Promise<any> {
    try {
      return await this.sendToTab(tabId, { 
        action: MESSAGE_ACTIONS.START_BATCH_PROCESS, 
        config 
      })
    } catch (error) {
      return null
    }
  },

  // 扫描申请人
  async scanApplicants(tabId: number): Promise<any> {
    try {
      return await this.sendToTab(tabId, { action: MESSAGE_ACTIONS.SCAN_APPLICANTS })
    } catch (error) {
      return null
    }
  },

  // 调试页面
  async debugPage(tabId: number): Promise<any> {
    try {
      return await this.sendToTab(tabId, { action: MESSAGE_ACTIONS.DEBUG_PAGE })
    } catch (error) {
      return null
    }
  }
}

// Chrome 脚本执行
export const scripting = {
  // 检查脚本执行 API 是否可用
  isAvailable(): boolean {
    return !!(chrome.scripting && chrome.scripting.executeScript)
  },

  // 执行内联函数
  async executeFunction<T = any>(
    tabId: number, 
    func: () => T, 
    args: any[] = []
  ): Promise<T | null> {
    try {
      if (!this.isAvailable()) {
        throw new Error('Chrome scripting API 不可用')
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func,
        args
      })

      return results && results[0] && results[0].result ? results[0].result : null
    } catch (error) {
      console.error('执行脚本失败:', error)
      throw error
    }
  },

  // 手动检测页面元素
  async detectPageElements(tabId: number): Promise<any> {
    return this.executeFunction(tabId, () => {
      // 检查内容脚本是否已加载
      if ((window as any).__hrAutomationLoaded) {
        console.log('✅ 内容脚本已加载但未响应消息')
      }
      
      // 手动检测页面元素
      const cards = document.querySelectorAll('.resume-item')
      const nameElements = document.querySelectorAll('.resume-info__center-name')
      const buttons = document.querySelectorAll('.resume-info__right button')
      
      console.log(`找到元素: ${cards.length} 个卡片, ${nameElements.length} 个姓名, ${buttons.length} 个按钮`)
      
      // 检查页码信息
      let currentPageNum = 1
      const pageNumElement = document.querySelector('.el-pagination .el-pager .active') ||
                           document.querySelector('.el-pagination .number.active') ||
                           document.querySelector('[class*="pagination"] .active')
      if (pageNumElement) {
        currentPageNum = parseInt(pageNumElement.textContent || '1')
      }
      
      return {
        totalApplicants: cards.length,
        currentPage: window.location.href,
        pageNumber: currentPageNum,
        timestamp: new Date().toISOString(),
        debug: {
          url: window.location.href,
          title: document.title,
          resumeItems: cards.length,
          nameElements: nameElements.length,
          buttons: buttons.length,
          contentScriptLoaded: (window as any).__hrAutomationLoaded || false
        }
      }
    })
  },

  // 调试页面结构
  async debugPageStructure(tabId: number): Promise<any> {
    return this.executeFunction(tabId, () => {
      console.log('=== 页面调试信息 ===')
      console.log('URL:', window.location.href)
      console.log('Title:', document.title)
      
      const selectors = [
        '.resume-item',
        '.resume-item.container',
        '.resume-item.container.list-card-hover',
        '.resume-info__center-name',
        '.resume-info__right button',
        'button',
        '*[class*="resume"]',
        '*[class*="item"]'
      ]
      
      const results: any = {}
      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector)
          results[selector] = elements.length
          console.log(`${selector}: ${elements.length} 个元素`)
        } catch (e: any) {
          results[selector] = `错误: ${e.message}`
          console.log(`${selector}: 错误 - ${e.message}`)
        }
      })
      
      // 检查包含"沟通"文本的元素
      const allElements = document.querySelectorAll('*')
      const contactElements = Array.from(allElements).filter(el => 
        el.textContent?.includes('沟通')
      ).length
      results['包含沟通文本的元素'] = contactElements
      console.log('包含"沟通"文本的元素:', contactElements)
      
      console.log('Body classes:', document.body.className)
      return results
    })
  }
}

// 存储监听器管理
export const storageListener = {
  // 添加存储变化监听器
  addListener(callback: (changes: any, namespace: string) => void): void {
    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(callback)
    }
  },

  // 移除存储变化监听器
  removeListener(callback: (changes: any, namespace: string) => void): void {
    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(callback)
    }
  }
}

// 消息监听器管理
export const messageListener = {
  // 添加消息监听器
  addListener(callback: (request: any, sender: any, sendResponse: any) => void): void {
    if (chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(callback)
    }
  },

  // 移除消息监听器
  removeListener(callback: (request: any, sender: any, sendResponse: any) => void): void {
    if (chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.removeListener(callback)
    }
  }
}