// 备选发送方案
async function alternativeSend() {
  console.log("=== 备选发送方案 ===");
  
  const textarea = document.querySelector('textarea[placeholder="请输入"]');
  
  if (!textarea) {
    console.log("未找到输入框");
    return;
  }
  
  // 设置测试消息
  textarea.value = "备选方案测试 " + Date.now();
  
  console.log("\n方案1: 使用execCommand");
  textarea.focus();
  document.execCommand('insertText', false, '\n');
  
  await new Promise(r => setTimeout(r, 1000));
  
  if (textarea.value) {
    console.log("方案1失败");
    
    console.log("\n方案2: 触发表单提交");
    const form = textarea.closest('form');
    if (form) {
      form.requestSubmit();
    } else {
      // 查找包含输入框的容器
      const container = textarea.closest('.chat-input-msg') || 
                       textarea.closest('.pub-chat');
      if (container) {
        // 触发自定义事件
        container.dispatchEvent(new CustomEvent('submit', { bubbles: true }));
        container.dispatchEvent(new CustomEvent('send', { bubbles: true }));
      }
    }
  }
  
  await new Promise(r => setTimeout(r, 1000));
  
  if (textarea.value) {
    console.log("方案2失败");
    
    console.log("\n方案3: 程序化点击发送按钮");
    const sendBtn = document.querySelector('.chat-send');
    if (sendBtn) {
      // 创建并触发鼠标事件
      const rect = sendBtn.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      const mouseEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        screenX: x,
        screenY: y,
        button: 0,
        buttons: 1,
        detail: 1
      });
      
      sendBtn.dispatchEvent(mouseEvent);
    }
  }
  
  await new Promise(r => setTimeout(r, 1000));
  
  if (textarea.value) {
    console.log("方案3失败");
    
    console.log("\n方案4: 使用Puppeteer方式的事件");
    // 这是Puppeteer使用的方法
    textarea.focus();
    
    // 触发文本输入
    const textEvent = new Event('textInput', { bubbles: true });
    textEvent.data = '\r';
    textarea.dispatchEvent(textEvent);
    
    // 触发beforeinput
    const beforeInputEvent = new InputEvent('beforeinput', {
      inputType: 'insertLineBreak',
      data: null,
      bubbles: true,
      cancelable: true
    });
    textarea.dispatchEvent(beforeInputEvent);
  }
  
  // 最终检查
  setTimeout(() => {
    if (!textarea.value) {
      console.log("\n✅ 发送成功!");
    } else {
      console.log("\n❌ 所有备选方案失败");
      console.log("\n可能的解决方案：");
      console.log("1. 使用Chrome扩展的debugger API");
      console.log("2. 注入页面脚本劫持事件处理");
      console.log("3. 使用Chrome DevTools Protocol");
    }
  }, 2000);
}

// 执行测试
alternativeSend();