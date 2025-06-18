// 精确复制之前成功的方法
async function exactTest() {
  console.log("=== 精确测试（复制成功的方法） ===");
  
  const textarea = document.querySelector('textarea[placeholder="请输入"]');
  const sendBtn = document.querySelector('.chat-send');
  
  if (!textarea || !sendBtn) {
    console.log("未找到必要元素");
    return;
  }
  
  // 设置消息
  const testMessage = "测试消息 " + new Date().toLocaleTimeString();
  textarea.value = testMessage;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  
  console.log("消息已输入:", textarea.value);
  console.log("等待2秒...");
  
  await new Promise(r => setTimeout(r, 2000));
  
  // 这是之前成功的方法2
  console.log("\n执行方法2: 模拟回车键（完整序列）");
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
  
  console.log("触发keydown");
  textarea.dispatchEvent(keydownEvent);
  
  console.log("触发keypress");
  textarea.dispatchEvent(keypressEvent);
  
  console.log("触发keyup");
  textarea.dispatchEvent(keyupEvent);
  
  console.log("已触发所有键盘事件");
  
  // 检查结果
  setTimeout(() => {
    if (!textarea.value || textarea.value !== testMessage) {
      console.log("\n✅ 发送成功!");
    } else {
      console.log("\n❌ 发送失败，消息仍在输入框");
      console.log("当前输入框值:", textarea.value);
    }
  }, 1000);
}

// 另一个测试：逐步构建事件
async function stepByStepTest() {
  console.log("\n\n=== 逐步测试 ===");
  
  const textarea = document.querySelector('textarea[placeholder="请输入"]');
  
  if (!textarea) {
    console.log("未找到输入框");
    return;
  }
  
  // 设置新消息
  const testMessage = "逐步测试 " + Date.now();
  
  console.log("步骤1: 清空输入框");
  textarea.value = '';
  textarea.focus();
  
  console.log("步骤2: 逐字输入");
  for (let char of testMessage) {
    textarea.value += char;
    textarea.dispatchEvent(new InputEvent('input', {
      data: char,
      inputType: 'insertText',
      bubbles: true
    }));
    await new Promise(r => setTimeout(r, 10));
  }
  
  console.log("步骤3: 等待1秒");
  await new Promise(r => setTimeout(r, 1000));
  
  console.log("步骤4: 触发回车键");
  
  // 方式A: 使用KeyboardEvent构造函数
  const enterA = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  });
  
  // 方式B: 使用document.createEvent (老方法)
  const enterB = document.createEvent('KeyboardEvent');
  if (enterB.initKeyboardEvent) {
    enterB.initKeyboardEvent('keydown', true, true, window, 'Enter', 0, false, false, false, false);
  }
  
  console.log("尝试方式A");
  textarea.dispatchEvent(enterA);
  
  await new Promise(r => setTimeout(r, 500));
  
  if (textarea.value) {
    console.log("方式A失败，尝试方式B");
    textarea.dispatchEvent(enterB);
  }
  
  // 检查结果
  setTimeout(() => {
    if (!textarea.value || textarea.value !== testMessage) {
      console.log("\n✅ 逐步测试成功!");
    } else {
      console.log("\n❌ 逐步测试失败");
    }
  }, 1000);
}

// 执行测试
exactTest().then(() => {
  return stepByStepTest();
});