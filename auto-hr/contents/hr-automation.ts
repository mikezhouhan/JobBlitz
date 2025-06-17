import type { PlasmoCSConfig } from "plasmo"
import type { ApplicantInfo } from "~types"
import { StorageManager } from "~utils/storage"

export const config: PlasmoCSConfig = {
  matches: ["https://hr.shixiseng.com/*"],
  all_frames: false
}

class HRAutomation {
  private storage: StorageManager
  private isRunning: boolean = false
  private observer: MutationObserver | null = null
  private processedMessages: Set<string> = new Set()
  private processedApplicants: Set<string> = new Set()

  constructor() {
    this.storage = StorageManager.getInstance()
    this.init()
  }

  private async init() {
    console.log('HR自动化助手已启动')
    await this.startMonitoring()
  }

  private async startMonitoring() {
    if (this.isRunning) return
    
    this.isRunning = true
    
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              this.checkForNewMessages(element)
              this.checkForApplicantInfo(element)
            }
          })
        }
      })
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    this.scanExistingContent()
  }

  private async scanExistingContent() {
    await this.checkForNewMessages(document.body)
    await this.checkForApplicantInfo(document.body)
  }

  private async checkForNewMessages(element: Element) {
    const config = await this.storage.getConfig()
    if (!config.autoReply.enabled) return

    const messageElements = element.querySelectorAll('[class*="message"], [class*="chat"], .msg-item, .message-item')
    
    for (const msgElement of messageElements) {
      const messageId = this.getMessageId(msgElement as HTMLElement)
      if (this.processedMessages.has(messageId)) continue

      const messageText = msgElement.textContent?.trim() || ''
      const isFromApplicant = this.isMessageFromApplicant(msgElement as HTMLElement)
      
      if (isFromApplicant && this.shouldAutoReply(messageText, config.autoReply.keywords)) {
        this.processedMessages.add(messageId)
        setTimeout(() => {
          this.sendAutoReply(config.autoReply.replyMessage)
        }, config.autoReply.delay)
      }
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
      }
    }
  }

  private findApplicantElements(element: Element): HTMLElement[] {
    const selectors = [
      '.candidate-item',
      '.applicant-card',
      '.resume-card',
      '[class*="candidate"]',
      '[class*="applicant"]',
      '.user-info',
      '.contact-info'
    ]

    const elements: HTMLElement[] = []
    
    for (const selector of selectors) {
      const found = element.querySelectorAll(selector)
      found.forEach(el => elements.push(el as HTMLElement))
    }

    return elements
  }

  private extractApplicantInfo(element: HTMLElement): ApplicantInfo | null {
    try {
      const nameSelectors = ['.name', '.user-name', '[class*="name"]', 'h3', 'h4']
      const phoneSelectors = ['.phone', '.tel', '[class*="phone"]', '[class*="mobile"]']
      const emailSelectors = ['.email', '[class*="email"]', 'a[href^="mailto:"]']
      const positionSelectors = ['.position', '.job-title', '[class*="position"]', '[class*="job"]']

      const name = this.extractTextBySelectors(element, nameSelectors)
      const phone = this.extractTextBySelectors(element, phoneSelectors)
      const email = this.extractTextBySelectors(element, emailSelectors)
      const position = this.extractTextBySelectors(element, positionSelectors)

      if (!name) return null

      const phoneMatch = phone?.match(/1[3-9]\d{9}/)
      const emailMatch = email?.match(/[\w.-]+@[\w.-]+\.\w+/)

      const applicantInfo: ApplicantInfo = {
        id: this.generateApplicantId(name, phone, email),
        name: name,
        phone: phoneMatch ? phoneMatch[0] : '',
        email: emailMatch ? emailMatch[0] : '',
        position: position || '未知职位',
        applyTime: new Date().toISOString(),
        status: '新申请'
      }

      return applicantInfo
    } catch (error) {
      console.error('提取申请人信息失败:', error)
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

  private async sendAutoReply(message: string) {
    try {
      const textareas = document.querySelectorAll('textarea, input[type="text"]')
      const replyInput = Array.from(textareas).find(el => {
        const placeholder = (el as HTMLElement).getAttribute('placeholder')?.toLowerCase() || ''
        const className = (el as HTMLElement).className.toLowerCase()
        return placeholder.includes('输入') || 
               placeholder.includes('回复') || 
               className.includes('input') ||
               className.includes('reply')
      }) as HTMLTextAreaElement | HTMLInputElement

      if (replyInput) {
        replyInput.focus()
        replyInput.value = message
        
        replyInput.dispatchEvent(new Event('input', { bubbles: true }))
        replyInput.dispatchEvent(new Event('change', { bubbles: true }))

        setTimeout(() => {
          const sendButtons = document.querySelectorAll('button, .btn, [class*="send"]')
          const sendButton = Array.from(sendButtons).find(btn => {
            const text = btn.textContent?.toLowerCase() || ''
            return text.includes('发送') || 
                   text.includes('send') || 
                   btn.className.toLowerCase().includes('send')
          }) as HTMLButtonElement

          if (sendButton && !sendButton.disabled) {
            sendButton.click()
            console.log('自动回复已发送:', message)
          }
        }, 500)
      }
    } catch (error) {
      console.error('自动回复失败:', error)
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

let automation: HRAutomation | null = null

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    automation = new HRAutomation()
  })
} else {
  automation = new HRAutomation()
}

window.addEventListener('beforeunload', () => {
  if (automation) {
    automation.stop()
  }
})