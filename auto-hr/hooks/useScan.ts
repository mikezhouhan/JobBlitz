import { useState, useCallback } from "react"
import type { Applicant } from "../types"
import { STORAGE_KEYS, STATUS_MESSAGES } from "../constants"
import { storage } from "../utils/chrome"
import { 
  checkTabAvailability,
  tryContentScriptScan,
  setScanStatus,
  executeDirectScan,
  processScanResults,
  getScanStatusMessage
} from "../utils/scanHelpers"

/**
 * 扫描 Hook
 * 负责管理数据扫描流程的状态和控制
 */
export const useScan = () => {
  const [scanning, setScanning] = useState<boolean>(false)

  // 开始扫描
  const startScan = useCallback(async (
    setStatus: (status: string) => void,
    loadData: () => Promise<void>,
    getPageStats: () => Promise<void>
  ) => {
    if (scanning) {
      // 停止收集
      setScanning(false)
      await setScanStatus(false)
      setStatus(STATUS_MESSAGES.SCAN_STOPPED)
      return
    }

    setScanning(true)
    setStatus(STATUS_MESSAGES.SCANNING)

    try {
      // 检查标签页可用性
      const { tab, error } = await checkTabAvailability()
      if (!tab || error) {
        setStatus(error || '标签页检查失败')
        setScanning(false)
        return
      }

      // 尝试通过内容脚本扫描
      const contentScriptSuccess = await tryContentScriptScan(tab.id!)
      
      if (contentScriptSuccess) {
        setStatus(STATUS_MESSAGES.SCAN_COMPLETED)
      } else {
        console.log("内容脚本未响应，使用直接执行方式")

        // 设置扫描状态
        await setScanStatus(true)

        // 直接在页面上执行扫描
        try {
          const applicants = await executeDirectScan(tab.id!)
          
          if (applicants) {
            const { newCount, totalCount } = await processScanResults(applicants)
            setStatus(getScanStatusMessage(newCount, totalCount))
          } else {
            setStatus("扫描完成，但未找到有效数据")
          }
        } catch (scriptError: any) {
          console.error("执行扫描脚本失败:", scriptError)
          setStatus(`扫描失败: ${scriptError.message}`)
        }
      }

      // 等待一段时间后更新数据
      setTimeout(() => {
        loadData()
        getPageStats()
        setScanning(false)
      }, 2000)

    } catch (error: any) {
      setStatus(`扫描失败: ${error.message}`)
      setScanning(false)
    }
  }, [scanning])

  // 停止扫描
  const stopScan = useCallback(async (setStatus: (status: string) => void) => {
    try {
      setScanning(false)
      await setScanStatus(false)
      setStatus(STATUS_MESSAGES.SCAN_STOPPED)
    } catch (error: any) {
      console.error('停止扫描失败:', error)
      setStatus(`停止扫描失败: ${error.message}`)
    }
  }, [])

  return {
    // 状态
    scanning,
    
    // 方法
    startScan,
    stopScan,
    
    // 工具方法
    setScanning
  }
}