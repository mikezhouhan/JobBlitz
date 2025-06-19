// 申请人数据类型
export interface Applicant {
  id: string
  name: string
  age: string
  location: string
  internExperience?: string
  phone: string
  email: string
  position: string
  jobIntention: string
  onlineResume: string
  applyTime: string
  status: string
  pageNumber: number
}

// 页面统计数据类型
export interface PageStats {
  totalApplicants: number
  currentPage?: string
  pageNumber?: number
  timestamp?: string
  debug?: {
    url: string
    title: string
    resumeItems: number
    nameElements: number
    buttons: number
    contentScriptLoaded: boolean
  }
}

// 批量处理状态类型
export interface BatchProcessing {
  active: boolean
  startTime?: string
  endTime?: string
  totalCount?: number
  totalPages?: number
  processedCount: number
  failedCount?: number
  currentPage?: boolean
  stopped?: boolean
}

// 扫描处理状态类型
export interface ScanProcessing {
  active: boolean
}

// 配置类型
export interface Config {
  autoReply: {
    enabled: boolean
    replyMessage: string
  }
}

// Chrome存储数据类型
export interface StorageData {
  applicants?: Applicant[]
  config?: Config
  batchProcessing?: BatchProcessing
  scanProcessing?: ScanProcessing
}

// 消息类型
export interface ChromeMessage {
  action: string
  config?: any
  [key: string]: any
}