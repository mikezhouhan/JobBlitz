export interface ApplicantInfo {
  id: string
  name: string
  phone: string
  email: string
  position: string
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