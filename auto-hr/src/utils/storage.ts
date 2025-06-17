import type { ApplicantInfo, ExtensionConfig } from "~types"

export const defaultConfig: ExtensionConfig = {
  autoReply: {
    enabled: true,
    replyMessage: "您好，感谢您的申请。我们已收到您的简历，会尽快安排面试官查看并与您联系。",
    delay: 2000,
    keywords: ["申请", "面试", "简历"]
  },
  dataCollection: {
    enabled: true,
    fields: ["name", "phone", "email", "position", "applyTime"]
  }
}

export class StorageManager {
  private static instance: StorageManager
  
  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager()
    }
    return StorageManager.instance
  }

  async saveApplicant(applicant: ApplicantInfo): Promise<void> {
    const existingData = await this.getApplicants()
    const updatedData = [...existingData.filter(a => a.id !== applicant.id), applicant]
    
    await chrome.storage.local.set({
      applicants: updatedData
    })
  }

  async getApplicants(): Promise<ApplicantInfo[]> {
    const result = await chrome.storage.local.get(['applicants'])
    return result.applicants || []
  }

  async clearApplicants(): Promise<void> {
    await chrome.storage.local.remove(['applicants'])
  }

  async saveConfig(config: ExtensionConfig): Promise<void> {
    await chrome.storage.local.set({ config })
  }

  async getConfig(): Promise<ExtensionConfig> {
    const result = await chrome.storage.local.get(['config'])
    return result.config || defaultConfig
  }

  async updateAutoReply(enabled: boolean, message?: string): Promise<void> {
    const config = await this.getConfig()
    config.autoReply.enabled = enabled
    if (message) {
      config.autoReply.replyMessage = message
    }
    await this.saveConfig(config)
  }
}