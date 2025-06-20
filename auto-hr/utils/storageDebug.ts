import { storage } from "./chrome"
import { STORAGE_KEYS } from "../constants"

/**
 * 存储调试工具
 * 帮助检查和验证Chrome存储状态
 */
export const storageDebug = {
  // 打印所有存储的数据
  async logAllData() {
    try {
      const data = await storage.get([
        STORAGE_KEYS.APPLICANTS,
        STORAGE_KEYS.CONFIG,
        STORAGE_KEYS.MESSAGE_TEMPLATES,
        STORAGE_KEYS.UI_STATE,
        STORAGE_KEYS.BATCH_PROCESSING,
        STORAGE_KEYS.SCAN_PROCESSING
      ])
      
      console.group('🔍 Chrome Storage Debug')
      console.log('全部存储数据:', data)
      console.log('申请人数据:', data[STORAGE_KEYS.APPLICANTS]?.length || 0, '条')
      console.log('配置:', data[STORAGE_KEYS.CONFIG])
      console.log('自定义模板:', data[STORAGE_KEYS.MESSAGE_TEMPLATES]?.length || 0, '个')
      console.log('UI状态:', data[STORAGE_KEYS.UI_STATE])
      console.groupEnd()
      
      return data
    } catch (error) {
      console.error('存储调试失败:', error)
      return null
    }
  },

  // 检查存储是否工作正常
  async testStorage() {
    try {
      const testKey = 'storageTest'
      const testValue = { timestamp: Date.now(), test: true }
      
      // 写入测试数据
      const setResult = await storage.set({ [testKey]: testValue })
      if (!setResult) {
        console.error('❌ 存储写入失败')
        return false
      }
      
      // 读取测试数据
      const getData = await storage.get([testKey])
      const readValue = getData[testKey]
      
      if (!readValue || readValue.timestamp !== testValue.timestamp) {
        console.error('❌ 存储读取失败')
        return false
      }
      
      // 删除测试数据
      const removeResult = await storage.remove([testKey])
      if (!removeResult) {
        console.error('❌ 存储删除失败')
        return false
      }
      
      console.log('✅ 存储测试通过')
      return true
    } catch (error) {
      console.error('❌ 存储测试异常:', error)
      return false
    }
  },

  // 清理损坏的数据
  async cleanupStorage() {
    try {
      console.log('🧹 开始清理存储...')
      
      // 获取当前所有数据
      const data = await this.logAllData()
      if (!data) return false
      
      // 验证和修复配置
      if (data[STORAGE_KEYS.CONFIG]) {
        const config = data[STORAGE_KEYS.CONFIG]
        if (!config.autoReply || typeof config.autoReply.selectedTemplateId !== 'string') {
          console.log('🔧 修复损坏的配置数据')
          await storage.remove([STORAGE_KEYS.CONFIG])
        }
      }
      
      // 验证和修复模板数据
      if (data[STORAGE_KEYS.MESSAGE_TEMPLATES]) {
        const templates = data[STORAGE_KEYS.MESSAGE_TEMPLATES]
        if (!Array.isArray(templates)) {
          console.log('🔧 修复损坏的模板数据')
          await storage.remove([STORAGE_KEYS.MESSAGE_TEMPLATES])
        }
      }
      
      console.log('✅ 存储清理完成')
      return true
    } catch (error) {
      console.error('❌ 存储清理失败:', error)
      return false
    }
  }
}

// 在开发环境中暴露到全局
if (process.env.NODE_ENV === 'development') {
  (window as any).storageDebug = storageDebug
}