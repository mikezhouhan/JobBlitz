chrome.runtime.onInstalled.addListener(() => {
  // HR自动化助手已安装
})

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url?.includes('hr.shixiseng.com')) {
    // 在HR网站上激活插件
  }
})