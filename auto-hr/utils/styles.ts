import { STYLES } from "../constants"

/**
 * 样式工具函数
 */

// 获取容器样式
export const getContainerStyle = () => ({
  width: STYLES.POPUP_WIDTH,
  padding: STYLES.POPUP_PADDING,
  fontFamily: STYLES.FONT_FAMILY
})

// 获取文本区域样式
export const getTextareaStyle = () => ({
  width: '100%',
  height: STYLES.TEXTAREA_HEIGHT,
  padding: 8,
  border: '1px solid #ddd',
  borderRadius: 4,
  fontSize: 12,
  resize: 'vertical' as const,
  fontFamily: STYLES.FONT_FAMILY
})

// 获取标题样式
export const getTitleStyle = () => ({
  margin: 0,
  marginBottom: 16,
  color: '#333',
  textAlign: 'center' as const
})

// 获取状态栏样式
export const getStatusBarStyle = () => ({
  marginBottom: 16,
  padding: 12,
  backgroundColor: '#f5f5f5',
  borderRadius: 4
})

// 获取状态文本样式
export const getStatusTextStyle = (processing: boolean) => ({
  fontSize: 12,
  marginBottom: 4,
  color: processing ? '#ff6b35' : '#28a745'
})

// 获取按钮样式
export const getButtonStyle = (
  variant: 'primary' | 'secondary' | 'danger' | 'warning' = 'primary',
  disabled: boolean = false
) => {
  const baseStyle = {
    padding: '8px 12px',
    border: 'none',
    borderRadius: 4,
    fontSize: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: 'white'
  }

  const variants = {
    primary: { backgroundColor: disabled ? '#ccc' : '#007cff' },
    secondary: { backgroundColor: disabled ? '#ccc' : '#6c757d' },
    danger: { backgroundColor: disabled ? '#ccc' : '#dc3545' },
    warning: { backgroundColor: disabled ? '#ccc' : '#ffc107', color: '#333' }
  }

  return { ...baseStyle, ...variants[variant] }
}

// 获取大按钮样式
export const getLargeButtonStyle = (
  variant: 'primary' | 'danger' = 'primary',
  processing: boolean = false
) => ({
  width: '100%',
  padding: '12px 16px',
  backgroundColor: processing ? '#dc3545' : variant === 'primary' ? '#007cff' : '#dc3545',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  fontSize: 14,
  fontWeight: 'bold',
  cursor: 'pointer',
  marginBottom: 8
})

// 获取表单组样式
export const getFormGroupStyle = () => ({
  marginBottom: 16
})

// 获取标签样式
export const getLabelStyle = () => ({
  fontSize: 14,
  fontWeight: 'bold',
  display: 'block',
  marginBottom: 8
})

// 获取信息文本样式
export const getInfoTextStyle = () => ({
  fontSize: 10,
  color: '#666',
  textAlign: 'center' as const,
  lineHeight: 1.5
})

// 获取按钮组样式
export const getButtonGroupStyle = () => ({
  display: 'flex',
  gap: 4
})

// 获取弹性按钮样式
export const getFlexButtonStyle = (flex: number = 1) => ({
  flex
})