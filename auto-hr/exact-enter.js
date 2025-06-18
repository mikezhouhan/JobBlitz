// 精确模拟回车键事件序列
async function exactEnter() {
  console.log("=== 精确模拟回车键 ===");
  
  const textarea = document.querySelector('textarea[placeholder="请输入"]');
  
  if (!textarea) {
    console.log("未找到输入框");
    return;
  }
  
  // 设置测试消息
  textarea.value = "精确测试 " + Date.now();
  textarea.focus();
  
  // 先触发一个input事件，确保消息被识别
  textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
  
  console.log("消息已输入:", textarea.value);
  console.log("等待1秒...");
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("\n开始模拟回车键序列:");
  
  // 1. KEYDOWN
  console.log("1. 触发 keydown");
  const keydownEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    keyCode: 13,
    which: 13,
    code: 'Enter',
    bubbles: true,
    cancelable: true,
    composed: true
  });
  textarea.dispatchEvent(keydownEvent);
  
  await new Promise(r => setTimeout(r, 10));
  
  // 2. KEYPRESS
  console.log("2. 触发 keypress");
  const keypressEvent = new KeyboardEvent('keypress', {
    key: 'Enter',
    keyCode: 13,
    which: 13,
    code: 'Enter',
    bubbles: true,
    cancelable: true,
    composed: true
  });
  textarea.dispatchEvent(keypressEvent);
  
  await new Promise(r => setTimeout(r, 10));
  
  // 3. INPUT (回车键也会触发input事件！)
  console.log("3. 触发 input");
  const inputEvent = new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertLineBreak',
    data: null
  });
  textarea.dispatchEvent(inputEvent);
  
  await new Promise(r => setTimeout(r, 10));
  
  // 4. KEYUP
  console.log("4. 触发 keyup");
  const keyupEvent = new KeyboardEvent('keyup', {
    key: 'Enter',
    keyCode: 13,
    which: 13,
    code: 'Enter',
    bubbles: true,
    cancelable: true,
    composed: true
  });
  textarea.dispatchEvent(keyupEvent);
  
  console.log("\n事件序列完成");
  
  // 检查结果
  setTimeout(() => {
    if (!textarea.value) {
      console.log("✅ 发送成功!");
    } else {
      console.log("❌ 发送失败，尝试其他方法...");
      
      // 尝试使用deprecated的方法创建事件
      console.log("\n尝试使用initKeyboardEvent...");
      const evt = document.createEvent('KeyboardEvent');
      
      // Chrome使用initKeyboardEvent
      if (evt.initKeyboardEvent) {
        evt.initKeyboardEvent(
          'keydown',
          true,
          true,
          window,
          'Enter',
          0,
          false,
          false,
          false,
          false
        );
        
        // 手动设置关键属性
        Object.defineProperty(evt, 'keyCode', {
          get: function() { return 13; }
        });
        Object.defineProperty(evt, 'which', {
          get: function() { return 13; }
        });
        Object.defineProperty(evt, 'key', {
          get: function() { return 'Enter'; }
        });
        Object.defineProperty(evt, 'code', {
          get: function() { return 'Enter'; }
        });
        
        textarea.dispatchEvent(evt);
      }
    }
  }, 1000);
}

// 测试不同的输入方式
async function testInputMethods() {
  console.log("\n\n=== 测试不同输入方式 ===");
  
  const textarea = document.querySelector('textarea[placeholder="请输入"]');
  if (!textarea) return;
  
  // 清空
  textarea.value = '';
  
  console.log("方法1: 使用Document.execCommand");
  textarea.focus();
  document.execCommand('insertText', false, '测试execCommand');
  await new Promise(r => setTimeout(r, 500));
  
  // 尝试发送
  document.execCommand('insertLineBreak');
  
  await new Promise(r => setTimeout(r, 1000));
  
  if (textarea.value) {
    console.log("方法1失败");
    
    console.log("\n方法2: 模拟composition事件");
    textarea.value = '测试composition ' + Date.now();
    
    // 触发composition事件序列
    textarea.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    textarea.dispatchEvent(new CompositionEvent('compositionupdate', { data: textarea.value, bubbles: true }));
    textarea.dispatchEvent(new CompositionEvent('compositionend', { data: textarea.value, bubbles: true }));
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
    
    await new Promise(r => setTimeout(r, 500));
    
    // 发送
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
  }
}

// 执行测试
exactEnter().then(() => testInputMethods());