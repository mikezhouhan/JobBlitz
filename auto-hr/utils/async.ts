import { DELAYS, RETRY_LIMITS } from "../constants"

/**
 * 异步操作工具函数
 */

// 延迟函数
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 预设延迟函数
export const delays = {
  pageLoad: () => delay(DELAYS.PAGE_LOAD),
  detailLoad: () => delay(DELAYS.DETAIL_LOAD),
  inputWait: () => delay(DELAYS.INPUT_WAIT),
  messageSend: () => delay(DELAYS.MESSAGE_SEND),
  betweenApplicants: () => delay(DELAYS.BETWEEN_APPLICANTS),
  retryWait: () => delay(DELAYS.RETRY_WAIT),
  afterClick: () => delay(DELAYS.AFTER_CLICK),
  shortWait: () => delay(DELAYS.SHORT_WAIT),
  eventSequence: () => delay(DELAYS.EVENT_SEQUENCE)
}

// 重试函数
export const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = DELAYS.RETRY_WAIT,
  shouldRetry?: (error: any) => boolean
): Promise<T> => {
  let lastError: any

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // 如果提供了重试条件函数，检查是否应该重试
      if (shouldRetry && !shouldRetry(error)) {
        throw error
      }

      // 如果还有重试次数，等待后继续
      if (i < maxRetries) {
        console.log(`操作失败，第 ${i + 1}/${maxRetries} 次重试，${delayMs}ms 后重试...`, error)
        await delay(delayMs)
        // 每次重试增加延迟时间（指数退避）
        delayMs = Math.min(delayMs * 1.5, 10000)
      }
    }
  }

  throw lastError
}

// 预设重试函数
export const retries = {
  // 页面加载重试
  pageLoad: <T>(fn: () => Promise<T>) => 
    retry(fn, RETRY_LIMITS.PAGE_LOAD, DELAYS.RETRY_WAIT),
  
  // 邮箱提取重试
  emailExtraction: <T>(fn: () => Promise<T>) => 
    retry(fn, RETRY_LIMITS.EMAIL_EXTRACTION, DELAYS.RETRY_WAIT)
}

// 超时函数
export const timeout = <T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string = '操作超时'
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), ms)
  })

  return Promise.race([promise, timeoutPromise])
}

// 等待条件满足
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 10000,
  checkIntervalMs: number = 100
): Promise<boolean> => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    try {
      const result = await condition()
      if (result) {
        return true
      }
    } catch (error) {
      console.log('等待条件检查失败:', error)
    }
    
    await delay(checkIntervalMs)
  }

  return false
}

// 等待元素出现
export const waitForElement = async (
  selector: string,
  timeoutMs: number = 10000,
  checkIntervalMs: number = 100
): Promise<Element | null> => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const element = document.querySelector(selector)
    if (element) {
      return element
    }
    await delay(checkIntervalMs)
  }

  return null
}

// 等待多个元素出现
export const waitForElements = async (
  selector: string,
  minCount: number = 1,
  timeoutMs: number = 10000,
  checkIntervalMs: number = 100
): Promise<NodeListOf<Element> | null> => {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const elements = document.querySelectorAll(selector)
    if (elements.length >= minCount) {
      return elements
    }
    await delay(checkIntervalMs)
  }

  return null
}

// 批处理函数 - 控制并发数量
export const batchProcess = async <T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  batchSize: number = 1,
  delayBetweenBatches: number = 0
): Promise<R[]> => {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchPromises = batch.map((item, batchIndex) => 
      processor(item, i + batchIndex)
    )
    
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
    
    // 批次间延迟
    if (delayBetweenBatches > 0 && i + batchSize < items.length) {
      await delay(delayBetweenBatches)
    }
  }
  
  return results
}

// 序列处理函数 - 一个接一个执行
export const sequentialProcess = async <T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  delayBetweenItems: number = 0
): Promise<R[]> => {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i++) {
    const result = await processor(items[i], i)
    results.push(result)
    
    // 项目间延迟
    if (delayBetweenItems > 0 && i < items.length - 1) {
      await delay(delayBetweenItems)
    }
  }
  
  return results
}