import type { Applicant } from "../types"
import { STATUS_MESSAGES } from "../constants"
import { downloadCSV, validateCSVData } from "./csv"

/**
 * 导出帮助函数
 * 将 handleExportCSV 中的逻辑拆分为更小的函数
 */

// 检查是否有数据可导出
export const checkDataAvailability = (applicantCount: number): boolean => {
  if (applicantCount === 0) {
    alert(STATUS_MESSAGES.NO_DATA_TO_EXPORT)
    return false
  }
  return true
}

// 验证数据并处理警告
export const validateAndConfirmExport = (applicants: Applicant[]): boolean => {
  const validation = validateCSVData(applicants)
  
  if (!validation.isValid) {
    alert(`导出失败: ${validation.errors.join(', ')}`)
    return false
  }
  
  // 显示警告（如果有）
  if (validation.warnings.length > 0) {
    const proceed = confirm(`发现以下问题：\n${validation.warnings.join('\n')}\n\n是否继续导出？`)
    return proceed
  }
  
  return true
}

// 执行CSV导出
export const performCSVExport = (applicants: Applicant[]): void => {
  downloadCSV(applicants)
}

// 处理导出成功
export const handleExportSuccess = (setStatus: (status: string) => void): void => {
  setStatus(STATUS_MESSAGES.CSV_EXPORTED)
}

// 处理导出错误
export const handleExportError = (error: any, setStatus: (status: string) => void): void => {
  setStatus(`导出失败: ${error.message}`)
}