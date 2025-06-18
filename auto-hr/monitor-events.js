// 监听键盘事件，了解实际发送机制
function monitorEvents() {
  console.log("=== 监听键盘事件 ===");
  console.log("请在输入框中输入文字，然后按回车键发送");
  console.log("观察控制台输出的事件详情\n");
  
  const textarea = document.querySelector('textarea[placeholder="请输入"]');
  
  if (!textarea) {
    console.log("未找到输入框");
    return;
  }
  
  // 保存原始事件处理器
  const handlers = {
    keydown: [],
    keypress: [],
    keyup: [],
    input: [],
    change: []
  };
  
  // 监听所有键盘相关事件
  ['keydown', 'keypress', 'keyup', 'input', 'change'].forEach(eventType => {
    textarea.addEventListener(eventType, function(e) {
      console.log(`\n=== ${eventType.toUpperCase()} 事件 ===`);
      console.log("key:", e.key);
      console.log("keyCode:", e.keyCode);
      console.log("which:", e.which);
      console.log("code:", e.code);
      console.log("ctrlKey:", e.ctrlKey);
      console.log("shiftKey:", e.shiftKey);
      console.log("altKey:", e.altKey);
      console.log("metaKey:", e.metaKey);
      console.log("isComposing:", e.isComposing);
      console.log("target.value:", e.target.value);
      
      if (e.key === 'Enter') {
        console.log("🎯 检测到回车键!");
        console.log("defaultPrevented:", e.defaultPrevented);
        console.log("isTrusted:", e.isTrusted);
        
        // 检查是否有其他处理器
        const listeners = window.getEventListeners ? window.getEventListeners(textarea) : null;
        if (listeners && listeners[eventType]) {
          console.log(`其他 ${eventType} 监听器数量:`, listeners[eventType].length);
        }
      }
    }, true); // 使用捕获阶段
  });
  
  // 监听父元素的事件（事件冒泡）
  const parent = textarea.parentElement;
  if (parent) {
    parent.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && e.target === textarea) {
        console.log("\n🎯 父元素捕获到回车键事件（冒泡）");
      }
    });
  }
  
  // 创建测试函数
  window.testEnter = function() {
    console.log("\n\n=== 手动触发回车测试 ===");
    
    // 设置测试消息
    textarea.value = "自动测试消息 " + Date.now();
    textarea.focus();
    
    // 创建最接近原生的事件
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      keyCode: 13,
      code: 'Enter',
      which: 13,
      charCode: 13,
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      detail: 0,
      sourceCapabilities: new InputDeviceCapabilities({firesTouchEvents: false})
    });
    
    // 尝试设置isTrusted（通常会失败，因为这是只读属性）
    try {
      Object.defineProperty(event, 'isTrusted', {
        value: true,
        writable: false
      });
    } catch (e) {
      console.log("无法设置isTrusted属性");
    }
    
    console.log("触发事件...");
    const result = textarea.dispatchEvent(event);
    console.log("dispatchEvent返回值:", result);
    
    // 同时触发keypress和keyup
    textarea.dispatchEvent(new KeyboardEvent('keypress', {
      key: 'Enter',
      keyCode: 13,
      code: 'Enter',
      which: 13,
      bubbles: true,
      cancelable: true
    }));
    
    textarea.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'Enter',
      keyCode: 13,
      code: 'Enter',
      which: 13,
      bubbles: true,
      cancelable: true
    }));
  };
  
  console.log("\n提示：");
  console.log("1. 手动输入文字并按回车，观察事件详情");
  console.log("2. 输入 testEnter() 测试自动触发");
  console.log("3. 比较手动和自动触发的区别");
}

// 执行监听
monitorEvents();