import { useEffect, useState } from "react"

function IndexPopup() {
  const [status, setStatus] = useState("正在加载...")
  const [applicantCount, setApplicantCount] = useState(0)
  const [pageStats, setPageStats] = useState({ totalApplicants: 0 })
  const [replyMessage, setReplyMessage] = useState("您好！感谢您的申请，我们已收到您的简历，会尽快安排面试官查看并与您联系。期待与您进一步沟通！")
  const [processing, setProcessing] = useState(false)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    loadData()
    // 延迟一下以确保内容脚本已加载
    setTimeout(() => {
      getPageStats()
    }, 500)
    
    // 监听来自批量处理的页面更新请求
    const messageListener = (request: any) => {
      if (request.action === 'updatePageStats') {
        getPageStats()
        loadData()
      }
    }
    
    // 监听存储变化，实时更新数据
    const storageListener = (changes: any, namespace: string) => {
      if (namespace === 'local') {
        if (changes.applicants) {
          const newApplicants = changes.applicants.newValue || []
          setApplicantCount(newApplicants.length)
          console.log(`数据已更新，当前总计: ${newApplicants.length} 条`)
        }
        if (changes.batchProcessing) {
          const processing = changes.batchProcessing.newValue
          if (processing && processing.active) {
            const pageInfo = processing.currentPage ? '(处理中...)' : ''
            setStatus(`正在处理... 已完成 ${processing.processedCount} 个 ${pageInfo}`)
          }
        }
      }
    }
    
    if (chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener)
    }
    
    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(storageListener)
    }
    
    return () => {
      if (chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(messageListener)
      }
      if (chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(storageListener)
      }
    }
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
              }
            })
            
            if (results && results[0] && results[0].result) {
              const stats = results[0].result
              setPageStats(stats)
              const pageInfo = stats.pageNumber > 1 ? `第 ${stats.pageNumber} 页 - ` : ''
              setStatus(`${pageInfo}${stats.totalApplicants} 个申请人`)
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
        
        // 定期更新进度和数据数量
        const progressInterval = setInterval(async () => {
          const result = await chrome.storage.local.get(['batchProcessing', 'applicants'])
          if (result.batchProcessing) {
            if (!result.batchProcessing.active) {
              clearInterval(progressInterval)
              setProcessing(false)
              
              const pageInfo = result.batchProcessing.totalPages ? 
                `${result.batchProcessing.totalPages} 页，` : ''
              
              setStatus(`批量处理完成，共处理 ${pageInfo}${result.batchProcessing.processedCount} 个申请人`)
              loadData()
            } else {
              const currentPage = result.batchProcessing.currentPage ? '(处理中...)' : ''
              setStatus(`正在处理... 已完成 ${result.batchProcessing.processedCount} 个 ${currentPage}`)
            }
          }
          
          // 实时更新收集的数据数量
          if (result.applicants) {
            setApplicantCount(result.applicants.length)
          }
        }, 1000)
      }
    } catch (error) {
      setStatus(`批量处理失败: ${error.message}`)
      setProcessing(false)
    }
  }

  // 仅收集数据，不发送消息
  const handleScanOnly = async () => {
    if (scanning) {
      // 停止收集
      setScanning(false)
      await chrome.storage.local.set({ 
        scanProcessing: { active: false } 
      })
      setStatus("已停止收集")
      return
    }
    
    setScanning(true)
    setStatus("正在扫描申请人信息...")
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'scanApplicants' })
          setStatus("扫描完成")
        } catch (msgError) {
          console.log("内容脚本未响应，使用直接执行方式")
          
          // 设置扫描状态
          await chrome.storage.local.set({ 
            scanProcessing: { active: true } 
          })
          
          // 直接在页面上执行扫描
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: scanApplicantsDirectly
          })
          
          if (results && results[0] && results[0].result) {
            const applicants = results[0].result
            // 保存到存储（累积保存）
            const existingData = await chrome.storage.local.get(['applicants'])
            const existingApplicants = existingData.applicants || []
            
            // 去重处理（基于ID）
            const existingIds = new Set(existingApplicants.map(a => a.id))
            const newApplicants = applicants.filter(a => !existingIds.has(a.id))
            
            const allApplicants = [...existingApplicants, ...newApplicants]
            await chrome.storage.local.set({ applicants: allApplicants })
            
            setStatus(`扫描完成，新增 ${newApplicants.length} 条数据（总计 ${allApplicants.length} 条）`)
          }
        }
        
        setTimeout(() => {
          loadData()
          getPageStats()
          setScanning(false)
        }, 2000)
      }
    } catch (error) {
      setStatus(`扫描失败: ${error.message}`)
      setScanning(false)
    } finally {
      // 确保重置扫描状态
      setScanning(false)
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
    const headers = ['姓名', '手机号', '邮箱', '年龄', '现居地', '投递职位', '求职意向', '在线简历', '申请时间']
    const rows = applicants.map(a => [
      a.name || '',
      a.phone || '',
      a.email || '',
      a.age || '',
      a.location || '',
      a.position || '',
      a.jobIntention || '',
      a.onlineResume || '',
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
          {pageStats.pageNumber && pageStats.pageNumber > 1 ? ` (第 ${pageStats.pageNumber} 页)` : ''}
        </div>
        <div style={{ fontSize: 12 }}>
          累计收集数据: <strong>{applicantCount} 条</strong>
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
              backgroundColor: scanning ? '#dc3545' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            {scanning ? '⏹ 停止收集' : '📊 仅收集数据'}
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
        <div>1. 在申请人列表页面点击"批量沟通"或"仅收集数据"</div>
        <div>2. 系统会自动点击每个申请人进入详情页</div>
        <div>3. 获取手机号和邮箱，并发送沟通消息（如果选择批量沟通）</div>
        <div>4. 自动处理所有分页，完成后可导出CSV文件</div>
      </div>
    </div>
  )
}

// 直接在页面上执行的扫描函数（支持分页和获取联系方式）
function scanApplicantsDirectly() {
  console.log("🔍 开始扫描所有页面的申请人信息")
  
  let allApplicants = []
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
          console.log("扫描已被用户停止")
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
            console.log(`从卡片顶部获取职位: ${listPosition}`)
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
              console.log(`从卡片顶部元素获取职位: ${listPosition}`)
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
        console.log(`点击第 ${index + 1} 个申请人卡片进入详情页...`)
        const cardClickable = card.querySelector('.resume-info__center') || card
        ;(cardClickable as HTMLElement).click()
        
        // 等待详情页加载
        console.log(`等待详情页加载...`)
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // 检查页面是否加载完成（查找关键元素）
        let retryCount = 0
        const maxRetries = 5
        while (retryCount < maxRetries) {
          // 检查是否有加载指示器
          const loadingMask = document.querySelector('.el-loading-mask, .loading, [class*="loading"]')
          if (loadingMask) {
            console.log(`检测到加载指示器，等待加载完成...`)
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          
          // 检查联系信息元素
          const phoneEmailElements = document.querySelectorAll('.phone-email-item')
          const phoneEmailContainer = document.querySelector('.phone-email')
          
          if (phoneEmailElements.length >= 2 || (phoneEmailContainer && phoneEmailContainer.textContent.includes('@'))) {
            console.log(`找到联系信息元素，页面加载完成`)
            // 再等待一下确保内容完全渲染
            await new Promise(resolve => setTimeout(resolve, 1000))
            break
          }
          
          retryCount++
          console.log(`联系信息尚未加载，等待中... (重试 ${retryCount}/${maxRetries})`)
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
              console.log("从 phone-email-item 提取手机号:", phoneNumber)
            }
            
            // 检查是否包含邮箱
            const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/)
            if (emailMatch && !email) {
              email = emailMatch[0]
              console.log("从 phone-email-item 提取邮箱:", email)
            }
          })
        }
        
        // 如果没有找到单独的元素，尝试从组合元素中提取
        if (!phoneNumber || !email) {
          const phoneEmailElement = document.querySelector('.phone-email, [class*="phone-email"]')
          if (phoneEmailElement && !phoneEmailElement.classList.contains('phone-email-item')) {
            const text = phoneEmailElement.textContent || ''
            console.log("找到 phone-email 组合元素:", text)
            
            // 提取手机号（可能带有 +86 前缀）
            if (!phoneNumber) {
              const phoneMatch = text.match(/(?:\+86\s*)?1[3-9]\d{9}/)
              if (phoneMatch) {
                phoneNumber = phoneMatch[0].replace(/\+86\s*/, '')
                console.log("提取手机号:", phoneNumber)
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
                console.log("提取邮箱:", email)
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
            'span:has-text("手机")',
            'span:has-text("电话")',
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
                  console.log("找到手机号:", phoneNumber)
                  break
                }
              }
            } catch (e) {}
          }
        }
        
        if (!email) {
          const emailSelectors = [
            '[class*="email"]:not(.phone-email)',
            '[class*="mail"]',
            'span:has-text("邮箱")',
            'span:has-text("Email")',
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
                  console.log("找到邮箱:", email)
                  break
                }
              }
            } catch (e) {}
          }
        }
        
        // 最后的备选方案：在页面文本中查找
        if (!phoneNumber || !email) {
          const bodyText = document.body.textContent || ''
          
          if (!phoneNumber) {
            const phoneMatch = bodyText.match(/(?:\+86\s*)?1[3-9]\d{9}/)
            if (phoneMatch) {
              phoneNumber = phoneMatch[0].replace(/\+86\s*/, '')
              console.log("从页面文本中找到手机号:", phoneNumber)
            }
          }
          
          if (!email) {
            const emailMatch = bodyText.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/)
            if (emailMatch) {
              email = emailMatch[0]
              console.log("从页面文本中找到邮箱:", email)
            }
          }
        }
        
        // 查找求职意向
        console.log("查找求职意向...")
        let jobIntention = ''
        
        // 基于HTML结构查找求职意向
        const expJobsElement = document.querySelector('.exp-jobs')
        if (expJobsElement) {
          const text = expJobsElement.textContent?.trim() || ''
          const match = text.match(/求职意向[：:]\s*(.+)/)
          if (match) {
            jobIntention = match[1].trim()
            console.log(`找到求职意向: ${jobIntention}`)
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
                  console.log(`从 main-detail-sub 找到求职意向: ${jobIntention}`)
                }
              }
            })
          }
        }
        
        // 查找投递职位（从详情页）
        console.log("查找投递职位（详情页）...")
        let detailPosition = ''
        const positionTitleElement = document.querySelector('.resume-tools__title')
        if (positionTitleElement) {
          const text = positionTitleElement.textContent?.trim() || ''
          const match = text.match(/投递职位[：:]\s*(.+?)(?:·|$)/)
          if (match) {
            detailPosition = match[1].trim()
            console.log(`找到投递职位: ${detailPosition}`)
          } else if (text) {
            // 如果没有"投递职位："前缀，尝试直接使用文本
            detailPosition = text.replace(/·.+$/, '').trim()
            console.log(`找到投递职位（无前缀）: ${detailPosition}`)
          }
        }
        
        // 如果详情页找到了职位，优先使用详情页的
        if (detailPosition) {
          applicant.position = detailPosition
        }
        
        // 处理在线简历
        console.log("处理在线简历...")
        let onlineResume = ''
        const resumeOnlineDiv = document.querySelector('.resume-online')
        if (resumeOnlineDiv) {
          // 获取所有section的内容
          const allSections = resumeOnlineDiv.querySelectorAll('.resume-online-item')
          const resumeContent = []
          
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
            console.log(`找到在线简历完整内容: ${onlineResume.substring(0, 200)}...`)
          } else {
            // 如果没有找到内容，尝试获取所有sections的标题
            const resumeSections = resumeOnlineDiv.querySelectorAll('.resume-online-item__title')
            const sectionTitles = Array.from(resumeSections).map(el => el.textContent?.trim()).filter(Boolean)
            if (sectionTitles.length > 0) {
              onlineResume = `在线简历 - 包含: ${sectionTitles.join(', ')}`
              console.log(`找到在线简历结构: ${onlineResume}`)
            } else {
              onlineResume = '在线简历（已查看）'
            }
          }
        }
        
        // 更新申请人信息
        applicant.phone = phoneNumber
        applicant.email = email
        applicant.jobIntention = jobIntention
        applicant.onlineResume = onlineResume
        
        console.log(`申请人: ${name}, 投递职位: ${applicant.position}, 求职意向: ${jobIntention || '未找到'}, 在线简历: ${onlineResume || '未找到'}, 手机: ${phoneNumber || '未找到'}, 邮箱: ${email || '未找到'}`)
        
        // 如果没有找到邮箱，再等待一下并重试
        if (!email && retryCount < 3) {
          console.log(`邮箱未找到，再等待2秒后重试提取...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // 重新尝试找邮箱
          const phoneItems2 = document.querySelectorAll('.phone-email-item')
          phoneItems2.forEach(item => {
            const text = item.textContent || ''
            const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/)
            if (emailMatch && !email) {
              email = emailMatch[0]
              console.log(`重试后找到邮箱: ${email}`)
              applicant.email = email
            }
          })
        }
        
        // 关闭弹窗返回列表页面
        console.log("查找关闭按钮...")
        
        // 查找弹窗关闭按钮（通常在右上角）
        const closeSelectors = [
          '.el-dialog__headerbtn',  // Element UI dialog close button
          '.el-dialog__close',      // Element UI close icon
          '.el-icon-close',         // Element UI close icon
          'button[aria-label="Close"]',
          'button[aria-label="关闭"]',
          '.dialog-close',
          '.modal-close',
          '[class*="close"]:not(.phone-email)',
          'i.el-dialog__close'
        ]
        
        let closeButton = null
        for (const selector of closeSelectors) {
          closeButton = document.querySelector(selector)
          if (closeButton) {
            console.log(`找到关闭按钮: ${selector}`)
            break
          }
        }
        
        if (closeButton) {
          console.log("点击关闭按钮返回列表")
          ;(closeButton as HTMLElement).click()
        } else {
          console.log("未找到关闭按钮，尝试ESC键")
          // 尝试按ESC键关闭弹窗
          document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape',
            keyCode: 27,
            bubbles: true
          }))
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        pageApplicants.push(applicant)
      } catch (error) {
        console.error(`扫描第 ${index + 1} 个申请人失败:`, error)
        // 尝试返回列表
        try {
          window.history.back()
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (e) {}
      }
    }
    
    return pageApplicants
  }
  
  // 扫描所有页面
  async function scanAllPages() {
    while (true) {
      // 检查是否应该停止
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['scanProcessing'])
        if (result.scanProcessing && !result.scanProcessing.active) {
          console.log("扫描已被用户停止")
          break
        }
      }
      
      console.log(`📄 扫描第 ${pageNumber} 页`)
      
      const pageApplicants = await scanCurrentPage()
      allApplicants = allApplicants.concat(pageApplicants)
      console.log(`第 ${pageNumber} 页找到 ${pageApplicants.length} 个申请人`)
      
      // 实时保存数据
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const existingData = await chrome.storage.local.get(['applicants'])
        const existingApplicants = existingData.applicants || []
        const existingIds = new Set(existingApplicants.map(a => a.id))
        const newApplicants = pageApplicants.filter(a => !existingIds.has(a.id))
        const allStoredApplicants = [...existingApplicants, ...newApplicants]
        await chrome.storage.local.set({ applicants: allStoredApplicants })
        console.log(`💾 保存了 ${newApplicants.length} 条新数据（总计 ${allStoredApplicants.length} 条）`)
      }
      
      const nextButton = findNextPageButton()
      if (nextButton) {
        pageNumber++
        ;(nextButton as HTMLElement).click()
        await new Promise(resolve => setTimeout(resolve, 2000))
      } else {
        break
      }
    }
    
    console.log(`✅ 扫描完成，共 ${pageNumber} 页，找到 ${allApplicants.length} 个申请人`)
    return allApplicants
  }
  
  // 如果需要异步，返回Promise
  return scanAllPages()
}

// 直接在页面上执行的批量处理函数
function batchProcessDirectly(replyMessage: string) {
  console.log("🚀 开始直接批量处理")
  console.log("回复消息模板:", replyMessage)
  
  let totalProcessedCount = 0
  let currentPageProcessedCount = 0
  let currentIndex = 0
  let isProcessing = true
  let failedCount = 0
  
  // 查找分页相关元素
  function findPaginationElements() {
    // 查找下一页按钮（可能的选择器）
    const nextPageSelectors = [
      '.el-pagination button.btn-next',
      '.el-pagination .el-icon-arrow-right',
      '.pagination-next',
      '[aria-label="下一页"]',
      'button:has(.el-icon-arrow-right)',
      '.el-pager + button'
    ]
    
    let nextButton = null
    for (const selector of nextPageSelectors) {
      try {
        nextButton = document.querySelector(selector)
        if (nextButton && !(nextButton as HTMLButtonElement).disabled) {
          console.log(`找到下一页按钮: ${selector}`)
          break
        }
      } catch (e) {
        // 某些选择器可能不支持
      }
    }
    
    // 查找页码信息
    const pageInfo = document.querySelector('.el-pagination__total') || 
                    document.querySelector('.pagination-info') ||
                    document.querySelector('[class*="pagination"]')
    
    return { nextButton, pageInfo }
  }
  
  // 处理当前页面的所有申请人
  async function processCurrentPage() {
    const cards = document.querySelectorAll('.resume-item')
    console.log(`当前页面找到 ${cards.length} 个申请人`)
    
    currentPageProcessedCount = 0
    currentIndex = 0
  
  // 处理单个申请人的函数
  async function processApplicant(card: Element, index: number, totalCards: number) {
    console.log(`\n处理第 ${index + 1}/${totalCards} 个申请人`)
    
    try {
    // 先提取申请人信息并保存
    const nameElement = card.querySelector('.resume-info__center-name')
    const name = nameElement?.textContent?.trim() || `申请人${index + 1}`
    
    const detailElement = card.querySelector('.resume-info__center-detail')
    const detailText = detailElement?.textContent || ''
    
    const ageMatch = detailText.match(/(\d{1,2})岁/)
    const locationMatch = detailText.match(/现居：([^实]+)/)
    const internMatch = detailText.match(/(实习\d+次)/)
    
    // 从卡片顶部获取投递职位
    let listPosition = ''
    const cardHeader = card.querySelector('.resume-item__header, .card-header, [class*="header"]')
    if (cardHeader) {
      const headerText = cardHeader.textContent || ''
      const positionMatch = headerText.match(/^([^\d]+?)(?:\s*\d{4}|\s*转发|$)/)
      if (positionMatch) {
        listPosition = positionMatch[1].trim()
        console.log(`从卡片顶部获取职位: ${listPosition}`)
      }
    }
    
    if (!listPosition) {
      const topElements = card.querySelectorAll('.resume-item > div:first-child, .resume-item > *:first-child')
      for (const elem of topElements) {
        const text = elem.textContent?.trim() || ''
        if (text && text.length > 2 && text.length < 50 && 
            !text.includes('转发') && !text.match(/\d{4}-\d{2}-\d{2}/)) {
          listPosition = text.split(/\s{2,}/)[0]
          console.log(`从卡片顶部元素获取职位: ${listPosition}`)
          break
        }
      }
    }
    
    const applicant = {
      id: `${Date.now()}_${index}`,
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
      status: '已沟通'
    }
    
    // 保存申请人信息（在获取完联系方式后再保存）
    // 这部分代码移到获取联系方式之后
    
    // 先点击卡片进入详情页获取联系方式
    console.log("点击卡片进入详情页...")
    const cardClickable = card.querySelector('.resume-info__center') || card
    ;(cardClickable as HTMLElement).click()
    
    // 等待详情页加载
    console.log(`等待详情页加载...`)
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // 检查页面是否加载完成（查找关键元素）
    let retryCount = 0
    while (retryCount < 3) {
      const phoneEmailElements = document.querySelectorAll('.phone-email-item')
      if (phoneEmailElements.length > 0) {
        console.log(`找到联系信息元素，页面加载完成`)
        break
      }
      
      retryCount++
      console.log(`联系信息尚未加载，等待中... (重试 ${retryCount}/3)`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    // 在详情页中查找联系方式
    console.log("查找联系方式...")
    
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
          console.log("从 phone-email-item 提取手机号:", phoneNumber)
        }
        
        // 检查是否包含邮箱
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/)
        if (emailMatch && !email) {
          email = emailMatch[0]
          console.log("从 phone-email-item 提取邮箱:", email)
        }
      })
    }
    
    // 如果没有找到单独的元素，尝试从组合元素中提取
    if (!phoneNumber || !email) {
      const phoneEmailElement = document.querySelector('.phone-email, [class*="phone-email"]')
      if (phoneEmailElement && !phoneEmailElement.classList.contains('phone-email-item')) {
        const text = phoneEmailElement.textContent || ''
        console.log("找到 phone-email 组合元素:", text)
        
        // 提取手机号（可能带有 +86 前缀）
        if (!phoneNumber) {
          const phoneMatch = text.match(/(?:\+86\s*)?1[3-9]\d{9}/)
          if (phoneMatch) {
            phoneNumber = phoneMatch[0].replace(/\+86\s*/, '')
            console.log("提取手机号:", phoneNumber)
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
            console.log("提取邮箱:", email)
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
        'span:has-text("手机")',
        'span:has-text("电话")',
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
              console.log("找到手机号:", phoneNumber)
              break
            }
          }
        } catch (e) {}
      }
    }
    
    if (!email) {
      const emailSelectors = [
        '[class*="email"]:not(.phone-email)',
        '[class*="mail"]',
        'span:has-text("邮箱")',
        'span:has-text("Email")',
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
              console.log("找到邮箱:", email)
              break
            }
          }
        } catch (e) {}
      }
    }
    
    // 最后的备选方案：在页面文本中查找
    if (!phoneNumber || !email) {
      const bodyText = document.body.textContent || ''
      
      if (!phoneNumber) {
        const phoneMatch = bodyText.match(/(?:\+86\s*)?1[3-9]\d{9}/)
        if (phoneMatch) {
          phoneNumber = phoneMatch[0].replace(/\+86\s*/, '')
          console.log("从页面文本中找到手机号:", phoneNumber)
        }
      }
      
      if (!email) {
        const emailMatch = bodyText.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/)
        if (emailMatch) {
          email = emailMatch[0]
          console.log("从页面文本中找到邮箱:", email)
        }
      }
    }
    
    // 查找求职意向
    console.log("查找求职意向...")
    let jobIntention = ''
    
    // 基于HTML结构查找求职意向
    const expJobsElement = document.querySelector('.exp-jobs')
    if (expJobsElement) {
      const text = expJobsElement.textContent?.trim() || ''
      const match = text.match(/求职意向[：:]\s*(.+)/)
      if (match) {
        jobIntention = match[1].trim()
        console.log(`找到求职意向: ${jobIntention}`)
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
              console.log(`从 main-detail-sub 找到求职意向: ${jobIntention}`)
            }
          }
        })
      }
    }
    
    // 查找投递职位（从详情页）
    console.log("查找投递职位（详情页）...")
    let detailPosition = ''
    const positionTitleElement = document.querySelector('.resume-tools__title')
    if (positionTitleElement) {
      const text = positionTitleElement.textContent?.trim() || ''
      const match = text.match(/投递职位[：:]\s*(.+?)(?:·|$)/)
      if (match) {
        detailPosition = match[1].trim()
        console.log(`找到投递职位: ${detailPosition}`)
      } else if (text) {
        // 如果没有"投递职位："前缀，尝试直接使用文本
        detailPosition = text.replace(/·.+$/, '').trim()
        console.log(`找到投递职位（无前缀）: ${detailPosition}`)
      }
    }
    
    // 如果详情页找到了职位，优先使用详情页的
    if (detailPosition) {
      applicant.position = detailPosition
    }
    
    // 处理在线简历
    console.log("处理在线简历...")
    let onlineResume = ''
    const resumeOnlineDiv = document.querySelector('.resume-online')
    if (resumeOnlineDiv) {
      // 获取所有section的内容
      const allSections = resumeOnlineDiv.querySelectorAll('.resume-online-item')
      const resumeContent = []
      
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
        console.log(`找到在线简历完整内容: ${onlineResume.substring(0, 200)}...`)
      } else {
        // 如果没有找到内容，尝试获取所有sections的标题
        const resumeSections = resumeOnlineDiv.querySelectorAll('.resume-online-item__title')
        const sectionTitles = Array.from(resumeSections).map(el => el.textContent?.trim()).filter(Boolean)
        if (sectionTitles.length > 0) {
          onlineResume = `在线简历 - 包含: ${sectionTitles.join(', ')}`
          console.log(`找到在线简历结构: ${onlineResume}`)
        } else {
          onlineResume = '在线简历（已查看）'
        }
      }
    }
    
    // 更新申请人信息
    applicant.phone = phoneNumber
    applicant.email = email
    applicant.jobIntention = jobIntention
    applicant.onlineResume = onlineResume
    
    console.log(`获取到信息 - 投递职位: ${applicant.position}, 求职意向: ${jobIntention || '未找到'}, 在线简历: ${onlineResume || '未找到'}, 手机: ${phoneNumber || '未找到'}, 邮箱: ${email || '未找到'}`)
    
    // 如果没有找到邮箱，再等待一下并重试
    if (!email && retryCount < 3) {
      console.log(`邮箱未找到，再等待2秒后重试提取...`)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 重新尝试找邮箱
      const phoneItems2 = document.querySelectorAll('.phone-email-item')
      phoneItems2.forEach(item => {
        const text = item.textContent || ''
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[\w]{2,}/)
        if (emailMatch && !email) {
          email = emailMatch[0]
          console.log(`重试后找到邮箱: ${email}`)
          applicant.email = email
        }
      })
    }
    
    // 关闭详情弹窗返回列表页面
    console.log("关闭详情弹窗...")
    
    const closeSelectors = [
      '.el-dialog__headerbtn',  // Element UI dialog close button
      '.el-dialog__close',      // Element UI close icon
      '.el-icon-close',         // Element UI close icon
      'button[aria-label="Close"]',
      'button[aria-label="关闭"]',
      '.dialog-close',
      '.modal-close',
      '[class*="close"]:not(.phone-email)',
      'i.el-dialog__close'
    ]
    
    let closeButton = null
    for (const selector of closeSelectors) {
      closeButton = document.querySelector(selector)
      if (closeButton) {
        console.log(`找到关闭按钮: ${selector}`)
        break
      }
    }
    
    if (closeButton) {
      console.log("点击关闭按钮返回列表")
      ;(closeButton as HTMLElement).click()
    } else {
      console.log("未找到关闭按钮，尝试ESC键")
      // 尝试按ESC键关闭弹窗
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        keyCode: 27,
        bubbles: true
      }))
    }
    
    // 等待弹窗关闭和页面更新
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 重新获取卡片元素（因为页面可能已经更新）
    const updatedCards = document.querySelectorAll('.resume-item')
    const updatedCard = updatedCards[index]
    
    if (!updatedCard) {
      console.log("无法找到更新后的卡片元素")
      return false
    }
    
    // 查找沟通按钮（在列表页面中）
    const buttons = updatedCard.querySelectorAll('button')
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
        
        // 等待消息发送完成（增加延迟避免网络超时）
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // 保存申请人信息（包含联系方式）
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const existingData = await chrome.storage.local.get(['applicants'])
          const existingApplicants = existingData.applicants || []
          const existingIds = new Set(existingApplicants.map(a => a.id))
          
          if (!existingIds.has(applicant.id)) {
            const allApplicants = [...existingApplicants, applicant]
            await chrome.storage.local.set({ applicants: allApplicants })
            console.log(`💾 已保存申请人信息: ${name}，手机: ${applicant.phone || '未找到'}，邮箱: ${applicant.email || '未找到'}`)
          }
        }
        
        // 返回列表页面（点击返回或关闭按钮）
        console.log("准备返回列表页面...")
        
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
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // 标记成功
        return true
      } else {
        console.log("未找到聊天输入框")
        
        // 尝试返回列表
        window.history.back()
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        return false
      }
    } else {
      console.log("未找到沟通按钮")
      return false
    }
    } catch (error) {
      console.error(`处理申请人 ${index + 1} 时出错:`, error)
      
      // 尝试返回列表页面
      try {
        window.history.back()
        await new Promise(resolve => setTimeout(resolve, 3000))
      } catch (e) {
        console.error("返回列表失败:", e)
      }
      
      return false
    }
  }
  
    // 顺序处理每个申请人
    for (let i = 0; i < cards.length; i++) {
      // 检查是否应该停止
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await new Promise((resolve) => {
          chrome.storage.local.get(['batchProcessing'], (data) => resolve(data))
        })
        
        if (result.batchProcessing && !result.batchProcessing.active) {
          console.log("批量处理已被用户停止")
          isProcessing = false
          return false
        }
      }
      
      // 处理申请人，传入正确的参数
      const success = await processApplicant(cards[i], i, cards.length)
      
      if (success) {
        currentPageProcessedCount++
        totalProcessedCount++
      } else {
        failedCount++
        console.log(`⚠️ 申请人 ${i + 1} 处理失败`)
      }
      
      // 更新进度
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({
          batchProcessing: {
            active: true,
            processedCount: totalProcessedCount,
            failedCount: failedCount,
            currentPage: true
          }
        })
      }
      
      // 添加延迟，避免操作过快
      if (i < cards.length - 1) {
        console.log("等待 3 秒后处理下一个...")
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }
    
    return true
  }
  
  // 主处理流程
  async function processAllPages() {
    let pageNumber = 1
    
    while (isProcessing) {
      console.log(`\n📄 处理第 ${pageNumber} 页`)
      
      // 处理当前页面
      const success = await processCurrentPage()
      
      if (!success) {
        console.log("处理被中断")
        break
      }
      
      // 检查是否有下一页
      const { nextButton } = findPaginationElements()
      
      if (nextButton && !(nextButton as HTMLButtonElement).disabled) {
        console.log("找到下一页，准备切换...")
        
        // 点击下一页
        ;(nextButton as HTMLButtonElement).click()
        
        // 等待页面加载
        console.log("等待下一页加载...")
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // 更新页面统计（如果在Chrome扩展环境中）
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          try {
            // 通知popup更新页面统计
            chrome.runtime.sendMessage({ action: 'updatePageStats' })
          } catch (e) {
            console.log("无法发送更新消息:", e)
          }
        }
        
        pageNumber++
      } else {
        console.log("没有更多页面了")
        break
      }
    }
    
    console.log(`\n✅ 所有页面处理完成！`)
    console.log(`总共处理了 ${pageNumber} 页`)
    console.log(`成功处理: ${totalProcessedCount} 个申请人`)
    console.log(`失败: ${failedCount} 个`)
    
    // 标记批量处理完成
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        batchProcessing: {
          active: false,
          endTime: new Date().toISOString(),
          totalPages: pageNumber,
          processedCount: totalProcessedCount,
          failedCount: failedCount
        }
      })
    }
  }
  
  // 开始处理所有页面
  processAllPages()
}

export default IndexPopup
