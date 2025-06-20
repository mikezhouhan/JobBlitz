import { useState, useEffect, useCallback } from "react"
import type { BatchProcessing } from "../types"
import { STORAGE_KEYS, STATUS_MESSAGES } from "../constants"
import { storage, storageListener } from "../utils/chrome"
import { 
  checkBatchTabAvailability,
  saveBatchConfig,
  executeDirectScreening,
  createProgressUpdater,
  stopBatchProcessing
} from "../utils/batchHelpers"

/**
 * 初筛批量处理 Hook
 * 负责管理批量初筛流程的状态和控制
 */
export const useScreeningProcess = () => {
  const [processing, setProcessing] = useState<boolean>(false)

  // 开始初筛批量处理
  const startScreeningProcess = useCallback(async (
    totalApplicants: number,
    setStatus: (status: string) => void
  ) => {
    if (processing) return

    setProcessing(true)
    setStatus(STATUS_MESSAGES.BATCH_SCREENING)

    try {
      // 检查标签页可用性
      const { tab, error } = await checkBatchTabAvailability()
      if (!tab || error) {
        setStatus(error || '标签页检查失败')
        setProcessing(false)
        return
      }

      // 创建并保存批量处理配置
      const batchProcessing: BatchProcessing = {
        active: true,
        startTime: new Date().toISOString(),
        totalCount: totalApplicants,
        processedCount: 0
      }
      
      await storage.set({
        [STORAGE_KEYS.BATCH_PROCESSING]: batchProcessing
      })

      // 直接执行初筛批量处理
      try {
        await executeDirectScreening(tab.id!)
        setStatus("初筛批量处理已启动，请勿关闭此页面")
      } catch (scriptError: any) {
        setStatus(`初筛批量处理失败: ${scriptError.message}`)
        setProcessing(false)
        return
      }

      // 创建进度更新器
      const progressInterval = createProgressUpdater(setStatus, setProcessing)
      return progressInterval
    } catch (error: any) {
      setStatus(`初筛批量处理失败: ${error.message}`)
      setProcessing(false)
    }
  }, [processing])

  // 停止初筛批量处理
  const stopScreeningProcess = useCallback(async (setStatus: (status: string) => void) => {
    try {
      await stopBatchProcessing()
      setProcessing(false)
      setStatus(STATUS_MESSAGES.SCREENING_STOPPED)
    } catch (error: any) {
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
    startScreeningProcess,
    stopScreeningProcess,
    
    // 工具方法
    setProcessing
  }
}