import Papa from "papaparse"
import type { ApplicantInfo } from "~types"

export class CSVExporter {
  static generateCSV(applicants: ApplicantInfo[]): string {
    const csvData = applicants.map(applicant => ({
      "姓名": applicant.name,
      "电话": applicant.phone,
      "邮箱": applicant.email,
      "应聘职位": applicant.position,
      "申请时间": applicant.applyTime,
      "状态": applicant.status
    }))

    return Papa.unparse(csvData, {
      header: true,
      encoding: 'utf-8'
    })
  }

  static async downloadCSV(applicants: ApplicantInfo[], filename?: string): Promise<void> {
    const csvContent = this.generateCSV(applicants)
    const blob = new Blob(['\ufeff' + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    })
    
    const url = URL.createObjectURL(blob)
    const downloadFilename = filename || `hr_applicants_${new Date().toISOString().split('T')[0]}.csv`
    
    try {
      await chrome.downloads.download({
        url: url,
        filename: downloadFilename,
        saveAs: true
      })
    } catch (error) {
      console.error('下载失败:', error)
      
      const link = document.createElement('a')
      link.href = url
      link.download = downloadFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    
    URL.revokeObjectURL(url)
  }

  static getApplicantCount(applicants: ApplicantInfo[]): {
    total: number
    withPhone: number
    withEmail: number
    today: number
  } {
    const today = new Date().toDateString()
    
    return {
      total: applicants.length,
      withPhone: applicants.filter(a => a.phone && a.phone !== '').length,
      withEmail: applicants.filter(a => a.email && a.email !== '').length,
      today: applicants.filter(a => new Date(a.applyTime).toDateString() === today).length
    }
  }
}