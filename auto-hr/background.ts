import { StorageManager } from "~utils/storage"

chrome.runtime.onInstalled.addListener(() => {
  console.log("HR自动化助手已安装")
})

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url?.includes('hr.shixiseng.com')) {
    console.log("在HR网站上激活插件")
  }
})

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  const storage = StorageManager.getInstance()
  
  switch (request.action) {
    case 'getApplicants':
      const applicants = await storage.getApplicants()
      sendResponse(applicants)
      break
      
    case 'saveApplicant':
      await storage.saveApplicant(request.data)
      sendResponse({ success: true })
      break
      
    case 'getConfig':
      const config = await storage.getConfig()
      sendResponse(config)
      break
      
    case 'updateConfig':
      await storage.saveConfig(request.data)
      sendResponse({ success: true })
      break
      
    default:
      sendResponse({ error: 'Unknown action' })
  }
  
  return true
})