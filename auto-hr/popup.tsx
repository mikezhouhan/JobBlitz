import { useEffect, useState } from "react"
import type { Applicant } from "./types"
import { STATUS_MESSAGES } from "./constants"
import { 
  checkDataAvailability,
  validateAndConfirmExport,
  performCSVExport,
  handleExportSuccess,
  handleExportError
} from "./utils/exportHelpers"
import { 
  getContainerStyle, 
  getTextareaStyle, 
  getTitleStyle, 
  getStatusBarStyle, 
  getFormGroupStyle, 
  getLabelStyle, 
  getLargeButtonStyle, 
  getButtonStyle, 
  getButtonGroupStyle, 
  getInfoTextStyle 
} from "./utils/styles"
import { useDataManager } from "./hooks/useDataManager"
import { usePageStats } from "./hooks/usePageStats"
import { useBatchProcess } from "./hooks/useBatchProcess"
import { useScreeningProcess } from "./hooks/useScreeningProcess"
import { useScan } from "./hooks/useScan"

function IndexPopup() {
  // 本地状态管理 - 必须在所有自定义hooks之前
  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateMessage, setNewTemplateMessage] = useState('')

  // 使用自定义 hooks - 保持固定顺序
  const {
    applicantCount,
    messageTemplates,
    selectedTemplateId,
    status,
    setStatus,
    loadData,
    clearApplicantData,
    getApplicantData,
    getCurrentTemplate,
    addCustomTemplate,
    deleteCustomTemplate,
    saveConfig
  } = useDataManager()

  const {
    pageStats,
    getPageStats,
    refreshPageStats,
    debugPage
  } = usePageStats()

  const {
    processing,
    startBatchProcess,
    stopBatchProcess
  } = useBatchProcess()

  const {
    processing: screeningProcessing,
    startScreeningProcess,
    stopScreeningProcess
  } = useScreeningProcess()

  const {
    scanning,
    startScan
  } = useScan()

  // 初始化页面统计
  useEffect(() => {
    // 延迟一下以确保内容脚本已加载
    setTimeout(() => {
      getPageStats(setStatus)
    }, 500)
  }, [])



  // 处理模板选择
  const handleTemplateChange = async (templateId: string) => {
    try {
      await saveConfig(templateId)
    } catch (error) {
      console.error('Failed to save template config:', error)
    }
  }

  // 处理添加自定义模板
  const handleAddTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateMessage.trim()) {
      alert('请填写模板名称和消息内容')
      return
    }
    
    try {
      const templateId = await addCustomTemplate(newTemplateName, newTemplateMessage)
      if (templateId) {
        setNewTemplateName('')
        setNewTemplateMessage('')
        setShowAddTemplate(false)
        // 自动选择新添加的模板
        await saveConfig(templateId)
      }
    } catch (error) {
      console.error('Failed to add custom template:', error)
    }
  }

  // 处理删除模板
  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('确定要删除这个自定义模板吗？')) {
      try {
        await deleteCustomTemplate(templateId)
      } catch (error) {
        console.error('Failed to delete template:', error)
      }
    }
  }

  // 处理批量操作
  const handleBatchProcess = async () => {
    if (processing) {
      await stopBatchProcess(setStatus)
    } else {
      if (messageTemplates.length > 0) {
        const currentTemplate = getCurrentTemplate()
        await startBatchProcess(currentTemplate.message, pageStats.totalApplicants, setStatus)
      }
    }
  }

  // 处理初筛批量操作
  const handleScreeningProcess = async () => {
    if (screeningProcessing) {
      await stopScreeningProcess(setStatus)
    } else {
      await startScreeningProcess(pageStats.totalApplicants, setStatus)
    }
  }

  // 处理扫描操作
  const handleScanOnly = async () => {
    await startScan(setStatus, loadData, () => getPageStats(setStatus))
  }

  // 处理调试操作
  const handleDebugPage = async () => {
    await debugPage(setStatus)
  }

  // 处理CSV导出
  const handleExportCSV = async () => {
    if (!checkDataAvailability(applicantCount)) {
      return
    }
    
    try {
      const applicants = await getApplicantData()
      
      if (!validateAndConfirmExport(applicants)) {
        return
      }
      
      performCSVExport(applicants)
      handleExportSuccess(setStatus)
    } catch (error: any) {
      handleExportError(error, setStatus)
    }
  }


  // 处理数据清空
  const handleClearData = async () => {
    if (confirm(STATUS_MESSAGES.CONFIRM_CLEAR_DATA)) {
      await clearApplicantData()
    }
  }

  return (
    <div style={getContainerStyle()}>
      <h2 style={getTitleStyle()}>
        🤖 HR自动化助手
      </h2>
      
      <div style={getStatusBarStyle()}>
        <div style={{ fontSize: 12, marginBottom: 4 }}>
          状态: <strong style={{ color: (processing || screeningProcessing) ? '#ff6b35' : '#28a745' }}>{status}</strong>
        </div>
        <div style={{ fontSize: 12, marginBottom: 4 }}>
          当前页面: <strong>{pageStats.totalApplicants} 个申请人</strong>
          {pageStats.pageNumber && pageStats.pageNumber > 1 ? ` (第 ${pageStats.pageNumber} 页)` : ''}
        </div>
        <div style={{ fontSize: 12 }}>
          累计收集数据: <strong>{applicantCount} 条</strong>
        </div>
      </div>

      <div style={getFormGroupStyle()}>
        <label style={getLabelStyle()}>
          📝 自动回复消息模板：
        </label>
        
        <div style={{ marginBottom: 8 }}>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: '#fff'
            }}
          >
            {messageTemplates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{
          padding: '8px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#666',
          marginBottom: 8,
          maxHeight: '60px',
          overflow: 'auto'
        }}>
          {messageTemplates.length > 0 ? getCurrentTemplate().message : '加载中...'}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            onClick={() => setShowAddTemplate(!showAddTemplate)}
            style={{
              ...getButtonStyle('secondary'),
              flex: 1,
              fontSize: '12px',
              padding: '4px 8px'
            }}
          >
            {showAddTemplate ? '取消添加' : '➕ 添加模板'}
          </button>
          
          {selectedTemplateId && selectedTemplateId.startsWith('custom_') && (
            <button
              onClick={() => handleDeleteTemplate(selectedTemplateId)}
              style={{
                ...getButtonStyle('danger'),
                flex: 1,
                fontSize: '12px',
                padding: '4px 8px'
              }}
            >
              🗑️ 删除模板
            </button>
          )}
        </div>

        {showAddTemplate && (
          <div style={{
            padding: '8px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '4px',
            marginBottom: 8
          }}>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="模板名称"
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #ddd',
                borderRadius: '3px',
                fontSize: '12px',
                marginBottom: 6
              }}
            />
            <textarea
              value={newTemplateMessage}
              onChange={(e) => setNewTemplateMessage(e.target.value)}
              placeholder="模板内容"
              style={{
                ...getTextareaStyle(),
                height: '50px',
                fontSize: '12px',
                marginBottom: 6
              }}
            />
            <button
              onClick={handleAddTemplate}
              style={{
                ...getButtonStyle('primary'),
                width: '100%',
                fontSize: '12px',
                padding: '4px 8px'
              }}
            >
              保存模板
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            onClick={handleBatchProcess}
            style={{
              ...getLargeButtonStyle('primary', processing),
              flex: 1
            }}
          >
            {processing ? '⏹️ 停止批量处理' : '💬 批量沟通'}
          </button>
          
          <button
            onClick={handleScreeningProcess}
            style={{
              ...getLargeButtonStyle('success', screeningProcessing),
              flex: 1
            }}
          >
            {screeningProcessing ? '⏹️ 停止初筛' : '✅ 通过初筛'}
          </button>
        </div>
        
        <div style={getButtonGroupStyle()}>
          <button
            onClick={handleScanOnly}
            style={{
              ...getButtonStyle(scanning ? 'danger' : 'secondary'),
              flex: 1
            }}
          >
            {scanning ? '⏹ 停止收集' : '📊 仅收集数据'}
          </button>
          
          <button
            onClick={handleDebugPage}
            style={getButtonStyle('primary')}
          >
            🔍 调试
          </button>
        </div>
        
        <button
          onClick={() => refreshPageStats(setStatus, loadData)}
          style={{
            ...getButtonStyle('warning'),
            width: '100%',
            marginTop: 8
          }}
        >
          🔄 刷新检测页面数据
        </button>
      </div>

      <div style={{ ...getButtonGroupStyle(), gap: 8, marginBottom: 16 }}>
        <button
          onClick={handleExportCSV}
          disabled={applicantCount === 0}
          style={{
            ...getButtonStyle('primary', applicantCount === 0),
            flex: 1
          }}
        >
          📄 导出CSV ({applicantCount})
        </button>
        
        <button
          onClick={handleClearData}
          disabled={applicantCount === 0}
          style={{
            ...getButtonStyle('danger', applicantCount === 0),
            flex: 1
          }}
        >
          🗑️ 清空数据
        </button>
      </div>

      <div style={getInfoTextStyle()}>
        <div>💡 使用说明:</div>
        <div>1. 在申请人列表页面选择操作类型:</div>
        <div>   • "批量沟通": 发送消息并收集数据</div>
        <div>   • "通过初筛": 一键通过所有申请人初筛</div>
        <div>   • "仅收集数据": 只收集联系信息</div>
        <div>2. 系统会自动处理所有分页的申请人</div>
        <div>3. 完成后可导出CSV文件查看收集的数据</div>
      </div>
    </div>
  )
}


export default IndexPopup
