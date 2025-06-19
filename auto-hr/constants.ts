// 默认配置
export const DEFAULT_CONFIG = {
  autoReply: {
    enabled: true,
    replyMessage: "您好！感谢您的申请，我们已收到您的简历，会尽快安排面试官查看并与您联系。期待与您进一步沟通！"
  }
}

// CSS选择器常量
export const SELECTORS = {
  // 申请人卡片相关
  RESUME_ITEM: '.resume-item',
  RESUME_NAME: '.resume-info__center-name',
  RESUME_DETAIL: '.resume-info__center-detail',
  RESUME_CENTER: '.resume-info__center',
  RESUME_BUTTON: '.resume-info__right button',
  
  // 联系方式相关
  PHONE_EMAIL_ITEM: '.phone-email-item',
  PHONE_EMAIL: '.phone-email, [class*="phone-email"]',
  
  // 分页相关
  PAGINATION_NEXT: [
    '.el-pagination button.btn-next',
    '.el-pagination .el-icon-arrow-right',
    '.pagination-next',
    '[aria-label="下一页"]',
    'button:has(.el-icon-arrow-right)',
    '.el-pager + button'
  ],
  PAGINATION_ACTIVE: [
    '.el-pagination .el-pager .active',
    '.el-pagination .number.active',
    '[class*="pagination"] .active'
  ],
  
  // 弹窗关闭按钮
  DIALOG_CLOSE: [
    '.el-dialog__headerbtn',
    '.el-dialog__close',
    '.el-icon-close',
    'button[aria-label="Close"]',
    'button[aria-label="关闭"]',
    '.dialog-close',
    '.modal-close',
    '[class*="close"]:not(.phone-email)',
    'i.el-dialog__close'
  ],
  
  // 聊天相关
  CHAT_INPUT: 'textarea[placeholder="请输入"]',
  CHAT_CLOSE: '.chat-close',
  COMMUNICATE_BUTTON: 'button:contains("沟通")',
  
  // 简历详情相关
  RESUME_TITLE: '.resume-tools__title',
  RESUME_ONLINE: '.resume-online',
  RESUME_ONLINE_ITEM: '.resume-online-item',
  RESUME_ONLINE_TITLE: '.resume-online-item__title',
  RESUME_ONLINE_CONTENT: '.resume-online-item__content',
  
  // 求职意向相关
  EXP_JOBS: '.exp-jobs',
  MAIN_DETAIL_SUB: '.main-detail-sub',
  
  // 加载状态
  LOADING_MASK: '.el-loading-mask, .loading, [class*="loading"]'
}

// 正则表达式常量
export const REGEX = {
  PHONE: /(?:\+86\s*)?1[3-9]\d{9}/,
  EMAIL: /[\w.-]+@[\w.-]+\.[\w]{2,}/,
  AGE: /(\d{1,2})岁/,
  LOCATION: /现居：([^实]+)/,
  INTERN: /(实习\d+次)/,
  JOB_INTENTION: /求职意向[：:]\s*(.+)/,
  POSITION_TITLE: /投递职位[：:]\s*(.+?)(?:·|$)/
}

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

// 重试次数常量
export const RETRY_LIMITS = {
  PAGE_LOAD: 5,
  EMAIL_EXTRACTION: 3
}

// UI样式常量
export const STYLES = {
  POPUP_WIDTH: 400,
  POPUP_PADDING: 16,
  TEXTAREA_HEIGHT: 80,
  FONT_FAMILY: 'Arial, sans-serif'
} as const

// 状态消息常量
export const STATUS_MESSAGES = {
  LOADING: "正在加载...",
  DATA_LOADED: "数据加载成功",
  CHROME_API_UNAVAILABLE: "Chrome API 不可用",
  BATCH_PROCESSING: "正在批量沟通...",
  BATCH_STARTED: "批量处理已启动，请查看控制台日志",
  BATCH_STOPPED: "批量处理已停止",
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

// CSV导出相关常量
export const CSV_CONFIG = {
  HEADERS: ['姓名', '手机号', '邮箱', '年龄', '现居地', '投递职位', '求职意向', '在线简历', '申请时间'],
  BOM: '\ufeff', // UTF-8 BOM for Excel compatibility
  MIME_TYPE: 'text/csv;charset=utf-8;'
}

// Chrome存储键名常量
export const STORAGE_KEYS = {
  APPLICANTS: 'applicants',
  CONFIG: 'config',
  BATCH_PROCESSING: 'batchProcessing',
  SCAN_PROCESSING: 'scanProcessing'
} as const

// 消息动作常量
export const MESSAGE_ACTIONS = {
  PING: 'ping',
  GET_PAGE_STATS: 'getPageStats',
  START_BATCH_PROCESS: 'startBatchProcess',
  SCAN_APPLICANTS: 'scanApplicants',
  DEBUG_PAGE: 'debugPage',
  UPDATE_PAGE_STATS: 'updatePageStats'
} as const