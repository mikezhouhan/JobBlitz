import type { Applicant } from "../types"
import { STORAGE_KEYS, STATUS_MESSAGES } from "../constants"
import { getCurrentTab, messaging, scripting, storage } from "./chrome"

/**
 * 扫描辅助函数
 * 将 useScan 中的大函数拆分为更小的函数
 */

// 检查标签页可用性
export const checkTabAvailability = async (): Promise<{ tab: chrome.tabs.Tab | null, error?: string }> => {
  const tab = await getCurrentTab()
  if (!tab?.id) {
    return { tab: null, error: '无法获取当前标签页' }
  }
  return { tab }
}

// 尝试通过内容脚本扫描
export const tryContentScriptScan = async (tabId: number): Promise<boolean> => {
  const response = await messaging.scanApplicants(tabId)
  return !!response
}

// 设置扫描状态
export const setScanStatus = async (active: boolean): Promise<void> => {
  await storage.set({ 
    [STORAGE_KEYS.SCAN_PROCESSING]: { active } 
  })
}

// 执行直接扫描脚本
export const executeDirectScan = async (tabId: number): Promise<Applicant[] | null> => {
  if (!scripting.isAvailable()) {
    throw new Error("Chrome API 不可用，无法执行扫描")
  }

  const results = await scripting.executeFunction(tabId, scanApplicantsDirectly)
  return results && Array.isArray(results) ? results as Applicant[] : null
}

