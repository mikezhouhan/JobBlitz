import { useState, useCallback } from "react"
import type { PageStats } from "../types"
import { STATUS_MESSAGES, MESSAGE_ACTIONS, DELAYS } from "../constants"
import { getCurrentTab, messaging, scripting } from "../utils/chrome"
import { delays } from "../utils/async"

/**
 * 页面统计 Hook
 * 负责检测和获取当前页面的申请人统计信息
 */
export const usePageStats = () => {
  const [pageStats, setPageStats] = useState<PageStats>({ totalApplicants: 0 })

  // 获取页面统计信息
  const getPageStats = useCallback(async (setStatus: (status: string) => void) => {
    try {
      const tab = await getCurrentTab()
      if (!tab?.id) {
        setStatus('无法获取当前标签页')
        return null
      }
      
      // 首先检查内容脚本是否已加载
      const isContentScriptReady = await messaging.pingContentScript(tab.id)
      
      if (isContentScriptReady) {
        // 内容脚本已加载，获取统计信息
        const response = await messaging.getPageStats(tab.id)
        console.log('页面统计响应:', response)
        
        if (response && typeof response.totalApplicants === 'number') {
          setPageStats(response)
          setStatus(`${STATUS_MESSAGES.PAGE_DETECTION_SUCCESS} - ${response.totalApplicants} 个申请人`)
          return response
        } else {
          setStatus(STATUS_MESSAGES.PAGE_DETECTION_FAILED)
          return null
        }
      } else {
        console.log('内容脚本未响应，尝试手动检测')
        setStatus('正在手动检测页面...')
        
        // 尝试直接执行脚本检测
        if (scripting.isAvailable()) {
          try {
            const stats = await scripting.detectPageElements(tab.id)
            
            if (stats) {
              setPageStats(stats)
              const pageInfo = stats.pageNumber > 1 ? `第 ${stats.pageNumber} 页 - ` : ''
              setStatus(`${pageInfo}${stats.totalApplicants} 个申请人`)
              return stats
            }
          } catch (scriptError) {
            console.error('执行脚本失败:', scriptError)
            setStatus('无法检测页面内容')
          }
        } else {
          setStatus(STATUS_MESSAGES.CHROME_API_UNAVAILABLE)
        }
      }
      
      return null
    } catch (error: any) {
      console.error('获取页面统计失败:', error)
      setStatus(`检测失败: ${error.message}`)
      return null
    }
  }, [])

  // 刷新页面统计
  const refreshPageStats = useCallback(async (
    setStatus: (status: string) => void,
    loadData: () => Promise<void>
  ) => {
    setStatus(STATUS_MESSAGES.REFRESHING)
    await getPageStats(setStatus)
    setTimeout(loadData, DELAYS.SHORT_WAIT)
  }, [getPageStats])

  // 调试页面
  const debugPage = useCallback(async (setStatus: (status: string) => void) => {
    try {
      const tab = await getCurrentTab()
      if (!tab?.id) {
        setStatus('无法获取当前标签页')
        return
      }

      // 首先尝试通过内容脚本调试
      const response = await messaging.debugPage(tab.id)
      if (response) {
        let statusText = `${STATUS_MESSAGES.DEBUG_COMPLETED}:\n`
        Object.entries(response).forEach(([key, value]) => {
          statusText += `${key}: ${value}\n`
        })
        setStatus(statusText)
        return
      }

      // 如果内容脚本未响应，使用直接脚本执行
      if (scripting.isAvailable()) {
        const result = await scripting.debugPageStructure(tab.id)
        
        if (result) {
          let statusText = `${STATUS_MESSAGES.DEBUG_COMPLETED}:\n`
          Object.entries(result).forEach(([key, value]) => {
            statusText += `${key}: ${value}\n`
          })
          setStatus(statusText)
        } else {
          setStatus('调试信息已输出到控制台')
        }
      } else {
        setStatus('Chrome API 不可用，无法进行调试')
      }
    } catch (error: any) {
      setStatus(`调试失败: ${error.message}`)
    }
  }, [])

  return {
    // 状态
    pageStats,
    
    // 方法
    getPageStats,
    refreshPageStats,
    debugPage,
    
    // 工具方法
    setPageStats
  }
}