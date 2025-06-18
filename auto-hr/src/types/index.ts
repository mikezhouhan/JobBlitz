export interface ApplicantInfo {
  id: string
  name: string
  phone: string
  email: string
  position: string
  jobIntention?: string  // 求职意向
  onlineResume?: string  // 在线简历
  applyTime: string
  status: string
  conversationId?: string
  // 实习僧特有字段
  age?: string
  location?: string
  internExperience?: string
  availability?: string
  workDays?: string
  education?: string
  projectExperience?: string
  pageNumber?: number
  // 详细简历内容
  needDetailExtraction?: boolean  // 标记是否需要提取详细信息
  resumeDetails?: {
    // 教育经历
    educationHistory?: Array<{
      school: string
      major: string
      degree: string
      period: string
      description?: string
    }>
    // 实习经历
    internshipHistory?: Array<{
      company: string
      position: string
      period: string
      description: string
    }>
    // 项目经历
    projectHistory?: Array<{
      name: string
      role: string
      period: string
      description: string
    }>
    // 学术经历
    academicHistory?: Array<{
      title: string
      type: string
      period: string
      description: string
    }>
    // 荣誉奖项
    honors?: Array<{
      name: string
      level: string
      date: string
    }>
    // 技能
    skills?: Array<{
      category: string
      items: string[]
    }>
    // 自我评价
    selfEvaluation?: string
    // 其他部分
    otherSections?: Array<{
      title: string
      content: string
    }>
  }
}

export interface AutoReplyConfig {
  enabled: boolean
  replyMessage: string
  delay: number
  keywords: string[]
}

export interface ExtensionConfig {
  autoReply: AutoReplyConfig
  dataCollection: {
    enabled: boolean
    fields: string[]
  }
}