// 完整的扫描函数（从backup恢复）
function scanApplicantsDirectly() {
  
  let allApplicants: any[] = []
  let pageNumber = 1
  
  // 查找分页元素
  function findNextPageButton() {
    const nextPageSelectors = [
      '.el-pagination button.btn-next',
      '.el-pagination .el-icon-arrow-right',
      '.pagination-next',
      '[aria-label="下一页"]',
      'button:has(.el-icon-arrow-right)',
      '.el-pager + button'
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
  
  // 扫描单页（点击进入详情页获取联系方式）
  async function scanCurrentPage() {
    const cards = document.querySelectorAll('.resume-item')
    const pageApplicants = []
    
    for (let index = 0; index < cards.length; index++) {
      // 检查是否应该停止
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['scanProcessing'])
        if (result.scanProcessing && !result.scanProcessing.active) {
          break
        }
      }
      
      const card = cards[index]
      try {
        // 提取姓名
        const nameElement = card.querySelector('.resume-info__center-name')
        const name = nameElement?.textContent?.trim() || `申请人${index + 1}`
        
        // 提取详细信息
        const detailElement = card.querySelector('.resume-info__center-detail')
        const detailText = detailElement?.textContent || ''
        
        // 解析年龄、地点等信息
        const ageMatch = detailText.match(/(\d{1,2})岁/)
        const locationMatch = detailText.match(/现居：([^实]+)/)
        const internMatch = detailText.match(/(实习\d+次)/)
        
        // 从卡片顶部获取投递职位（通常在卡片最上方，旁边是投递时间和转发按钮）
        let listPosition = ''
        // 查找卡片顶部区域
        const cardHeader = card.querySelector('.resume-item__header, .card-header, [class*="header"]')
        if (cardHeader) {
          // 在顶部区域查找职位
          const headerText = cardHeader.textContent || ''
          // 排除时间和按钮文本
          const positionMatch = headerText.match(/^([^\d]+?)(?:\s*\d{4}|\s*转发|$)/)
          if (positionMatch) {
            listPosition = positionMatch[1].trim()
          }
        }
        
        // 如果没找到，尝试其他选择器
        if (!listPosition) {
          const topElements = card.querySelectorAll('.resume-item > div:first-child, .resume-item > *:first-child')
          for (const elem of topElements) {
            const text = elem.textContent?.trim() || ''
            if (text && text.length > 2 && text.length < 50 && 
                !text.includes('转发') && !text.match(/\d{4}-\d{2}-\d{2}/)) {
              listPosition = text.split(/\s{2,}/)[0] // 取第一部分（通常是职位）
              break
            }
          }
        }
        
        const applicant = {
          id: `${Date.now()}_${pageNumber}_${index}`,
          name: name,
          age: ageMatch ? ageMatch[1] : '',
          location: locationMatch ? locationMatch[1].trim() : '',
          internExperience: internMatch ? internMatch[1] : '',
          phone: '',
          email: '',
          position: listPosition || '未知职位',
          jobIntention: '',  // 求职意向
          onlineResume: '',  // 在线简历
          applyTime: new Date().toISOString(),
          status: '新申请',
          pageNumber: pageNumber
        }
        
        // 点击卡片进入详情页
        const cardClickable = card.querySelector('.resume-info__center') || card
        ;(cardClickable as HTMLElement).click()
        
        // 等待详情页加载
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // 检查页面是否加载完成（查找关键元素）
        let retryCount = 0
        const maxRetries = 5
        while (retryCount < maxRetries) {
          // 检查是否有加载指示器
          const loadingMask = document.querySelector('.el-loading-mask, .loading, [class*="loading"]')
          if (loadingMask) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          
          // 检查联系信息元素
          const phoneEmailElements = document.querySelectorAll('.phone-email-item')
          const phoneEmailContainer = document.querySelector('.phone-email')
          
          if (phoneEmailElements.length >= 2 || (phoneEmailContainer && phoneEmailContainer.textContent!.includes('@'))) {
            // 再等待一下确保内容完全渲染
            await new Promise(resolve => setTimeout(resolve, 1000))
            break
          }
          
          retryCount++
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
        // 查找联系方式（优先查找 phone-email 组合元素）
        let phoneNumber = ''
        let email = ''
        
        // 首先查找包含手机和邮箱的组合元素
        // 优先查找单独的 phone-email-item 元素
        const phoneItems = document.querySelectorAll('.phone-email-item')
        if (phoneItems.length >= 2) {
          // 如果有单独的元素，使用它们
          phoneItems.forEach(item => {
            const text = item.textContent || ''
            
            // 检查是否包含手机号
            const phoneMatch = text.match(/(?:\+86\s*)?1[3-9]\d{9}/)
            if (phoneMatch && !phoneNumber) {
              phoneNumber = phoneMatch[0].replace(/\+86\s*/, '')
            }
            
            // 检查是否包含邮箱
            const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/)
            if (emailMatch && !email) {
              email = emailMatch[0]
            }
          })
        }
        
        // 如果没有找到单独的元素，尝试从组合元素中提取
        if (!phoneNumber || !email) {
          const phoneEmailElement = document.querySelector('.phone-email, [class*="phone-email"]')
          if (phoneEmailElement && !phoneEmailElement.classList.contains('phone-email-item')) {
            const text = phoneEmailElement.textContent || ''
            
            // 提取手机号（可能带有 +86 前缀）
            if (!phoneNumber) {
              const phoneMatch = text.match(/(?:\+86\s*)?1[3-9]\d{9}/)
              if (phoneMatch) {
                phoneNumber = phoneMatch[0].replace(/\+86\s*/, '')
              }
            }
            
            // 提取邮箱（使用更严格的正则，避免把手机号当作邮箱的一部分）
            if (!email) {
              // 先尝试在手机号之后查找邮箱
              const afterPhone = text.substring(text.indexOf(phoneNumber) + phoneNumber.length)
              const emailMatch = afterPhone.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/) ||
                                text.match(/(?<!\d)[\w.-]+@[\w.-]+\.[\w]{2,}/)
              if (emailMatch) {
                email = emailMatch[0]
              }
            }
          }
        }
        
        // 如果组合元素中没找到，尝试单独查找
        if (!phoneNumber) {
          const phoneSelectors = [
            '[class*="phone"]:not(.phone-email)',
            '[class*="mobile"]',
            '[class*="tel"]',
            '*[title*="手机"]',
            '*[title*="电话"]'
          ]
          
          for (const selector of phoneSelectors) {
            try {
              const phoneElement = document.querySelector(selector)
              if (phoneElement) {
                const text = phoneElement.textContent || ''
                const phoneMatch = text.match(/(?:\+86\s*)?1[3-9]\d{9}/)
                if (phoneMatch) {
                  phoneNumber = phoneMatch[0].replace(/\+86\s*/, '')
                  break
                }
              }
            } catch (e) {}
          }
          
          // 备选方法：基于文本内容查找
          if (!phoneNumber) {
            const allSpans = document.querySelectorAll('span')
            for (const span of allSpans) {
              const text = span.textContent || ''
              if (text.includes('手机') || text.includes('电话')) {
                const phoneMatch = text.match(/(?:\+86\s*)?1[3-9]\d{9}/)
                if (phoneMatch) {
                  phoneNumber = phoneMatch[0].replace(/\+86\s*/, '')
                  break
                }
              }
            }
          }
        }
        
        if (!email) {
          const emailSelectors = [
            '[class*="email"]:not(.phone-email)',
            '[class*="mail"]',
            '*[title*="邮箱"]',
            '*[title*="email"]'
          ]
          
          for (const selector of emailSelectors) {
            try {
              const emailElement = document.querySelector(selector)
              if (emailElement) {
                const text = emailElement.textContent || ''
                const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/)
                if (emailMatch) {
                  email = emailMatch[0]
                  break
                }
              }
            } catch (e) {}
          }
          
          // 备选方法：基于文本内容查找
          if (!email) {
            const allSpans = document.querySelectorAll('span')
            for (const span of allSpans) {
              const text = span.textContent || ''
              if (text.includes('邮箱') || text.includes('Email')) {
                const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/)
                if (emailMatch) {
                  email = emailMatch[0]
                  break
                }
              }
            }
          }
        }
        
        // 最后的备选方案：在页面文本中查找
        if (!phoneNumber || !email) {
          const bodyText = document.body.textContent || ''
          
          if (!phoneNumber) {
            const phoneMatch = bodyText.match(/(?:\+86\s*)?1[3-9]\d{9}/)
            if (phoneMatch) {
              phoneNumber = phoneMatch[0].replace(/\+86\s*/, '')
            }
          }
          
          if (!email) {
            const emailMatch = bodyText.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/)
            if (emailMatch) {
              email = emailMatch[0]
            }
          }
        }
        
        // 查找求职意向
        let jobIntention = ''
        
        // 基于HTML结构查找求职意向
        const expJobsElement = document.querySelector('.exp-jobs')
        if (expJobsElement) {
          const text = expJobsElement.textContent?.trim() || ''
          const match = text.match(/求职意向[：:]\s*(.+)/)
          if (match) {
            jobIntention = match[1].trim()
          }
        }
        
        // 备选方法：在 main-detail-sub 中查找
        if (!jobIntention) {
          const mainDetailSub = document.querySelector('.main-detail-sub')
          if (mainDetailSub) {
            const spans = mainDetailSub.querySelectorAll('span')
            spans.forEach(span => {
              const text = span.textContent?.trim() || ''
              if (text.includes('求职意向')) {
                const match = text.match(/求职意向[：:]\s*(.+)/)
                if (match) {
                  jobIntention = match[1].trim()
                }
              }
            })
          }
        }
        
        // 查找投递职位（从详情页）
        let detailPosition = ''
        const positionTitleElement = document.querySelector('.resume-tools__title')
        if (positionTitleElement) {
          const text = positionTitleElement.textContent?.trim() || ''
          const match = text.match(/投递职位[：:]\s*(.+?)(?:·|$)/)
          if (match) {
            detailPosition = match[1].trim()
          } else if (text) {
            // 如果没有"投递职位："前缀，尝试直接使用文本
            detailPosition = text.replace(/·.+$/, '').trim()
          }
        }
        
        // 如果详情页找到了职位，优先使用详情页的
        if (detailPosition) {
          applicant.position = detailPosition
        }
        
        // 处理在线简历
        let onlineResume = ''
        const resumeOnlineDiv = document.querySelector('.resume-online')
        if (resumeOnlineDiv) {
          // 获取所有section的内容
          const allSections = resumeOnlineDiv.querySelectorAll('.resume-online-item')
          const resumeContent: string[] = []
          
          allSections.forEach(section => {
            const title = section.querySelector('.resume-online-item__title')?.textContent?.trim() || ''
            let content = section.querySelector('.resume-online-item__content')?.textContent?.trim() || ''
            if (title && content) {
              // 替换换行符为\n字符串，避免破坏CSV结构
              content = content.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\r/g, '\\n')
              resumeContent.push(`【${title}】${content}`)
            }
          })
          
          if (resumeContent.length > 0) {
            onlineResume = resumeContent.join(' | ')
          } else {
            // 如果没有找到内容，尝试获取所有sections的标题
            const resumeSections = resumeOnlineDiv.querySelectorAll('.resume-online-item__title')
            const sectionTitles = Array.from(resumeSections).map(el => el.textContent?.trim()).filter(Boolean)
            if (sectionTitles.length > 0) {
              onlineResume = `在线简历 - 包含: ${sectionTitles.join(', ')}`
            } else {
              onlineResume = '在线简历内容无法获取'
            }
          }
        } else {
          onlineResume = '无在线简历'
        }
        
        // 更新申请人信息
        applicant.phone = phoneNumber
        applicant.email = email
        applicant.jobIntention = jobIntention
        applicant.onlineResume = onlineResume
        
        
        pageApplicants.push(applicant)
        
        // 返回到申请人列表页（多种尝试方法）
        
        // 方法1: 查找返回按钮
        const backButtonSelectors = [
          '.back-btn', '.btn-back', '[class*="back"]',
          '.el-breadcrumb a', '.breadcrumb a',
          '.el-icon-arrow-left',
          '[aria-label="返回"]', '[title="返回"]'
        ]
        
        let returned = false
        for (const selector of backButtonSelectors) {
          const backButton = document.querySelector(selector)
          if (backButton) {
            ;(backButton as HTMLElement).click()
            returned = true
            break
          }
        }
        
        // 方法2: 如果没有返回按钮，尝试浏览器后退
        if (!returned) {
          window.history.back()
        }
        
        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // 检查是否成功返回申请人列表页
        let backRetryCount = 0
        const maxBackRetries = 3
        while (backRetryCount < maxBackRetries) {
          const currentCards = document.querySelectorAll('.resume-item')
          if (currentCards.length > 0) {
            break
          }
          
          window.history.back()
          await new Promise(resolve => setTimeout(resolve, 2000))
          backRetryCount++
        }
        
      } catch (error) {
        // 尝试返回申请人列表页
        try {
          window.history.back()
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (e) {
          // 返回申请人列表页失败 - 静默处理
        }
      }
      
      // 处理间隔，避免过快操作
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    return pageApplicants
  }
  
  // 主扫描函数
  async function startScanning() {
    
    try {
      while (true) {
        // 扫描当前页面
        const pageApplicants = await scanCurrentPage()
        allApplicants.push(...pageApplicants)
        
        
        // 保存当前进度到存储
        if (typeof chrome !== 'undefined' && chrome.storage) {
          try {
            const existingData = await chrome.storage.local.get(['applicants'])
            const existingApplicants = existingData.applicants || []
            
            // 去重处理（基于ID）
            const existingIds = new Set(existingApplicants.map((a: any) => a.id))
            const newApplicants = pageApplicants.filter(a => !existingIds.has(a.id))
            
            const updatedApplicants = [...existingApplicants, ...newApplicants]
            await chrome.storage.local.set({ applicants: updatedApplicants })
            
          } catch (e) {
            // 保存进度失败 - 静默处理
          }
        }
        
        // 查找下一页按钮
        const nextButton = findNextPageButton()
        if (!nextButton) {
          break
        }
        
        ;(nextButton as HTMLElement).click()
        
        // 等待下一页加载
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        pageNumber++
        
        // 安全检查：避免无限循环
        if (pageNumber > 50) {
          break
        }
      }
      
      
      // 最终保存状态
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          scanProcessing: { active: false, completed: true }
        })
      }
      
      return allApplicants
      
    } catch (error) {
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          scanProcessing: { active: false, error: error.message }
        })
      }
      
      return allApplicants
    }
  }
  
  // 开始扫描
  return startScanning()
}

// 处理扫描结果并保存
export const processScanResults = async (applicants: Applicant[]): Promise<{ newCount: number, totalCount: number }> => {
  // 保存到存储（累积保存）
  const existingData = await storage.get([STORAGE_KEYS.APPLICANTS])
  const existingApplicants: Applicant[] = existingData[STORAGE_KEYS.APPLICANTS] || []

  // 去重处理（基于ID）
  const existingIds = new Set(existingApplicants.map(a => a.id))
  const newApplicants = applicants.filter(a => !existingIds.has(a.id))

  const allApplicants = [...existingApplicants, ...newApplicants]
  await storage.set({ [STORAGE_KEYS.APPLICANTS]: allApplicants })

  return {
    newCount: newApplicants.length,
    totalCount: allApplicants.length
  }
}

// 生成扫描状态消息
export const getScanStatusMessage = (newCount: number, totalCount: number): string => {
  if (newCount === 0) {
    return "扫描完成，但未找到有效数据"
  }
  return `扫描完成，新增 ${newCount} 条数据（总计 ${totalCount} 条）`
}