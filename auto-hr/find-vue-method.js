// 深入查找Vue组件和方法
function findVueMethod() {
  console.log("=== 查找Vue发送方法 ===");
  
  const textarea = document.querySelector('textarea[placeholder="请输入"]');
  const sendBtn = document.querySelector('.chat-send');
  
  if (!textarea || !sendBtn) {
    console.log("未找到必要元素");
    return;
  }
  
  // 1. 从发送按钮开始查找
  console.log("\n1. 从发送按钮查找Vue组件:");
  let element = sendBtn;
  let depth = 0;
  
  while (element && depth < 10) {
    if (element.__vue__) {
      console.log(`\n层级 ${depth} - 找到Vue组件:`, element);
      const vm = element.__vue__;
      
      console.log("组件名:", vm.$options.name || "Anonymous");
      console.log("组件Data:", vm.$data);
      console.log("组件Methods:", Object.keys(vm.$options.methods || {}));
      console.log("组件Props:", vm.$props);
      
      // 检查所有可能的发送相关方法
      const allMethods = Object.getOwnPropertyNames(vm).filter(key => typeof vm[key] === 'function');
      console.log("所有方法:", allMethods);
      
      // 查找包含send/submit等关键词的方法
      const sendMethods = allMethods.filter(method => 
        method.toLowerCase().includes('send') || 
        method.toLowerCase().includes('submit') ||
        method.toLowerCase().includes('post') ||
        method.toLowerCase().includes('message')
      );
      console.log("可能的发送方法:", sendMethods);
    }
    
    element = element.parentElement;
    depth++;
  }
  
  // 2. 从输入框开始查找
  console.log("\n\n2. 从输入框查找Vue组件:");
  element = textarea;
  depth = 0;
  
  while (element && depth < 10) {
    if (element.__vue__) {
      console.log(`\n层级 ${depth} - 找到Vue组件:`, element);
      const vm = element.__vue__;
      
      console.log("组件名:", vm.$options.name || "Anonymous");
      console.log("组件Methods:", Object.keys(vm.$options.methods || {}));
      
      // 检查计算属性
      if (vm.$options.computed) {
        console.log("计算属性:", Object.keys(vm.$options.computed));
      }
      
      // 检查监听器
      if (vm.$options.watch) {
        console.log("监听器:", Object.keys(vm.$options.watch));
      }
    }
    
    element = element.parentElement;
    depth++;
  }
  
  // 3. 监听点击事件
  console.log("\n\n3. 监听发送按钮点击:");
  
  // 临时替换点击处理
  const originalClick = sendBtn.onclick;
  let capturedFunction = null;
  
  // 创建代理来捕获Vue的事件处理
  const handler = {
    apply: function(target, thisArg, argumentsList) {
      console.log("捕获到函数调用:");
      console.log("函数:", target);
      console.log("this:", thisArg);
      console.log("参数:", argumentsList);
      capturedFunction = target;
      return target.apply(thisArg, argumentsList);
    }
  };
  
  // 尝试代理addEventListener
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (type === 'click' && this === sendBtn) {
      console.log("捕获到click事件监听器:", listener);
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  console.log("\n请手动点击发送按钮，观察控制台输出...");
  
  // 4. 检查全局Vue实例
  console.log("\n\n4. 检查Vue根实例:");
  if (window.Vue && window.Vue.apps) {
    console.log("Vue 3 应用:", window.Vue.apps);
  }
  
  // 查找包含聊天组件的根元素
  const chatRoot = document.querySelector('.chat-main') || 
                   document.querySelector('.chat-content') ||
                   document.querySelector('.pub-chat');
  
  if (chatRoot && chatRoot.__vue__) {
    console.log("\n找到聊天根组件:", chatRoot);
    const rootVm = chatRoot.__vue__;
    console.log("根组件实例:", rootVm);
    console.log("根组件Methods:", Object.keys(rootVm.$options.methods || {}));
  }
  
  // 5. 尝试查找事件总线
  console.log("\n\n5. 查找事件总线或store:");
  if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
    console.log("Vue DevTools已安装，可以使用Vue DevTools查看组件树");
  }
  
  // 恢复原始函数
  setTimeout(() => {
    EventTarget.prototype.addEventListener = originalAddEventListener;
  }, 10000);
}

// 执行查找
findVueMethod();