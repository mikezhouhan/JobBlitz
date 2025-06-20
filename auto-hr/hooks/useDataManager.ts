import { useState, useEffect } from "react"
import type { Applicant, Config } from "../types"
import { DEFAULT_CONFIG, STORAGE_KEYS, STATUS_MESSAGES } from "../constants"
import { isChromeApiAvailable, storage, storageListener } from "../utils/chrome"

/**
 * 数据管理 Hook
 * 负责管理申请人数据和配置的加载、保存、监听
 */
export const useDataManager = () => {
  const [applicantCount, setApplicantCount] = useState<number>(0)
  const [replyMessage, setReplyMessage] = useState<string>(DEFAULT_CONFIG.autoReply.replyMessage)
  const [status, setStatus] = useState<string>(STATUS_MESSAGES.LOADING)

  // 加载数据
  const loadData = async () => {
    try {
      if (!isChromeApiAvailable()) {
        setStatus(STATUS_MESSAGES.CHROME_API_UNAVAILABLE)
        return
      }

      const data = await storage.get([STORAGE_KEYS.APPLICANTS, STORAGE_KEYS.CONFIG])
      const applicants: Applicant[] = data[STORAGE_KEYS.APPLICANTS] || []
      const config: Config = data[STORAGE_KEYS.CONFIG] || DEFAULT_CONFIG
      
      setApplicantCount(applicants.length)
      setReplyMessage(config.autoReply.replyMessage)
      setStatus(STATUS_MESSAGES.DATA_LOADED)
    } catch (error: any) {
      setStatus(`加载失败: ${error.message}`)
    }
  }

  // 保存配置
  const saveConfig = async (newReplyMessage: string) => {
    try {
      const config: Config = {
        autoReply: {
          enabled: true,
          replyMessage: newReplyMessage
        }
      }
      
      const success = await storage.set({ [STORAGE_KEYS.CONFIG]: config })
      if (success) {
        setReplyMessage(newReplyMessage)
      }
    } catch (error: any) {
      setStatus(`保存配置失败: ${error.message}`)
    }
  }

  // 清空申请人数据
  const clearApplicantData = async () => {
    try {
      const success = await storage.remove([STORAGE_KEYS.APPLICANTS])
      if (success) {
        setApplicantCount(0)
        setStatus(STATUS_MESSAGES.DATA_CLEARED)
        return true
      } else {
        setStatus('清空失败')
        return false
      }
    } catch (error: any) {
      setStatus(`清空失败: ${error.message}`)
      return false
    }
  }

  // 获取申请人数据
  const getApplicantData = async (): Promise<Applicant[]> => {
    try {
      const data = await storage.get([STORAGE_KEYS.APPLICANTS])
      return data[STORAGE_KEYS.APPLICANTS] || []
    } catch (error: any) {
      return []
    }
  }

  // 监听存储变化
  useEffect(() => {
    const handleStorageChange = (changes: any, namespace: string) => {
      if (namespace === 'local') {
        // 监听申请人数据变化
        if (changes[STORAGE_KEYS.APPLICANTS]) {
          const newApplicants: Applicant[] = changes[STORAGE_KEYS.APPLICANTS].newValue || []
          setApplicantCount(newApplicants.length)
        }

        // 监听配置变化
        if (changes[STORAGE_KEYS.CONFIG]) {
          const newConfig: Config = changes[STORAGE_KEYS.CONFIG].newValue
          if (newConfig?.autoReply?.replyMessage) {
            setReplyMessage(newConfig.autoReply.replyMessage)
          }
        }
      }
    }

    storageListener.addListener(handleStorageChange)

    return () => {
      storageListener.removeListener(handleStorageChange)
    }
  }, [])

  // 初始化加载数据
  useEffect(() => {
    loadData()
  }, [])

  return {
    // 状态
    applicantCount,
    replyMessage,
    status,
    setStatus,
    
    // 方法
    loadData,
    saveConfig,
    clearApplicantData,
    getApplicantData,
    
    // 快捷更新方法
    updateReplyMessage: setReplyMessage
  }
}