import { useEffect, useState } from "react"

function IndexPopup() {
  const [status, setStatus] = useState("正在加载...")
  const [applicantCount, setApplicantCount] = useState(0)
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['applicants', 'config'])
        const applicants = result.applicants || []
        const config = result.config || { autoReply: { enabled: true, replyMessage: "感谢您的申请" } }
        
        setApplicantCount(applicants.length)
        setAutoReplyEnabled(config.autoReply.enabled)
        setStatus("数据加载成功")
      } else {
        setStatus("Chrome API 不可用")
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      setStatus(`加载失败: ${error.message}`)
    }
  }

  const handleToggleAutoReply = async () => {
    const newEnabled = !autoReplyEnabled
    setAutoReplyEnabled(newEnabled)
    
    try {
      const config = { autoReply: { enabled: newEnabled, replyMessage: "感谢您的申请" } }
      await chrome.storage.local.set({ config })
      setStatus("设置已更新")
    } catch (error) {
      setStatus(`更新失败: ${error.message}`)
    }
  }

  const handleExportCSV = async () => {
    if (applicantCount === 0) {
      alert('暂无数据可导出')
      return
    }
    alert(`导出功能正在开发中，当前有 ${applicantCount} 条数据`)
  }

  const handleClearData = async () => {
    if (confirm('确定要清空所有申请人数据吗？')) {
      try {
        await chrome.storage.local.remove(['applicants'])
        setApplicantCount(0)
        setStatus("数据已清空")
      } catch (error) {
        setStatus(`清空失败: ${error.message}`)
      }
    }
  }

  return (
    <div style={{ width: 350, padding: 16, fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ margin: 0, marginBottom: 16, color: '#333' }}>
        HR自动化助手
      </h2>
      
      <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <div style={{ fontSize: 12, marginBottom: 8 }}>
          状态: <strong>{status}</strong>
        </div>
        <div style={{ fontSize: 12 }}>
          申请人数据: <strong>{applicantCount} 条</strong>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <input 
            type="checkbox" 
            checked={autoReplyEnabled}
            onChange={handleToggleAutoReply}
            id="autoReply"
          />
          <label htmlFor="autoReply" style={{ marginLeft: 8, fontSize: 14 }}>
            启用自动回复
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={handleExportCSV}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          导出CSV ({applicantCount})
        </button>
        
        <button
          onClick={handleClearData}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          清空数据
        </button>
      </div>

      <div style={{ fontSize: 10, color: '#666', textAlign: 'center' }}>
        <div>仅在 hr.shixiseng.com 网站上有效</div>
        <div>请重新加载扩展以应用更改</div>
      </div>
    </div>
  )
}

export default IndexPopup
