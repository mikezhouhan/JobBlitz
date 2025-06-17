import { useEffect, useState } from "react"

function SimplePopup() {
  const [status, setStatus] = useState("正在加载...")

  useEffect(() => {
    // 简单测试 Chrome Storage
    const testStorage = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const result = await chrome.storage.local.get(['test'])
          setStatus("存储访问正常")
        } else {
          setStatus("Chrome API 不可用")
        }
      } catch (error) {
        setStatus(`错误: ${error.message}`)
      }
    }
    
    testStorage()
  }, [])

  return (
    <div style={{ 
      width: 300, 
      padding: 20, 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f9f9f9'
    }}>
      <h2 style={{ margin: 0, marginBottom: 16, color: '#333' }}>
        HR自动化助手
      </h2>
      
      <div style={{ 
        padding: 12, 
        backgroundColor: '#fff', 
        borderRadius: 4,
        border: '1px solid #ddd'
      }}>
        <p style={{ margin: 0, fontSize: 14 }}>
          状态: {status}
        </p>
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          onClick={() => {
            alert('按钮点击测试成功!')
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007cff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          测试按钮
        </button>
      </div>

      <div style={{ 
        marginTop: 16, 
        fontSize: 12, 
        color: '#666',
        textAlign: 'center'
      }}>
        如果看到此页面，说明 popup 正常工作
      </div>
    </div>
  )
}

export default SimplePopup