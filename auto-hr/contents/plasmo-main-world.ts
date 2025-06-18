import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://hr.shixiseng.com/*"],
  world: "MAIN"
}

// 这个脚本运行在页面的主环境中
console.log("🌍 主环境脚本已注入")

// 在页面上添加一个标记
window.__hrExtensionMainWorld = true

declare global {
  interface Window {
    __hrExtensionMainWorld: boolean
  }
}