// 调试发送功能的脚本
// 在聊天界面打开后，在控制台运行此脚本

function debugSend() {
  console.log("=== 开始调试发送功能 ===");
  
  // 1. 检查输入框
  const textarea = document.querySelector('textarea[placeholder="请输入"]');
  console.log("输入框:", textarea);
  console.log("输入框当前值:", textarea?.value);
  
  // 2. 检查发送按钮
  const sendBtn = document.querySelector('.chat-send');
  console.log("发送按钮:", sendBtn);
  console.log("发送按钮HTML:", sendBtn?.outerHTML);
  
  // 3. 查看是否有事件监听器
  if (sendBtn) {
    // 检查Vue实例
    console.log("Vue组件实例:", sendBtn.__vue__);
    console.log("Vue组件data:", sendBtn.__vue__?.$data);
    console.log("Vue组件methods:", sendBtn.__vue__?.$options?.methods);
    
    // 检查onClick事件
    const events = window.getEventListeners ? window.getEventListeners(sendBtn) : null;
    console.log("事件监听器:", events);
  }
  
  // 4. 尝试手动发送
  if (textarea && sendBtn) {
    console.log("\n尝试手动发送消息...");
    
    // 设置消息
    textarea.value = "测试消息 " + new Date().toLocaleTimeString();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log("消息已输入:", textarea.value);
    
    // 尝试各种点击方法
    console.log("\n方法1: 直接调用click()");
    sendBtn.click();
    
    setTimeout(() => {
      if (textarea.value) {
        console.log("方法1失败，消息仍在输入框中");
        
        console.log("\n方法2: 触发原生事件");
        sendBtn.dispatchEvent(new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        }));
      }
    }, 1000);
    
    setTimeout(() => {
      if (textarea.value) {
        console.log("方法2失败，消息仍在输入框中");
        
        console.log("\n方法3: 查找并调用Vue方法");
        if (sendBtn.__vue__ && sendBtn.__vue__.handleSend) {
          sendBtn.__vue__.handleSend();
        } else if (sendBtn.__vue__?.$parent?.sendMessage) {
          sendBtn.__vue__.$parent.sendMessage();
        } else {
          console.log("未找到Vue发送方法");
        }
      }
    }, 2000);
    
    setTimeout(() => {
      if (textarea.value) {
        console.log("方法3失败，消息仍在输入框中");
        
        console.log("\n方法4: 模拟Enter键");
        textarea.focus();
        const event = new KeyboardEvent('keydown', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          code: 'Enter',
          bubbles: true,
          cancelable: true
        });
        textarea.dispatchEvent(event);
      }
    }, 3000);
    
    setTimeout(() => {
      if (textarea.value) {
        console.log("方法4失败，消息仍在输入框中");
        
        console.log("\n方法5: 尝试Ctrl+Enter");
        textarea.focus();
        const ctrlEnterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        });
        textarea.dispatchEvent(ctrlEnterEvent);
      }
    }, 4000);
    
    setTimeout(() => {
      if (textarea.value) {
        console.log("方法5失败，消息仍在输入框中");
        
        console.log("\n方法6: 尝试keypress事件");
        textarea.focus();
        const keypressEvent = new KeyboardEvent('keypress', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        });
        textarea.dispatchEvent(keypressEvent);
      }
    }, 5000);
    
    setTimeout(() => {
      if (textarea.value) {
        console.log("方法6失败，消息仍在输入框中");
        
        console.log("\n方法7: 尝试keyup事件");
        textarea.focus();
        // 先触发keydown
        textarea.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        }));
        // 再触发keyup
        textarea.dispatchEvent(new KeyboardEvent('keyup', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        }));
      }
    }, 6000);
    
    setTimeout(() => {
      if (textarea.value) {
        console.log("方法7失败，消息仍在输入框中");
        
        console.log("\n方法8: 尝试直接触发表单提交");
        // 查找可能的表单元素
        const form = textarea.closest('form');
        if (form) {
          console.log("找到表单，尝试提交");
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        } else {
          console.log("未找到表单元素");
        }
        
        // 尝试查找父元素中的Vue组件
        let parent = textarea.parentElement;
        while (parent && parent !== document.body) {
          if (parent.__vue__) {
            console.log("找到父级Vue组件:", parent);
            const vm = parent.__vue__;
            // 尝试调用可能的发送方法
            const possibleMethods = ['send', 'sendMessage', 'handleSend', 'onSend', 'submit', 'sendMsg'];
            for (const method of possibleMethods) {
              if (typeof vm[method] === 'function') {
                console.log(`尝试调用 ${method} 方法`);
                vm[method]();
                break;
              }
            }
          }
          parent = parent.parentElement;
        }
      }
    }, 7000);
    
    setTimeout(() => {
      if (!textarea.value) {
        console.log("\n✅ 消息发送成功！");
      } else {
        console.log("\n❌ 所有方法都失败了");
        console.log("\n建议：");
        console.log("1. 手动发送一条消息，在Network标签中查看请求");
        console.log("2. 在Elements面板中查看发送按钮的事件监听器");
        console.log("3. 可能需要模拟完整的用户交互流程");
      }
    }, 8000);
  }
}

// 执行调试
debugSend();