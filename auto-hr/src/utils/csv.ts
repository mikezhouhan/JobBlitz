import Papa from "papaparse"
import type { ApplicantInfo } from "~types"

export class CSVExporter {
  static generateCSV(applicants: ApplicantInfo[]): string {
    const csvData = applicants.map(applicant => {
      const baseData = {
        "姓名": applicant.name,
        "年龄": applicant.age || '',
        "现居地": applicant.location || '',
        "电话": applicant.phone,
        "邮箱": applicant.email,
        "应聘职位": applicant.position,
        "求职意向": applicant.jobIntention || '',
        "实习经历": applicant.internExperience || '',
        "可到岗时间": applicant.availability || '',
        "申请时间": new Date(applicant.applyTime).toLocaleString('zh-CN'),
        "状态": applicant.status
      }

      // 添加详细简历信息
      if (applicant.resumeDetails) {
        const details = applicant.resumeDetails

        // 教育经历
        if (details.educationHistory && details.educationHistory.length > 0) {
          baseData["教育经历"] = details.educationHistory.map(edu => 
            `${edu.school} | ${edu.major} ${edu.degree} | ${edu.period}`
          ).join('; ')
        }

        // 实习经历
        if (details.internshipHistory && details.internshipHistory.length > 0) {
          baseData["实习经历详情"] = details.internshipHistory.map(intern => 
            `${intern.company} - ${intern.position} (${intern.period}): ${intern.description}`
          ).join('; ')
        }

        // 项目经历
        if (details.projectHistory && details.projectHistory.length > 0) {
          baseData["项目经历"] = details.projectHistory.map(proj => 
            `${proj.name} - ${proj.role} (${proj.period}): ${proj.description}`
          ).join('; ')
        }

        // 学术经历
        if (details.academicHistory && details.academicHistory.length > 0) {
          baseData["学术经历"] = details.academicHistory.map(acad => 
            `${acad.title} - ${acad.type} (${acad.period}): ${acad.description}`
          ).join('; ')
        }

        // 荣誉奖项
        if (details.honors && details.honors.length > 0) {
          baseData["荣誉奖项"] = details.honors.map(honor => 
            `${honor.date} ${honor.level} ${honor.name}`
          ).join('; ')
        }

        // 技能
        if (details.skills && details.skills.length > 0) {
          baseData["技能"] = details.skills.map(skill => 
            `${skill.category}: ${skill.items.join(', ')}`
          ).join('; ')
        }

        // 自我评价
        if (details.selfEvaluation) {
          baseData["自我评价"] = details.selfEvaluation
        }

        // 其他部分
        if (details.otherSections && details.otherSections.length > 0) {
          details.otherSections.forEach(section => {
            baseData[section.title] = section.content
          })
        }
      }

      return baseData
    })

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