// 测试不同的发送策略
async function testSendMethods() {
  console.log("=== 测试发送方法 ===");
  
  const textarea = document.querySelector('textarea[placeholder="请输入"]');
  const sendBtn = document.querySelector('.chat-send');
  
  if (!textarea || !sendBtn) {
    console.log("未找到必要元素");
    return;
  }
  
  // 设置测试消息
  const testMessage = "测试消息 " + new Date().toLocaleTimeString();
  
  console.log("\n方法1: 完整模拟用户操作");
  // 清空并重新输入
  textarea.value = '';
  textarea.focus();
  textarea.click();
  
  // 逐字符输入
  for (let char of testMessage) {
    textarea.value += char;
    textarea.dispatchEvent(new InputEvent('input', {
      data: char,
      inputType: 'insertText',
      bubbles: true
    }));
    await new Promise(r => setTimeout(r, 10));
  }
  
  console.log("消息已输入，等待2秒后尝试发送...");
  await new Promise(r => setTimeout(r, 2000));
  
  // 尝试点击发送
  console.log("点击发送按钮");
  sendBtn.click();
  
  await new Promise(r => setTimeout(r, 1000));
  
  if (textarea.value) {
    console.log("方法1失败，尝试方法2");
    
    console.log("\n方法2: 模拟回车键");
    textarea.focus();
    
    // 完整的键盘事件序列
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    
    const keypressEvent = new KeyboardEvent('keypress', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    
    const keyupEvent = new KeyboardEvent('keyup', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    
    textarea.dispatchEvent(keydownEvent);
    textarea.dispatchEvent(keypressEvent);
    textarea.dispatchEvent(keyupEvent);
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  if (textarea.value) {
    console.log("方法2失败，尝试方法3");
    
    console.log("\n方法3: 查找并触发Vue事件");
    
    // 从聊天区域查找Vue实例
    let chatArea = document.querySelector('.chat-input-msg');
    if (!chatArea) {
      chatArea = textarea.closest('.pub-chat');
    }
    
    if (chatArea && chatArea.__vue__) {
      const vm = chatArea.__vue__;
      console.log("找到聊天组件:", vm);
      
      // 尝试触发自定义事件
      vm.$emit('send');
      vm.$emit('sendMessage');
      vm.$emit('submit');
      
      // 如果有父组件，也尝试
      if (vm.$parent) {
        vm.$parent.$emit('send');
        vm.$parent.$emit('sendMessage');
      }
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  if (textarea.value) {
    console.log("方法3失败，尝试方法4");
    
    console.log("\n方法4: 直接操作Vue数据并触发方法");
    
    // 查找包含消息数据的Vue组件
    let element = textarea.parentElement;
    while (element && element !== document.body) {
      if (element.__vue__) {
        const vm = element.__vue__;
        
        // 查找消息相关的data属性
        const dataKeys = Object.keys(vm.$data || {});
        const messageKey = dataKeys.find(key => 
          key.toLowerCase().includes('message') || 
          key.toLowerCase().includes('msg') ||
          key.toLowerCase().includes('content') ||
          key.toLowerCase().includes('text')
        );
        
        if (messageKey) {
          console.log(`找到消息属性: ${messageKey}`);
          vm.$data[messageKey] = testMessage;
          
          // 强制更新
          vm.$forceUpdate();
          
          // 查找并调用发送方法
          const methods = vm.$options.methods || {};
          const methodNames = Object.keys(methods);
          const sendMethod = methodNames.find(name => 
            name.toLowerCase().includes('send') || 
            name.toLowerCase().includes('submit')
          );
          
          if (sendMethod) {
            console.log(`调用方法: ${sendMethod}`);
            vm[sendMethod]();
          }
        }
      }
      element = element.parentElement;
    }
  }
  
  // 最终检查
  setTimeout(() => {
    if (!textarea.value || textarea.value !== testMessage) {
      console.log("\n✅ 发送成功!");
    } else {
      console.log("\n❌ 所有方法失败");
      console.log("建议：使用Chrome DevTools的Vue插件查看组件结构");
    }
  }, 2000);
}

// 执行测试
testSendMethods();