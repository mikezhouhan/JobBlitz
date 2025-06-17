export interface ApplicantInfo {
  id: string
  name: string
  phone: string
  email: string
  position: string
  applyTime: string
  status: string
  conversationId?: string
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