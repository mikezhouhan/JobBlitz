import { useState, useEffect } from "react"
import type { Applicant, Config, MessageTemplate } from "../types"
import { DEFAULT_CONFIG, DEFAULT_MESSAGE_TEMPLATES, STORAGE_KEYS, STATUS_MESSAGES } from "../constants"
import { isChromeApiAvailable, storage, storageListener } from "../utils/chrome"

/**
 * 数据管理 Hook
 * 负责管理申请人数据和配置的加载、保存、监听
 */
export const useDataManager = () => {
  const [applicantCount, setApplicantCount] = useState<number>(0)
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>(DEFAULT_MESSAGE_TEMPLATES)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_CONFIG.autoReply.selectedTemplateId)
  const [status, setStatus] = useState<string>(STATUS_MESSAGES.LOADING)

  // 获取当前选中的消息模板
  const getCurrentTemplate = (): MessageTemplate => {
    const template = messageTemplates.find(t => t.id === selectedTemplateId)
    return template || messageTemplates[0]
  }

  // 加载数据
  const loadData = async () => {
    try {
      if (!isChromeApiAvailable()) {
        setStatus(STATUS_MESSAGES.CHROME_API_UNAVAILABLE)
        return
      }

      const data = await storage.get([STORAGE_KEYS.APPLICANTS, STORAGE_KEYS.CONFIG, STORAGE_KEYS.MESSAGE_TEMPLATES])
      const applicants: Applicant[] = data[STORAGE_KEYS.APPLICANTS] || []
      const config: Config = data[STORAGE_KEYS.CONFIG] || DEFAULT_CONFIG
      const savedTemplates: MessageTemplate[] = data[STORAGE_KEYS.MESSAGE_TEMPLATES] || []
      
      setApplicantCount(applicants.length)
      setSelectedTemplateId(config.autoReply.selectedTemplateId)
      
      // 合并默认模板和自定义模板
      const allTemplates = [
        ...DEFAULT_MESSAGE_TEMPLATES,
        ...savedTemplates.filter(t => t.isCustom)
      ]
      setMessageTemplates(allTemplates)
      
      setStatus(STATUS_MESSAGES.DATA_LOADED)
    } catch (error: any) {
      setStatus(`加载失败: ${error.message}`)
    }
  }

  // 保存配置
  const saveConfig = async (templateId: string) => {
    try {
      const config: Config = {
        autoReply: {
          enabled: true,
          selectedTemplateId: templateId,
          customTemplates: messageTemplates.filter(t => t.isCustom)
        }
      }
      
      const success = await storage.set({ [STORAGE_KEYS.CONFIG]: config })
      if (success) {
        setSelectedTemplateId(templateId)
      }
    } catch (error: any) {
      setStatus(`保存配置失败: ${error.message}`)
    }
  }

  // 添加自定义模板
  const addCustomTemplate = async (name: string, message: string) => {
    try {
      const newTemplate: MessageTemplate = {
        id: `custom_${Date.now()}`,
        name,
        message,
        isCustom: true
      }
      
      const updatedTemplates = [...messageTemplates, newTemplate]
      const customTemplates = updatedTemplates.filter(t => t.isCustom)
      
      const success = await storage.set({ [STORAGE_KEYS.MESSAGE_TEMPLATES]: customTemplates })
      if (success) {
        setMessageTemplates(updatedTemplates)
        return newTemplate.id
      }
    } catch (error: any) {
      setStatus(`添加模板失败: ${error.message}`)
    }
    return null
  }

  // 删除自定义模板
  const deleteCustomTemplate = async (templateId: string) => {
    try {
      const updatedTemplates = messageTemplates.filter(t => t.id !== templateId)
      const customTemplates = updatedTemplates.filter(t => t.isCustom)
      
      const success = await storage.set({ [STORAGE_KEYS.MESSAGE_TEMPLATES]: customTemplates })
      if (success) {
        setMessageTemplates(updatedTemplates)
        // 如果删除的是当前选中的模板，切换到默认模板
        if (selectedTemplateId === templateId) {
          setSelectedTemplateId('default')
          await saveConfig('default')
        }
      }
    } catch (error: any) {
      setStatus(`删除模板失败: ${error.message}`)
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
          if (newConfig?.autoReply?.selectedTemplateId) {
            setSelectedTemplateId(newConfig.autoReply.selectedTemplateId)
          }
        }

        // 监听模板变化
        if (changes[STORAGE_KEYS.MESSAGE_TEMPLATES]) {
          const savedTemplates: MessageTemplate[] = changes[STORAGE_KEYS.MESSAGE_TEMPLATES].newValue || []
          const allTemplates = [
            ...DEFAULT_MESSAGE_TEMPLATES,
            ...savedTemplates.filter(t => t.isCustom)
          ]
          setMessageTemplates(allTemplates)
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
    messageTemplates,
    selectedTemplateId,
    status,
    setStatus,
    
    // 方法
    loadData,
    saveConfig,
    clearApplicantData,
    getApplicantData,
    getCurrentTemplate,
    addCustomTemplate,
    deleteCustomTemplate,
    
    // 快捷更新方法
    updateSelectedTemplate: setSelectedTemplateId
  }
}