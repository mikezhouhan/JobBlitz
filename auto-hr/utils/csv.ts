import type { Applicant } from "../types"

/**
 * CSV 导出工具函数
 */

// CSV导出配置
const CSV_CONFIG = {
  HEADERS: ['姓名', '手机号', '邮箱', '年龄', '现居地', '投递职位', '求职意向', '在线简历', '申请时间'],
  BOM: '\ufeff', // UTF-8 BOM for Excel compatibility
  MIME_TYPE: 'text/csv;charset=utf-8;'
}

// 生成 CSV 内容
const generateCSV = (applicants: Applicant[]): string => {
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
const createCSVBlob = (csvContent: string): Blob => {
  return new Blob([CSV_CONFIG.BOM + csvContent], { type: CSV_CONFIG.MIME_TYPE })
}

// 生成文件名
const generateFileName = (prefix: string = 'hr_applicants'): string => {
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

