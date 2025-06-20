// 默认消息模板
export const DEFAULT_MESSAGE_TEMPLATES = [
  {
    id: 'default',
    name: '默认模板',
    message: "您好！感谢您的申请，我们已收到您的简历，会尽快安排面试官查看并与您联系。期待与您进一步沟通！"
  },
  {
    id: 'professional',
    name: '专业模板',
    message: "尊敬的候选人，感谢您对我们公司的关注和投递简历。我们会认真评估您的背景和经验，并在三个工作日内与您联系。"
  },
  {
    id: 'friendly',
    name: '友好模板',  
    message: "Hi！很高兴看到您的简历～我们团队正在仔细审阅，如果合适的话会尽快联系您安排下一步面试。祝您工作顺利！"
  }
]

// 默认配置
export const DEFAULT_CONFIG = {
  autoReply: {
    enabled: true,
    selectedTemplateId: 'default',
    customTemplates: []
  }
}

// 状态消息常量
export const STATUS_MESSAGES = {
  LOADING: "正在加载...",
  DATA_LOADED: "数据加载成功",
  CHROME_API_UNAVAILABLE: "Chrome API 不可用",
  BATCH_PROCESSING: "正在批量沟通...",
  BATCH_STARTED: "批量处理已启动，请查看控制台日志",
  BATCH_STOPPED: "批量处理已停止",
  BATCH_SCREENING: "正在一键通过初筛...",
  SCREENING_STARTED: "初筛批量处理已启动，请查看控制台日志",
  SCREENING_STOPPED: "初筛批量处理已停止",
  SCANNING: "正在扫描申请人信息...",
  SCAN_COMPLETED: "扫描完成",
  SCAN_STOPPED: "已停止收集",
  PAGE_DETECTION_SUCCESS: "页面检测成功",
  PAGE_DETECTION_FAILED: "获取页面数据失败",
  DEBUG_COMPLETED: "调试完成",
  CSV_EXPORTED: "CSV文件已导出",
  DATA_CLEARED: "数据已清空",
  REFRESHING: "正在刷新页面数据...",
  NO_DATA_TO_EXPORT: "暂无数据可导出",
  CONFIRM_CLEAR_DATA: "确定要清空所有申请人数据吗？此操作不可恢复。"
}


// Chrome存储键名常量
export const STORAGE_KEYS = {
  APPLICANTS: 'applicants',
  CONFIG: 'config',
  MESSAGE_TEMPLATES: 'messageTemplates',
  BATCH_PROCESSING: 'batchProcessing',
  SCAN_PROCESSING: 'scanProcessing'
} as const

// UI样式常量
export const STYLES = {
  POPUP_WIDTH: 400,
  POPUP_PADDING: 16,
  TEXTAREA_HEIGHT: 80,
  FONT_FAMILY: 'Arial, sans-serif'
} as const

// 延迟时间常量（毫秒）
export const DELAYS = {
  PAGE_LOAD: 3000,
  DETAIL_LOAD: 3000,
  INPUT_WAIT: 500,
  MESSAGE_SEND: 3000,
  BETWEEN_APPLICANTS: 3000,
  RETRY_WAIT: 2000,
  AFTER_CLICK: 2000,
  SHORT_WAIT: 1000,
  EVENT_SEQUENCE: 10
}

// 消息动作常量
export const MESSAGE_ACTIONS = {
  PING: 'ping',
  GET_PAGE_STATS: 'getPageStats',
  START_BATCH_PROCESS: 'startBatchProcess',
  START_SCREENING_PROCESS: 'startScreeningProcess',
  SCAN_APPLICANTS: 'scanApplicants',
  DEBUG_PAGE: 'debugPage',
  UPDATE_PAGE_STATS: 'updatePageStats'
} as const

