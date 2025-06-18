import type { PlasmoCSConfig } from "plasmo"
import type { ApplicantInfo } from "~types"
import { StorageManager } from "~utils/storage"

export const config: PlasmoCSConfig = {
  matches: [
    "https://hr.shixiseng.com/*",
    "https://*.shixiseng.com/*",
    "http://hr.shixiseng.com/*"
  ],
  all_frames: false,
  run_at: "document_end"
}

class HRAutomation {
  private storage: StorageManager
  private isRunning: boolean = false
  private observer: MutationObserver | null = null
  private processedApplicants: Set<string> = new Set()
  private batchProcessing: boolean = false
  private currentBatchConfig: any = null

  constructor() {
    this.storage = StorageManager.getInstance()
    this.init()
  }

  private async init() {
    console.log('🤖 HR自动化助手已启动')
    console.log('当前页面URL:', window.location.href)
    console.log('页面标题:', document.title)
    
    // 立即检查页面元素
    const initialCheck = this.getPageStatistics()
    console.log('初始页面检查:', initialCheck)
    
    await this.startMonitoring()
    this.setupMessageListener()
  }

  private setupMessageListener() {
    // 监听来自插件弹窗的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('📨 收到消息:', request.action)
      
      try {
        switch (request.action) {
          case 'startBatchProcess':
            this.startBatchProcess(request.config)
            sendResponse({ success: true })
            break
          case 'scanApplicants':
            this.scanCurrentPageApplicants()
            sendResponse({ success: true })
            break
          case 'getPageStats':
            const stats = this.getPageStatistics()
            console.log('📊 返回页面统计:', stats)
            sendResponse(stats)
            break
          case 'debugPage':
            const debugInfo = this.debugPageStructure()
            sendResponse(debugInfo)
            break
          case 'ping':
            sendResponse({ pong: true, loaded: true })
            break
          default:
            sendResponse({ error: 'Unknown action' })
        }
      } catch (error) {
        console.error('处理消息出错:', error)
        sendResponse({ error: error.message })
      }
      
      return true
    })
  }

  private async startMonitoring() {
    if (this.isRunning) return
    
    this.isRunning = true
    
    // 实时扫描新加载的申请人
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && !this.batchProcessing) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.checkForApplicantInfo(node as Element)
            }
          })
        }
      })
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // 初始扫描
    await this.scanCurrentPageApplicants()
  }

  // 批量处理主函数
  private async startBatchProcess(config: any) {
    console.log('🚀 开始批量处理申请人')
    this.batchProcessing = true
    this.currentBatchConfig = config

    try {
      // 1. 先收集所有申请人信息
      await this.scanCurrentPageApplicants()
      
      // 2. 如果启用自动回复，批量点击沟通按钮
      if (config.autoReply) {
        await this.batchContactApplicants(config.replyMessage)
      }
      
      console.log('✅ 批量处理完成')
    } catch (error) {
      console.error('❌ 批量处理失败:', error)
    } finally {
      this.batchProcessing = false
    }
  }

  // 扫描当前页面所有申请人
  private async scanCurrentPageApplicants() {
    console.log('📊 扫描当前页面申请人信息')
    const applicantCards = this.findAllApplicantCards()
    
    for (const card of applicantCards) {
      const applicantInfo = this.extractApplicantInfo(card)
      if (applicantInfo && !this.processedApplicants.has(applicantInfo.id)) {
        this.processedApplicants.add(applicantInfo.id)
        await this.storage.saveApplicant(applicantInfo)
        console.log(`💾 已保存: ${applicantInfo.name}`)
      }
    }
    
    return applicantCards.length
  }

  // 批量点击沟通按钮并发送消息
  private async batchContactApplicants(replyMessage: string) {
    console.log('💬 开始批量沟通')
    const applicantCards = this.findAllApplicantCards()
    
    for (let i = 0; i < applicantCards.length; i++) {
      const card = applicantCards[i]
      const applicantInfo = this.extractApplicantInfo(card)
      
      if (applicantInfo) {
        console.log(`📞 正在联系: ${applicantInfo.name} (${i + 1}/${applicantCards.length})`)
        await this.contactAndReply(card, applicantInfo, replyMessage)
        
        // 随机延迟避免被检测
        await this.delay(2000 + Math.random() * 3000)
      }
    }
  }

  // 联系单个申请人并发送消息
  private async contactAndReply(card: HTMLElement, applicant: ApplicantInfo, message: string) {
    try {
      // 查找沟通按钮
      const contactButton = this.findContactButton(card)
      if (!contactButton) {
        console.log(`⚠️ 未找到沟通按钮: ${applicant.name}`)
        return
      }

      // 点击沟通按钮
      contactButton.click()
      console.log(`🔘 已点击沟通按钮: ${applicant.name}`)
      
      // 等待聊天界面加载
      await this.delay(2000)
      
      // 发送消息
      await this.sendMessage(message)
      console.log(`✉️ 已发送消息给: ${applicant.name}`)
      
      // 关闭聊天窗口或返回列表
      await this.closeChatWindow()
      
    } catch (error) {
      console.error(`❌ 联系失败 ${applicant.name}:`, error)
    }
  }

  private async checkForApplicantInfo(element: Element) {
    const config = await this.storage.getConfig()
    if (!config.dataCollection.enabled) return

    const applicantElements = this.findApplicantElements(element)
    
    for (const applicantElement of applicantElements) {
      const applicantInfo = this.extractApplicantInfo(applicantElement)
      if (applicantInfo && !this.processedApplicants.has(applicantInfo.id)) {
        this.processedApplicants.add(applicantInfo.id)
        await this.storage.saveApplicant(applicantInfo)
        console.log('已保存申请人信息:', applicantInfo.name)
        
        // 如果启用自动回复，尝试点击沟通按钮
        if (config.autoReply.enabled) {
          this.tryAutoContact(applicantElement, applicantInfo)
        }
      }
    }
  }

  private async tryAutoContact(element: HTMLElement, applicant: ApplicantInfo) {
    try {
      // 查找沟通按钮
      const contactButton = element.querySelector('button:contains("沟通")') ||
                           element.querySelector('button[class*="沟通"]') ||
                           element.querySelector('[class*="button"]:contains("沟通")') ||
                           Array.from(element.querySelectorAll('button')).find(btn => 
                             btn.textContent?.includes('沟通')
                           )

      if (contactButton && !contactButton.classList.contains('disabled')) {
        console.log(`准备联系申请人: ${applicant.name}`)
        
        // 延迟点击避免过于频繁
        setTimeout(() => {
          (contactButton as HTMLElement).click()
          console.log(`已点击沟通按钮 - ${applicant.name}`)
        }, Math.random() * 3000 + 2000) // 2-5秒随机延迟
      }
    } catch (error) {
      console.error('自动联系失败:', error)
    }
  }

  // 查找所有申请人卡片 - 基于真实HTML结构
  private findAllApplicantCards(): HTMLElement[] {
    // 基于调试结果，直接使用已知有效的选择器
    const cards = document.querySelectorAll('.resume-item')
    
    if (cards.length > 0) {
      console.log(`✅ 找到 ${cards.length} 个申请人卡片`)
      return Array.from(cards) as HTMLElement[]
    }
    
    console.log('❌ 未找到任何申请人卡片')
    return []
  }

  // 查找沟通按钮 - 基于真实HTML结构
  private findContactButton(card: HTMLElement): HTMLElement | null {
    // 基于调试结果，直接查找包含"沟通"文本的按钮
    const buttons = card.querySelectorAll('button')
    for (const button of buttons) {
      const buttonText = button.textContent?.trim()
      if (buttonText === '沟通') {
        return button as HTMLElement
      }
    }
    
    // 如果直接方法失败，查找 span 中的文本
    const spans = card.querySelectorAll('span')
    for (const span of spans) {
      if (span.textContent?.trim() === '沟通') {
        const parentButton = span.closest('button')
        if (parentButton) {
          return parentButton as HTMLElement
        }
      }
    }
    
    return null
  }

  // 获取页面统计信息
  private getPageStatistics() {
    console.log('🔍 开始页面诊断...')
    
    // 直接使用已知正确的选择器
    const cards = document.querySelectorAll('.resume-item')
    const nameElements = document.querySelectorAll('.resume-info__center-name')
    const buttons = document.querySelectorAll('.resume-info__right button')
    
    console.log(`找到 ${cards.length} 个申请人卡片`)
    console.log(`找到 ${nameElements.length} 个姓名元素`)
    console.log(`找到 ${buttons.length} 个操作按钮`)
    
    return {
      totalApplicants: cards.length,
      currentPage: window.location.href,
      timestamp: new Date().toISOString(),
      debug: {
        url: window.location.href,
        title: document.title,
        resumeItems: cards.length,
        nameElements: nameElements.length,
        buttons: buttons.length
      }
    }
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 调试页面结构
  private debugPageStructure() {
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
        
        // 如果找到少量元素，显示它们的信息
        if (elements.length > 0 && elements.length <= 3) {
          elements.forEach((el, i) => {
            console.log(`  ${i + 1}:`, el.className, el.textContent?.substring(0, 50))
          })
        }
      } catch (e: any) {
        results[selector] = `错误: ${e.message}`
        console.log(`${selector}: 错误 - ${e.message}`)
      }
    })
    
    // 检查包含"沟通"文本的元素
    const allElements = document.querySelectorAll('*')
    const contactElements = Array.from(allElements).filter(el => 
      el.textContent?.includes('沟通')
    )
    results['包含沟通文本的元素'] = contactElements.length
    console.log('包含"沟通"文本的元素:', contactElements.length)
    
    // 显示前几个沟通相关元素
    contactElements.slice(0, 3).forEach((el, i) => {
      console.log(`  沟通元素 ${i + 1}:`, el.tagName, el.className, el.textContent?.trim().substring(0, 30))
    })
    
    // 额外的页面信息
    results['当前URL'] = window.location.href
    results['页面标题'] = document.title
    results['Body类名'] = document.body.className
    results['总按钮数'] = document.querySelectorAll('button').length
    results['总div数'] = document.querySelectorAll('div').length
    
    console.log('Body classes:', document.body.className)
    console.log('调试结果:', results)
    
    return results
  }

  private extractApplicantInfo(element: HTMLElement): ApplicantInfo | null {
    try {
      // 基于真实HTML结构提取信息
      
      // 1. 提取姓名 - 在 .resume-info__center-name 中
      const nameElement = element.querySelector('.resume-info__center-name')
      const name = nameElement?.textContent?.trim() || ''
      
      if (!name) return null

      // 2. 提取详细信息 - 在 .resume-info__center-detail 中
      const detailElement = element.querySelector('.resume-info__center-detail')
      const detailText = detailElement?.textContent || ''
      
      // 年龄
      const ageMatch = detailText.match(/(\d{1,2})岁/)
      const age = ageMatch ? ageMatch[1] : ''

      // 现居地
      const locationMatch = detailText.match(/现居：([^实]+)/)
      const location = locationMatch ? locationMatch[1].trim() : ''

      // 实习经历
      const internMatch = detailText.match(/(实习\d+次)/)
      const internExperience = internMatch ? internMatch[1] : ''

      // 可到岗时间和工作安排
      const timeMatches = detailText.match(/(1个月内到岗|3-6个月|6个月以上)/)
      const dayMatches = detailText.match(/(\d+天\/周)/)
      const availability = timeMatches ? timeMatches[1] : ''
      const workDays = dayMatches ? dayMatches[1] : ''

      // 3. 提取职位信息 - 在顶部的投递职位中
      const jobElement = element.querySelector('.intern-name p')
      const jobText = jobElement?.textContent || ''
      const positionMatch = jobText.match(/投递职位：(.+?)·/)
      const position = positionMatch ? positionMatch[1] : '未知职位'

      // 4. 提取教育和经历信息
      const educationElements = element.querySelectorAll('.experience-item__detail')
      let education = ''
      let projectExperience = ''
      
      educationElements.forEach((el, index) => {
        const text = el.textContent?.trim() || ''
        if (index === 0) {
          education = text // 第一个通常是教育经历
        } else {
          projectExperience = text // 后续是项目经历
        }
      })

      // 5. 尝试获取联系方式（这些信息可能在详情页面中）
      // 在列表页面通常看不到完整联系方式，需要点击查看详情
      const phone = '' // 需要进一步点击获取
      const email = '' // 需要进一步点击获取

      const applicantInfo: ApplicantInfo = {
        id: this.generateApplicantId(name, phone, email),
        name: name,
        phone: phone,
        email: email,
        position: position,
        applyTime: new Date().toISOString(),
        status: '新申请',
        age: age,
        location: location,
        internExperience: internExperience,
        availability: availability,
        workDays: workDays,
        education: education,
        projectExperience: projectExperience
      }

      console.log('📝 提取申请人信息:', applicantInfo)
      return applicantInfo
    } catch (error) {
      console.error('❌ 提取申请人信息失败:', error)
      return null
    }
  }

  private extractTextBySelectors(element: HTMLElement, selectors: string[]): string {
    for (const selector of selectors) {
      const found = element.querySelector(selector)
      if (found?.textContent?.trim()) {
        return found.textContent.trim()
      }
    }
    return ''
  }

  private generateApplicantId(name: string, phone: string, email: string): string {
    const identifier = `${name}_${phone}_${email}`
    return btoa(identifier).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
  }

  private getMessageId(element: HTMLElement): string {
    return element.dataset.messageId || 
           element.id || 
           (element.textContent?.substring(0, 50) + Date.now()).replace(/\s/g, '')
  }

  private isMessageFromApplicant(element: HTMLElement): boolean {
    const classes = element.className.toLowerCase()
    const parentClasses = element.parentElement?.className.toLowerCase() || ''
    
    return !classes.includes('sent') && 
           !classes.includes('outgoing') && 
           !classes.includes('self') &&
           !parentClasses.includes('sent') &&
           !parentClasses.includes('outgoing')
  }

  private shouldAutoReply(messageText: string, keywords: string[]): boolean {
    if (!messageText) return false
    
    const text = messageText.toLowerCase()
    return keywords.some(keyword => text.includes(keyword.toLowerCase())) ||
           text.includes('你好') ||
           text.includes('面试') ||
           text.includes('工作')
  }

  // 发送消息到聊天界面
  private async sendMessage(message: string) {
    try {
      // 基于聊天界面截图，查找输入框
      const inputElement = document.querySelector('textarea[placeholder="请输入"]') as HTMLTextAreaElement
      
      if (!inputElement) {
        console.log('⚠️ 未找到消息输入框')
        return false
      }

      // 输入消息
      inputElement.focus()
      inputElement.value = message
      
      // 触发输入事件
      inputElement.dispatchEvent(new Event('input', { bubbles: true }))
      inputElement.dispatchEvent(new Event('change', { bubbles: true }))

      // 等待一下确保消息输入完成
      await this.delay(500)

      // 查找并点击发送按钮
      const sendButton = document.querySelector('button:contains("发送")') ||
                        Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent?.trim() === '发送'
                        )

      if (sendButton) {
        (sendButton as HTMLElement).click()
        console.log('✅ 消息已发送')
        return true
      } else {
        console.log('⚠️ 未找到发送按钮')
        return false
      }
    } catch (error) {
      console.error('❌ 发送消息失败:', error)
      return false
    }
  }

  // 关闭聊天窗口
  private async closeChatWindow() {
    try {
      // 查找关闭按钮或返回按钮
      const closeButton = document.querySelector('[class*="close"]') ||
                         document.querySelector('[class*="back"]') ||
                         document.querySelector('button[aria-label*="关闭"]')

      if (closeButton) {
        (closeButton as HTMLElement).click()
        await this.delay(1000)
      } else {
        // 如果没有找到关闭按钮，尝试按ESC键
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      }
    } catch (error) {
      console.error('❌ 关闭聊天窗口失败:', error)
    }
  }

  stop() {
    this.isRunning = false
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }
}

