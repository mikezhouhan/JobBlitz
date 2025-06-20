import { useState, useEffect } from "react"
import type { UIState } from "../types"
import { STORAGE_KEYS } from "../constants"
import { isChromeApiAvailable, storage } from "../utils/chrome"

/**
 * UI状态持久化 Hook
 * 负责管理和持久化UI状态，确保插件重新打开时状态一致
 */
export const useUIState = () => {
  const [showAddTemplate, setShowAddTemplate] = useState<boolean>(false)
  const [newTemplateName, setNewTemplateName] = useState<string>('')
  const [newTemplateMessage, setNewTemplateMessage] = useState<string>('')
  const [isLoaded, setIsLoaded] = useState<boolean>(false)

  // 加载UI状态
  const loadUIState = async () => {
    try {
      if (!isChromeApiAvailable()) {
        setIsLoaded(true)
        return
      }

      const data = await storage.get([STORAGE_KEYS.UI_STATE])
      const uiState: UIState = data[STORAGE_KEYS.UI_STATE] || {
        showAddTemplate: false,
        newTemplateName: '',
        newTemplateMessage: ''
      }
      
      setShowAddTemplate(uiState.showAddTemplate)
      setNewTemplateName(uiState.newTemplateName)
      setNewTemplateMessage(uiState.newTemplateMessage)
      setIsLoaded(true)
    } catch (error: any) {
      console.error('Failed to load UI state:', error)
      setIsLoaded(true)
    }
  }

  // 保存UI状态
  const saveUIState = async (newState: Partial<UIState>) => {
    try {
      if (!isChromeApiAvailable()) return

      const currentState: UIState = {
        showAddTemplate,
        newTemplateName,
        newTemplateMessage,
        ...newState
      }
      
      await storage.set({ [STORAGE_KEYS.UI_STATE]: currentState })
    } catch (error: any) {
      console.error('Failed to save UI state:', error)
    }
  }

  // 更新 showAddTemplate 状态
  const updateShowAddTemplate = async (value: boolean) => {
    setShowAddTemplate(value)
    await saveUIState({ showAddTemplate: value })
  }

  // 更新 newTemplateName 状态
  const updateNewTemplateName = async (value: string) => {
    setNewTemplateName(value)
    await saveUIState({ newTemplateName: value })
  }

  // 更新 newTemplateMessage 状态
  const updateNewTemplateMessage = async (value: string) => {
    setNewTemplateMessage(value)
    await saveUIState({ newTemplateMessage: value })
  }

  // 重置表单状态
  const resetFormState = async () => {
    setShowAddTemplate(false)
    setNewTemplateName('')
    setNewTemplateMessage('')
    await saveUIState({
      showAddTemplate: false,
      newTemplateName: '',
      newTemplateMessage: ''
    })
  }

  // 初始化加载
  useEffect(() => {
    // 确保在Chrome API可用后再加载
    const timer = setTimeout(() => {
      loadUIState()
    }, 50)
    
    return () => clearTimeout(timer)
  }, [])

  return {
    // 状态
    showAddTemplate,
    newTemplateName,
    newTemplateMessage,
    isLoaded,
    
    // 方法
    updateShowAddTemplate,
    updateNewTemplateName,
    updateNewTemplateMessage,
    resetFormState,
    
    // 兼容性方法（保持原有API）
    setShowAddTemplate: updateShowAddTemplate,
    setNewTemplateName: updateNewTemplateName,
    setNewTemplateMessage: updateNewTemplateMessage
  }
}