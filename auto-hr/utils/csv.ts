import type { Applicant } from "../types"
import { CSV_CONFIG } from "../constants"

/**
 * CSV 导出工具函数
 */

// 生成 CSV 内容
export const generateCSV = (applicants: Applicant[]): string => {
  const rows = applicants.map(applicant => [
    applicant.name || '',
    applicant.phone || '',
    applicant.email || '',
    applicant.age || '',
    applicant.location || '',
    applicant.position || '',
    applicant.jobIntention || '',
    applicant.onlineResume || '',
    new Date(applicant.applyTime).toLocaleString('zh-CN')
  ])
  
  return [CSV_CONFIG.HEADERS, ...rows]
    .map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n')
}

// 创建 CSV 下载 Blob
export const createCSVBlob = (csvContent: string): Blob => {
  return new Blob([CSV_CONFIG.BOM + csvContent], { type: CSV_CONFIG.MIME_TYPE })
}

// 生成文件名
export const generateFileName = (prefix: string = 'hr_applicants'): string => {
  const date = new Date().toISOString().split('T')[0]
  return `${prefix}_${date}.csv`
}

// 下载 CSV 文件
export const downloadCSV = (applicants: Applicant[], filename?: string): void => {
  const csvContent = generateCSV(applicants)
  const blob = createCSVBlob(csvContent)
  const url = URL.createObjectURL(blob)
  
  // 创建下载链接
  const link = document.createElement('a')
  link.href = url
  link.download = filename || generateFileName()
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 验证 CSV 数据
export const validateCSVData = (applicants: Applicant[]): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!applicants || applicants.length === 0) {
    errors.push('没有数据可导出')
    return { isValid: false, errors, warnings }
  }

  applicants.forEach((applicant, index) => {
    // 检查必要字段
    if (!applicant.name) {
      warnings.push(`第 ${index + 1} 条记录缺少姓名`)
    }
    if (!applicant.phone && !applicant.email) {
      warnings.push(`第 ${index + 1} 条记录缺少联系方式`)
    }

    // 验证邮箱格式
    if (applicant.email && !/^[\w.-]+@[\w.-]+\.\w+$/.test(applicant.email)) {
      warnings.push(`第 ${index + 1} 条记录的邮箱格式可能不正确: ${applicant.email}`)
    }

    // 验证手机号格式
    if (applicant.phone && !/^1[3-9]\d{9}$/.test(applicant.phone)) {
      warnings.push(`第 ${index + 1} 条记录的手机号格式可能不正确: ${applicant.phone}`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// 获取 CSV 统计信息
export const getCSVStats = (applicants: Applicant[]): {
  total: number
  withPhone: number
  withEmail: number
  withBoth: number
  withPosition: number
  withJobIntention: number
} => {
  return {
    total: applicants.length,
    withPhone: applicants.filter(a => a.phone).length,
    withEmail: applicants.filter(a => a.email).length,
    withBoth: applicants.filter(a => a.phone && a.email).length,
    withPosition: applicants.filter(a => a.position).length,
    withJobIntention: applicants.filter(a => a.jobIntention).length
  }
}