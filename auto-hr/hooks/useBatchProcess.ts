import { useState, useEffect, useCallback } from "react"
import type { BatchProcessing } from "../types"
import { STORAGE_KEYS, STATUS_MESSAGES } from "../constants"
import { storage, storageListener } from "../utils/chrome"
import { 
  checkBatchTabAvailability,
  createBatchConfig,
  saveBatchConfig,
  tryContentScriptBatch,
  executeDirectBatch,
  createProgressUpdater,
  stopBatchProcessing
} from "../utils/batchHelpers"

/**
 * 批量处理 Hook
 * 负责管理批量沟通流程的状态和控制
 */
export const useBatchProcess = () => {
  const [processing, setProcessing] = useState<boolean>(false)

  // 开始批量处理
  const startBatchProcess = useCallback(async (
    replyMessage: string,
    totalApplicants: number,
    setStatus: (status: string) => void
  ) => {
    if (processing) return

    setProcessing(true)
    setStatus(STATUS_MESSAGES.BATCH_PROCESSING)

    try {
      // 检查标签页可用性
      const { tab, error } = await checkBatchTabAvailability()
      if (!tab || error) {
        setStatus(error || '标签页检查失败')
        setProcessing(false)
        return
      }

      // 创建并保存批量处理配置
      const { config, batchProcessing } = createBatchConfig(replyMessage, totalApplicants)
      await saveBatchConfig(config, batchProcessing)

      // 尝试通过内容脚本启动批量处理
      const contentScriptSuccess = await tryContentScriptBatch(tab.id!, replyMessage)

      if (contentScriptSuccess) {
        setStatus(STATUS_MESSAGES.BATCH_STARTED)
      } else {
        console.log("内容脚本未响应，使用直接执行方式")
        
        // 直接执行批量处理
        try {
          await executeDirectBatch(tab.id!, replyMessage)
          setStatus("批量处理已启动，请勿关闭此页面")
        } catch (scriptError: any) {
          console.error("执行批量处理脚本失败:", scriptError)
          setStatus(`批量处理失败: ${scriptError.message}`)
          setProcessing(false)
          return
        }
      }

      // 创建进度更新器
      const progressInterval = createProgressUpdater(setStatus, setProcessing)
      return progressInterval
    } catch (error: any) {
      setStatus(`批量处理失败: ${error.message}`)
      setProcessing(false)
    }
  }, [processing])

  // 停止批量处理
  const stopBatchProcess = useCallback(async (setStatus: (status: string) => void) => {
    try {
      await stopBatchProcessing()
      setProcessing(false)
      setStatus(STATUS_MESSAGES.BATCH_STOPPED)
    } catch (error: any) {
      console.error('停止批量处理失败:', error)
      setStatus(`停止失败: ${error.message}`)
    }
  }, [])

  // 监听批量处理状态变化
  useEffect(() => {
    const handleStorageChange = (changes: any, namespace: string) => {
      if (namespace === 'local') {
        if (changes[STORAGE_KEYS.BATCH_PROCESSING]) {
          const batchProcessing: BatchProcessing = changes[STORAGE_KEYS.BATCH_PROCESSING].newValue
          if (batchProcessing && batchProcessing.active) {
            const pageInfo = batchProcessing.currentPage ? '(处理中...)' : ''
            // setStatus 需要从外部传入或通过其他方式处理
          }
        }
      }
    }

    storageListener.addListener(handleStorageChange)

    return () => {
      storageListener.removeListener(handleStorageChange)
    }
  }, [])

  return {
    // 状态
    processing,
    
    // 方法
    startBatchProcess,
    stopBatchProcess,
    
    // 工具方法
    setProcessing
  }
}