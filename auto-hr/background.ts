chrome.runtime.onInstalled.addListener(() => {
  console.log("HR自动化助手已安装")
})

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url?.includes('hr.shixiseng.com')) {
    console.log("在HR网站上激活插件")
  }
})