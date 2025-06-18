// 深入分析发送机制
function analyzeSend() {
  console.log("=== 深入分析发送机制 ===");
  
  const textarea = document.querySelector('textarea[placeholder="请输入"]');
  const sendBtn = document.querySelector('.chat-send');
  
  if (!textarea || !sendBtn) {
    console.log("未找到必要元素");
    return;
  }
  
  // 1. 检查Vue版本和组件
  console.log("\n1. Vue分析:");
  if (window.Vue) {
    console.log("Vue版本:", window.Vue.version);
  }
  
  // 查找所有Vue组件
  function findVueComponents(el) {
    const components = [];
    function traverse(node) {
      if (node.__vue__) {
        components.push({
          element: node,
          component: node.__vue__,
          name: node.__vue__.$options.name || 'Anonymous'
        });
      }
      for (const child of node.children) {
        traverse(child);
      }
    }
    traverse(el);
    return components;
  }
  
  const chatArea = document.querySelector('.chat-input-msg') || document.querySelector('.pub-chat');
  if (chatArea) {
    const vueComponents = findVueComponents(chatArea);
    console.log("找到的Vue组件:", vueComponents);
    
    vueComponents.forEach((comp, index) => {
      console.log(`\n组件${index + 1}: ${comp.name}`);
      console.log("Data:", comp.component.$data);
      console.log("Props:", comp.component.$props);
      console.log("Methods:", Object.keys(comp.component.$options.methods || {}));
    });
  }
  
  // 2. 检查事件监听器（仅Chrome DevTools有此API）
  console.log("\n2. 事件监听器分析:");
  if (window.getEventListeners) {
    console.log("发送按钮事件:", window.getEventListeners(sendBtn));
    console.log("输入框事件:", window.getEventListeners(textarea));
  } else {
    console.log("请在Chrome DevTools中运行此脚本以查看事件监听器");
  }
  
  // 3. 模拟真实用户操作
  console.log("\n3. 模拟真实用户操作:");
  console.log("请手动执行以下操作，观察控制台和网络请求：");
  console.log("a) 在输入框中输入文字");
  console.log("b) 点击发送按钮");
  console.log("c) 观察Network标签中的请求");
  
  // 4. 拦截可能的发送函数
  console.log("\n4. 尝试拦截发送函数:");
  
  // 拦截XMLHttpRequest
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalSend = xhr.send;
    xhr.send = function(data) {
      console.log("XHR请求:", {
        method: xhr._method || 'Unknown',
        url: xhr._url || 'Unknown',
        data: data
      });
      return originalSend.apply(xhr, arguments);
    };
    const originalOpen = xhr.open;
    xhr.open = function(method, url) {
      xhr._method = method;
      xhr._url = url;
      return originalOpen.apply(xhr, arguments);
    };
    return xhr;
  };
  
  // 拦截fetch
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    console.log("Fetch请求:", { url, options });
    return originalFetch.apply(window, arguments);
  };
  
  console.log("已设置请求拦截，现在手动发送一条消息，查看拦截的请求信息");
  
  // 5. 尝试触发输入事件
  console.log("\n5. 尝试触发完整的输入流程:");
  textarea.value = "测试消息 " + Date.now();
  
  // 触发Vue的v-model更新
  const inputEvent = new Event('input', { bubbles: true });
  Object.defineProperty(inputEvent, 'target', {
    value: textarea,
    enumerable: true
  });
  textarea.dispatchEvent(inputEvent);
  
  // 触发Vue 3的更新（如果是Vue 3）
  textarea.dispatchEvent(new Event('update:modelValue', { bubbles: true }));
  
  console.log("已触发输入事件，请检查是否可以手动点击发送");
}

// 执行分析
analyzeSend();