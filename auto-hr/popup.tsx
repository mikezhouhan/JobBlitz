import { useEffect, useState } from "react"

function IndexPopup() {
  const [status, setStatus] = useState("正在加载...")
  const [applicantCount, setApplicantCount] = useState(0)
  const [pageStats, setPageStats] = useState({ totalApplicants: 0 })
  const [replyMessage, setReplyMessage] = useState("您好！感谢您的申请，我们已收到您的简历，会尽快安排面试官查看并与您联系。期待与您进一步沟通！")
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadData()
    // 延迟一下以确保内容脚本已加载
    setTimeout(() => {
      getPageStats()
    }, 500)
  }, [])

  const loadData = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['applicants', 'config'])
        const applicants = result.applicants || []
        const config = result.config || { 
          autoReply: { 
            enabled: true, 
            replyMessage: "您好！感谢您的申请，我们已收到您的简历，会尽快安排面试官查看并与您联系。期待与您进一步沟通！" 
          } 
        }
        
        setApplicantCount(applicants.length)
        setReplyMessage(config.autoReply.replyMessage)
        setStatus("数据加载成功")
      } else {
        setStatus("Chrome API 不可用")
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      setStatus(`加载失败: ${error.message}`)
    }
  }

  const getPageStats = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab.id) {
        setStatus('无法获取当前标签页')
        return
      }
      
      // 首先检查内容脚本是否已加载
      try {
        // 尝试ping内容脚本
        const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' })
        console.log('内容脚本响应:', pingResponse)
        
        if (pingResponse && pingResponse.pong) {
          // 内容脚本已加载，获取统计信息
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageStats' })
          console.log('页面统计响应:', response)
          
          if (response && typeof response.totalApplicants === 'number') {
            setPageStats(response)
            setStatus(`页面检测成功 - ${response.totalApplicants} 个申请人`)
          } else {
            setStatus('获取页面数据失败')
          }
        }
      } catch (msgError) {
        console.log('内容脚本未响应，尝试手动检测:', msgError)
        setStatus('正在手动检测页面...')
        
        // 尝试直接执行脚本检测
        if (chrome.scripting && chrome.scripting.executeScript) {
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                // 检查内容脚本是否已加载
                if ((window as any).__hrAutomationLoaded) {
                  console.log('✅ 内容脚本已加载但未响应消息')
                }
                
                // 手动检测页面元素
                const cards = document.querySelectorAll('.resume-item')
                const nameElements = document.querySelectorAll('.resume-info__center-name')
                const buttons = document.querySelectorAll('.resume-info__right button')
                
                console.log(`找到元素: ${cards.length} 个卡片, ${nameElements.length} 个姓名, ${buttons.length} 个按钮`)
                
                return {
                  totalApplicants: cards.length,
                  currentPage: window.location.href,
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
              }
            })
            
            if (results && results[0] && results[0].result) {
              const stats = results[0].result
              setPageStats(stats)
              setStatus(`手动检测成功 - ${stats.totalApplicants} 个申请人`)
            }
          } catch (scriptError) {
            console.error('执行脚本失败:', scriptError)
            setStatus('无法检测页面内容')
          }
        } else {
          setStatus('Chrome API 不可用')
        }
      }
    } catch (error) {
      console.error('获取页面统计失败:', error)
      setStatus(`检测失败: ${error.message}`)
    }
  }

  // 开始批量处理
  const handleStartBatchProcess = async () => {
    if (processing) return
    
    setProcessing(true)
    setStatus("正在批量处理...")
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab.id) {
        // 保存回复消息配置和批量处理状态
        const config = { autoReply: { enabled: true, replyMessage } }
        await chrome.storage.local.set({ 
          config,
          batchProcessing: {
            active: true,
            startTime: new Date().toISOString(),
            totalCount: pageStats.totalApplicants,
            processedCount: 0
          }
        })
        
        try {
          // 尝试发送消息到内容脚本
          await chrome.tabs.sendMessage(tab.id, { 
            action: 'startBatchProcess',
            config: {
              autoReply: true,
              replyMessage: replyMessage
            }
          })
          
          setStatus("批量处理已启动，请查看控制台日志")
        } catch (msgError) {
          console.log("内容脚本未响应，使用直接执行方式")
          
          // 如果内容脚本未加载，直接在页面上执行批量处理
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: batchProcessDirectly,
            args: [replyMessage]
          })
          
          setStatus("批量处理已启动，请勿关闭此页面")
        }
        
        // 定期更新进度
        const progressInterval = setInterval(async () => {
          const result = await chrome.storage.local.get(['batchProcessing'])
          if (result.batchProcessing) {
            if (!result.batchProcessing.active) {
              clearInterval(progressInterval)
              setProcessing(false)
              setStatus(`批量处理完成，共处理 ${result.batchProcessing.processedCount} 个申请人`)
              loadData()
            } else {
              setStatus(`正在处理... (${result.batchProcessing.processedCount}/${result.batchProcessing.totalCount})`)
            }
          }
        }, 2000)
      }
    } catch (error) {
      setStatus(`批量处理失败: ${error.message}`)
      setProcessing(false)
    }
  }

  // 仅收集数据，不发送消息
  const handleScanOnly = async () => {
    setStatus("正在扫描申请人信息...")
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'scanApplicants' })
          setStatus("扫描完成")
        } catch (msgError) {
          console.log("内容脚本未响应，使用直接执行方式")
          
          // 直接在页面上执行扫描
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: scanApplicantsDirectly
          })
          
          if (results && results[0] && results[0].result) {
            const applicants = results[0].result
            // 保存到存储
            const existingData = await chrome.storage.local.get(['applicants'])
            const allApplicants = [...(existingData.applicants || []), ...applicants]
            await chrome.storage.local.set({ applicants: allApplicants })
            setStatus(`扫描完成，收集到 ${applicants.length} 条数据`)
          }
        }
        
        setTimeout(() => {
          loadData()
          getPageStats()
        }, 2000)
      }
    } catch (error) {
      setStatus(`扫描失败: ${error.message}`)
    }
  }

  // 调试页面结构
  const handleDebugPage = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab.id) {
        // 检查是否有 scripting API
        if (chrome.scripting && chrome.scripting.executeScript) {
          const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
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
            }
          })
          
          if (result && result[0] && result[0].result) {
            const debugInfo = result[0].result
            let statusText = '调试完成:\n'
            Object.entries(debugInfo).forEach(([key, value]) => {
              statusText += `${key}: ${value}\n`
            })
            setStatus(statusText)
          } else {
            setStatus('调试信息已输出到控制台')
          }
        } else {
          // 使用内容脚本消息传递
          try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'debugPage' })
            if (response) {
              let statusText = '调试完成:\n'
              Object.entries(response).forEach(([key, value]) => {
                statusText += `${key}: ${value}\n`
              })
              setStatus(statusText)
            }
          } catch (msgError) {
            setStatus('内容脚本未响应，请刷新页面后重试')
          }
        }
      }
    } catch (error: any) {
      setStatus(`调试失败: ${error.message}`)
    }
  }

  const handleExportCSV = async () => {
    if (applicantCount === 0) {
      alert('暂无数据可导出')
      return
    }
    
    try {
      const result = await chrome.storage.local.get(['applicants'])
      const applicants = result.applicants || []
      
      // 简单的CSV导出
      const csvContent = generateSimpleCSV(applicants)
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      
      // 创建下载链接
      const link = document.createElement('a')
      link.href = url
      link.download = `hr_applicants_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setStatus("CSV文件已导出")
    } catch (error) {
      setStatus(`导出失败: ${error.message}`)
    }
  }

  const generateSimpleCSV = (applicants: any[]) => {
    const headers = ['姓名', '年龄', '现居地', '职位', '实习经历', '可到岗时间', '工作天数', '教育背景', '项目经历', '申请时间']
    const rows = applicants.map(a => [
      a.name || '',
      a.age || '',
      a.location || '',
      a.position || '',
      a.internExperience || '',
      a.availability || '',
      a.workDays || '',
      a.education || '',
      a.projectExperience || '',
      new Date(a.applyTime).toLocaleString('zh-CN')
    ])
    
    return [headers, ...rows].map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n')
  }

  const handleClearData = async () => {
    if (confirm('确定要清空所有申请人数据吗？此操作不可恢复。')) {
      try {
        await chrome.storage.local.remove(['applicants'])
        setApplicantCount(0)
        setStatus("数据已清空")
      } catch (error) {
        setStatus(`清空失败: ${error.message}`)
      }
    }
  }

  return (
    <div style={{ width: 400, padding: 16, fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ margin: 0, marginBottom: 16, color: '#333', textAlign: 'center' }}>
        🤖 HR自动化助手
      </h2>
      
      <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <div style={{ fontSize: 12, marginBottom: 4 }}>
          状态: <strong style={{ color: processing ? '#ff6b35' : '#28a745' }}>{status}</strong>
        </div>
        <div style={{ fontSize: 12, marginBottom: 4 }}>
          当前页面: <strong>{pageStats.totalApplicants} 个申请人</strong>
        </div>
        <div style={{ fontSize: 12 }}>
          已收集数据: <strong>{applicantCount} 条</strong>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 14, fontWeight: 'bold', display: 'block', marginBottom: 8 }}>
          📝 自动回复消息模板：
        </label>
        <textarea
          value={replyMessage}
          onChange={(e) => setReplyMessage(e.target.value)}
          placeholder="请输入自动回复消息..."
          style={{
            width: '100%',
            height: 80,
            padding: 8,
            border: '1px solid #ddd',
            borderRadius: 4,
            fontSize: 12,
            resize: 'vertical',
            fontFamily: 'Arial, sans-serif'
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <button
          onClick={async () => {
            if (processing) {
              // 停止批量处理
              await chrome.storage.local.set({
                batchProcessing: {
                  active: false,
                  stopped: true
                }
              })
              setProcessing(false)
              setStatus("批量处理已停止")
            } else {
              handleStartBatchProcess()
            }
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: processing ? '#dc3545' : '#007cff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: 14,
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: 8
          }}
        >
          {processing ? '⏹️ 停止批量处理' : '🚀 批量沟通 + 收集数据'}
        </button>
        
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={handleScanOnly}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            📊 仅收集数据
          </button>
          
          <button
            onClick={handleDebugPage}
            style={{
              padding: '8px 12px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            🔍 调试
          </button>
        </div>
        
        <button
          onClick={async () => {
            setStatus('正在刷新页面数据...')
            await getPageStats()
            setTimeout(loadData, 1000)
          }}
          style={{
            width: '100%',
            padding: '6px 12px',
            backgroundColor: '#ffc107',
            color: '#333',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer',
            marginTop: 8
          }}
        >
          🔄 刷新检测页面数据
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={handleExportCSV}
          disabled={applicantCount === 0}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: applicantCount > 0 ? '#28a745' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            cursor: applicantCount > 0 ? 'pointer' : 'not-allowed'
          }}
        >
          📄 导出CSV ({applicantCount})
        </button>
        
        <button
          onClick={handleClearData}
          disabled={applicantCount === 0}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: applicantCount > 0 ? '#dc3545' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            cursor: applicantCount > 0 ? 'pointer' : 'not-allowed'
          }}
        >
          🗑️ 清空数据
        </button>
      </div>

      <div style={{ fontSize: 10, color: '#666', textAlign: 'center', lineHeight: 1.5 }}>
        <div>💡 使用说明:</div>
        <div>1. 在申请人列表页面点击"批量沟通"</div>
        <div>2. 系统会自动点击每个申请人的沟通按钮</div>
        <div>3. 发送设定的回复消息并收集联系方式</div>
        <div>4. 完成后可导出CSV文件</div>
      </div>
    </div>
  )
}

// 直接在页面上执行的扫描函数
function scanApplicantsDirectly() {
  console.log("🔍 开始直接扫描申请人信息")
  
  const cards = document.querySelectorAll('.resume-item')
  const applicants = []
  
  cards.forEach((card, index) => {
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
      
      const applicant = {
        id: `${Date.now()}_${index}`,
        name: name,
        age: ageMatch ? ageMatch[1] : '',
        location: locationMatch ? locationMatch[1].trim() : '',
        internExperience: internMatch ? internMatch[1] : '',
        phone: '', // 需要点击查看详情才能获取
        email: '', // 需要点击查看详情才能获取
        position: '未知职位',
        applyTime: new Date().toISOString(),
        status: '新申请'
      }
      
      applicants.push(applicant)
      console.log(`扫描到申请人: ${name}`)
    } catch (error) {
      console.error(`扫描第 ${index + 1} 个申请人失败:`, error)
    }
  })
  
  console.log(`✅ 扫描完成，共找到 ${applicants.length} 个申请人`)
  return applicants
}

// 直接在页面上执行的批量处理函数
function batchProcessDirectly(replyMessage: string) {
  console.log("🚀 开始直接批量处理")
  console.log("回复消息模板:", replyMessage)
  
  const cards = document.querySelectorAll('.resume-item')
  console.log(`找到 ${cards.length} 个申请人卡片`)
  
  let processedCount = 0
  let currentIndex = 0
  
  // 处理单个申请人的函数
  async function processApplicant(card: Element, index: number) {
    console.log(`处理第 ${index + 1}/${cards.length} 个申请人`)
    
    // 查找沟通按钮
    const buttons = card.querySelectorAll('button')
    let communicateButton: HTMLButtonElement | null = null
    
    for (const button of buttons) {
      if (button.textContent?.trim() === '沟通') {
        communicateButton = button as HTMLButtonElement
        break
      }
    }
    
    if (communicateButton) {
      console.log("找到沟通按钮，点击进入聊天")
      communicateButton.click()
      
      // 等待聊天界面加载
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // 查找聊天输入框
      let chatInput = document.querySelector('textarea[placeholder="请输入"]') as HTMLTextAreaElement
      
      // 如果没找到，再等一会儿
      if (!chatInput) {
        console.log("未找到输入框，再等待2秒...")
        await new Promise(resolve => setTimeout(resolve, 2000))
        chatInput = document.querySelector('textarea[placeholder="请输入"]') as HTMLTextAreaElement
      }
      
      if (chatInput) {
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
        
        // 按照exact-enter.js中成功的事件序列
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
        processedCount++
        
        // 等待消息发送完成
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // 返回列表页面（点击返回或关闭按钮）
        // 基于HTML结构，关闭按钮在 .chat-close 中
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
        await new Promise(resolve => setTimeout(resolve, 2000))
      } else {
        console.log("未找到聊天输入框")
        
        // 尝试返回列表
        window.history.back()
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } else {
      console.log("未找到沟通按钮")
    }
  }
  
  // 顺序处理每个申请人
  async function processNext() {
    // 检查是否应该停止
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get(['batchProcessing'], (data) => resolve(data))
      })
      
      if (result.batchProcessing && !result.batchProcessing.active) {
        console.log("批量处理已被用户停止")
        return
      }
    }
    
    if (currentIndex < cards.length) {
      // 重新获取卡片列表，因为页面可能已经刷新
      const currentCards = document.querySelectorAll('.resume-item')
      if (currentCards[currentIndex]) {
        await processApplicant(currentCards[currentIndex], currentIndex)
        
        // 更新进度到存储
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.get(['batchProcessing'], (result) => {
            if (result.batchProcessing) {
              chrome.storage.local.set({
                batchProcessing: {
                  ...result.batchProcessing,
                  processedCount: processedCount
                }
              })
            }
          })
        }
      }
      currentIndex++
      
      // 继续处理下一个
      setTimeout(processNext, 1000) // 给页面一些时间稳定
    } else {
      console.log(`✅ 批量处理完成，共成功发送消息给 ${processedCount} 个申请人`)
      
      // 标记批量处理完成
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({
          batchProcessing: {
            active: false,
            endTime: new Date().toISOString(),
            totalCount: cards.length,
            processedCount: processedCount
          }
        })
      }
    }
  }
  
  // 开始处理
  processNext()
}

export default IndexPopup