// 添加全局调试函数
declare global {
  interface Window {
    hrDebug: () => void
  }
}

window.hrDebug = () => {
  console.log('=== HR 自动化助手 调试信息 ===')
  console.log('URL:', window.location.href)
  console.log('Title:', document.title)
  
  // 检查各种选择器
  const selectors = [
    '.resume-item',
    '.resume-item.container',
    '.resume-item.container.list-card-hover',
    '.resume-info__center-name',
    '.resume-info__right button',
    'button'
  ]
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector)
    console.log(`${selector}: ${elements.length} 个元素`)
    if (elements.length > 0 && elements.length <= 3) {
      elements.forEach((el, i) => {
        console.log(`  ${i + 1}:`, el)
      })
    }
  })
  
  // 查看页面的主要结构
  console.log('Body classes:', document.body.className)
  console.log('Main containers:', document.querySelectorAll('div[class*="container"]').length)
  console.log('All buttons:', document.querySelectorAll('button').length)
  
  // 查找包含特定文本的元素
  const allElements = document.querySelectorAll('*')
  const elementsWithContact = Array.from(allElements).filter(el => 
    el.textContent?.includes('沟通') || el.textContent?.includes('联系')
  )
  console.log('包含"沟通"文本的元素:', elementsWithContact.length)
  elementsWithContact.slice(0, 5).forEach((el, i) => {
    console.log(`  ${i + 1}:`, el.tagName, el.className, el.textContent?.trim().substring(0, 50))
  })
}

let automation: HRAutomation | null = null

// 确保内容脚本已加载的标记
window.__hrAutomationLoaded = true;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    automation = new HRAutomation()
    console.log('💡 在控制台中输入 hrDebug() 可以查看页面调试信息')
  })
} else {
  automation = new HRAutomation()
  console.log('💡 在控制台中输入 hrDebug() 可以查看页面调试信息')
}

// 添加全局标记
declare global {
  interface Window {
    __hrAutomationLoaded: boolean
  }
}

window.addEventListener('beforeunload', () => {
  if (automation) {
    automation.stop()
  }
})