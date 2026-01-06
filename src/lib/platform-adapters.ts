// 平台适配器系统 - 为每个AI平台提供自动化接口
import type { Page } from 'playwright';

/**
 * 提问结果
 */
export interface AskResult {
  success: boolean;
  response?: string;
  sources?: string[];
  error?: string;
}

/**
 * 平台适配器接口
 */
export interface PlatformAdapter {
  /**
   * 在平台上提问
   * @param page Playwright页面对象
   * @param question 要提问的问题
   * @returns 提问结果
   */
  askQuestion(page: Page, question: string): Promise<AskResult>;

  /**
   * 等待回答生成完成
   * @param page Playwright页面对象
   */
  waitForResponse(page: Page): Promise<void>;
}

/**
 * 豆包平台适配器
 */
export class DoubaoAdapter implements PlatformAdapter {
  async askQuestion(page: Page, question: string): Promise<AskResult> {
    try {
      // 等待页面加载完成
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      // 豆包的输入框选择器 - 按优先级排序
      const inputSelectors = [
        // 豆包可能使用的选择器
        'div[contenteditable="true"]',
        'textarea[placeholder*="问"]',
        'textarea[placeholder*="输入"]',
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Message"]',
        'textarea',
        '.chat-input textarea',
        '.input-box textarea',
        '[data-testid="chat-input"]',
        '#chat-input',
        '[class*="chatInput"]',
        '[class*="ChatInput"]',
      ];

      let inputFound = false;
      let inputSelector = '';

      for (const selector of inputSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 3000 })) {
            inputSelector = selector;
            inputFound = true;
            console.log(`豆包：找到输入框，使用选择器: ${selector}`);
            break;
          }
        } catch {
          continue;
        }
      }

      if (!inputFound) {
        return {
          success: false,
          error: '豆包：未找到输入框，请确认页面已加载完成'
        };
      }

      // 点击输入框并输入问题
      await page.click(inputSelector);
      await page.fill(inputSelector, question);
      await page.waitForTimeout(1000);

      // 查找发送按钮
      const sendButtonSelectors = [
        'button:has-text("发送")',
        'button:has-text("Send")',
        'button:has-text("按住")',
        'button[class*="send"]',
        'button[class*="Send"]',
        'button[type="submit"]',
        '.send-btn',
        '[data-testid="send-button"]',
        'svg', // 很多平台用SVG图标作为发送按钮
      ];

      let sendButtonFound = false;

      for (const selector of sendButtonSelectors) {
        try {
          const buttons = page.locator(selector).all();
          for (const button of await buttons) {
            if (await button.isVisible({ timeout: 1000 })) {
              await button.click();
              sendButtonFound = true;
              console.log(`豆包：找到发送按钮，使用选择器: ${selector}`);
              break;
            }
          }
          if (sendButtonFound) break;
        } catch {
          continue;
        }
      }

      if (!sendButtonFound) {
        // 如果找不到按钮，尝试按Enter键
        console.log('豆包：未找到发送按钮，尝试按Enter键');
        await page.focus(inputSelector);
        await page.keyboard.press('Enter');
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `豆包提问失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async waitForResponse(page: Page): Promise<void> {
    // 等待回答出现 - 豆包的回答通常在消息容器中
    const responseSelectors = [
      '.ai-message-content',
      '.assistant-message',
      '[class*="assistant"]',
      '[class*="ai-response"]'
    ];

    for (const selector of responseSelectors) {
      try {
        // 等待新消息出现
        await page.waitForSelector(selector, { timeout: 30000, state: 'attached' });
        await page.waitForTimeout(2000); // 等待内容完全加载
        return;
      } catch {
        continue;
      }
    }

    // 如果找不到特定选择器，等待一段时间
    await page.waitForTimeout(5000);
  }

  async extractResponse(page: Page): Promise<string> {
    // 提取回答内容
    const selectors = [
      '.ai-message-content:last-child',
      '.assistant-message:last-child',
      '[class*="assistant"]:last-child',
      'div[class*="message"]:last-child'
    ];

    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          const text = await element.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
        continue;
      }
    }

    return '';
  }

  async extractSources(page: Page): Promise<string[]> {
    // 提取来源链接
    const sources: string[] = [];
    try {
      const links = await page.locator('a[href*="http"]').all();
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href && href.startsWith('http')) {
          sources.push(href);
        }
      }
    } catch {
      // 忽略错误
    }
    return sources;
  }
}

/**
 * 千问平台适配器
 */
export class QianwenAdapter implements PlatformAdapter {
  async askQuestion(page: Page, question: string): Promise<AskResult> {
    try {
      // 千问的输入框选择器
      const inputSelector = 'div[contenteditable="true"], textarea[placeholder*="输入"], .chat-input textarea, #prompt-input';

      await page.waitForSelector(inputSelector, { timeout: 10000 });

      await page.click(inputSelector);
      await page.fill(inputSelector, question);
      await page.waitForTimeout(500);

      // 发送按钮选择器
      const sendButtonSelectors = [
        'button:has-text("发送")',
        '.send-btn',
        'button[class*="send"]',
        'button[type="submit"]'
      ];

      let clicked = false;
      for (const selector of sendButtonSelectors) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            await button.click();
            clicked = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!clicked) {
        await page.press(inputSelector, 'Enter');
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `千问提问失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async waitForResponse(page: Page): Promise<void> {
    const responseSelectors = [
      '.message-content.assistant',
      '[class*="assistant"]',
      '[class*="bot-message"]',
      '.ai-response'
    ];

    for (const selector of responseSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 30000, state: 'attached' });
        await page.waitForTimeout(2000);
        return;
      } catch {
        continue;
      }
    }

    await page.waitForTimeout(5000);
  }

  async extractResponse(page: Page): Promise<string> {
    const selectors = [
      '.message-content.assistant:last-child',
      '[class*="assistant"]:last-child',
      '[class*="bot-message"]:last-child'
    ];

    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          const text = await element.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
        continue;
      }
    }

    return '';
  }

  async extractSources(page: Page): Promise<string[]> {
    const sources: string[] = [];
    try {
      const links = await page.locator('a[href*="http"]').all();
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href && href.startsWith('http')) {
          sources.push(href);
        }
      }
    } catch {
      // 忽略错误
    }
    return sources;
  }
}

/**
 * 文心一言平台适配器
 */
export class YiyanAdapter implements PlatformAdapter {
  async askQuestion(page: Page, question: string): Promise<AskResult> {
    try {
      const inputSelector = 'div[contenteditable="true"], textarea[placeholder*="请输入"], .chat-input textarea, .input-area textarea';

      await page.waitForSelector(inputSelector, { timeout: 10000 });
      await page.click(inputSelector);
      await page.fill(inputSelector, question);
      await page.waitForTimeout(500);

      const sendButtonSelectors = [
        'button:has-text("发送")',
        '.send-btn',
        'button[class*="send"]'
      ];

      let clicked = false;
      for (const selector of sendButtonSelectors) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            await button.click();
            clicked = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!clicked) {
        await page.press(inputSelector, 'Enter');
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `文心一言提问失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async waitForResponse(page: Page): Promise<void> {
    const responseSelectors = [
      '.yc-chat-content',
      '[class*="assistant"]',
      '.bot-message',
      '.ai-response'
    ];

    for (const selector of responseSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 30000, state: 'attached' });
        await page.waitForTimeout(2000);
        return;
      } catch {
        continue;
      }
    }

    await page.waitForTimeout(5000);
  }

  async extractResponse(page: Page): Promise<string> {
    const selectors = [
      '.yc-chat-content:last-child',
      '[class*="assistant"]:last-child',
      '.bot-message:last-child'
    ];

    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          const text = await element.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
        continue;
      }
    }

    return '';
  }

  async extractSources(page: Page): Promise<string[]> {
    const sources: string[] = [];
    try {
      const links = await page.locator('a[href*="http"]').all();
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href && href.startsWith('http')) {
          sources.push(href);
        }
      }
    } catch {
      // 忽略错误
    }
    return sources;
  }
}

/**
 * DeepSeek平台适配器
 */
export class DeepSeekAdapter implements PlatformAdapter {
  async askQuestion(page: Page, question: string): Promise<AskResult> {
    try {
      const inputSelector = 'div[contenteditable="true"], textarea[placeholder*="Message"], textarea[placeholder*="输入"]';

      await page.waitForSelector(inputSelector, { timeout: 10000 });
      await page.click(inputSelector);
      await page.fill(inputSelector, question);
      await page.waitForTimeout(500);

      const sendButtonSelectors = [
        'button[type="submit"]',
        'button:has-text("Send")',
        'button:has-text("发送")'
      ];

      let clicked = false;
      for (const selector of sendButtonSelectors) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            await button.click();
            clicked = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!clicked) {
        await page.press(inputSelector, 'Enter');
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `DeepSeek提问失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async waitForResponse(page: Page): Promise<void> {
    const responseSelectors = [
      '[class*="assistant"]',
      '[class*="ai-message"]',
      '.message.assistant',
      '[class*="response"]'
    ];

    for (const selector of responseSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 30000, state: 'attached' });
        await page.waitForTimeout(2000);
        return;
      } catch {
        continue;
      }
    }

    await page.waitForTimeout(5000);
  }

  async extractResponse(page: Page): Promise<string> {
    const selectors = [
      '[class*="assistant"]:last-child',
      '[class*="ai-message"]:last-child',
      '.message.assistant:last-child'
    ];

    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          const text = await element.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
        continue;
      }
    }

    return '';
  }

  async extractSources(page: Page): Promise<string[]> {
    const sources: string[] = [];
    try {
      const links = await page.locator('a[href*="http"]').all();
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href && href.startsWith('http')) {
          sources.push(href);
        }
      }
    } catch {
      // 忽略错误
    }
    return sources;
  }
}

/**
 * 智谱平台适配器
 */
export class ZhipuAdapter implements PlatformAdapter {
  async askQuestion(page: Page, question: string): Promise<AskResult> {
    try {
      const inputSelector = 'div[contenteditable="true"], textarea[placeholder*="请输入"], .chat-input textarea';

      await page.waitForSelector(inputSelector, { timeout: 10000 });
      await page.click(inputSelector);
      await page.fill(inputSelector, question);
      await page.waitForTimeout(500);

      const sendButtonSelectors = [
        'button:has-text("发送")',
        '.send-btn',
        'button[type="submit"]'
      ];

      let clicked = false;
      for (const selector of sendButtonSelectors) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            await button.click();
            clicked = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!clicked) {
        await page.press(inputSelector, 'Enter');
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `智谱提问失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async waitForResponse(page: Page): Promise<void> {
    const responseSelectors = [
      '[class*="assistant"]',
      '[class*="ai-message"]',
      '.message-content.bot',
      '[class*="chat-response"]'
    ];

    for (const selector of responseSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 30000, state: 'attached' });
        await page.waitForTimeout(2000);
        return;
      } catch {
        continue;
      }
    }

    await page.waitForTimeout(5000);
  }

  async extractResponse(page: Page): Promise<string> {
    const selectors = [
      '[class*="assistant"]:last-child',
      '[class*="ai-message"]:last-child',
      '.message-content.bot:last-child'
    ];

    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          const text = await element.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
        continue;
      }
    }

    return '';
  }

  async extractSources(page: Page): Promise<string[]> {
    const sources: string[] = [];
    try {
      const links = await page.locator('a[href*="http"]').all();
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href && href.startsWith('http')) {
          sources.push(href);
        }
      }
    } catch {
      // 忽略错误
    }
    return sources;
  }
}

/**
 * Kimi平台适配器
 */
export class KimiAdapter implements PlatformAdapter {
  async askQuestion(page: Page, question: string): Promise<AskResult> {
    try {
      const inputSelector = 'div[contenteditable="true"], textarea[placeholder*="输入"], .chat-input textarea, #input';

      await page.waitForSelector(inputSelector, { timeout: 10000 });
      await page.click(inputSelector);
      await page.fill(inputSelector, question);
      await page.waitForTimeout(500);

      const sendButtonSelectors = [
        'button:has-text("发送")',
        'button[type="submit"]',
        '.send-button',
        'button[class*="send"]'
      ];

      let clicked = false;
      for (const selector of sendButtonSelectors) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            await button.click();
            clicked = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!clicked) {
        await page.press(inputSelector, 'Enter');
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Kimi提问失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  async waitForResponse(page: Page): Promise<void> {
    const responseSelectors = [
      '[class*="assistant"]',
      '[class*="ai-message"]',
      '[class*="bot-message"]',
      '[class*="message-content"]'
    ];

    for (const selector of responseSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 30000, state: 'attached' });
        await page.waitForTimeout(2000);
        return;
      } catch {
        continue;
      }
    }

    await page.waitForTimeout(5000);
  }

  async extractResponse(page: Page): Promise<string> {
    const selectors = [
      '[class*="assistant"]:last-child',
      '[class*="ai-message"]:last-child',
      '[class*="bot-message"]:last-child'
    ];

    for (const selector of selectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          const text = await element.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
        continue;
      }
    }

    return '';
  }

  async extractSources(page: Page): Promise<string[]> {
    const sources: string[] = [];
    try {
      const links = await page.locator('a[href*="http"]').all();
      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href && href.startsWith('http')) {
          sources.push(href);
        }
      }
    } catch {
      // 忽略错误
    }
    return sources;
  }
}

/**
 * 平台适配器工厂
 */
export class PlatformAdapterFactory {
  private static adapters: Map<string, PlatformAdapter> = new Map();
  private static nameToIdMap: Map<string, string> = new Map();

  static {
    // 初始化所有适配器，并建立名称到ID的映射
    const platformMapping = [
      { id: 'doubao', names: ['豆包', 'doubao'] },
      { id: 'qianwen', names: ['千问', 'qianwen', '通义千问'] },
      { id: 'yiyan', names: ['文心一言', 'yiyan', '百度'] },
      { id: 'deepseek', names: ['deepseek', 'DeepSeek'] },
      { id: 'zhipu', names: ['智谱', 'zhipu', 'chatglm'] },
      { id: 'kimi', names: ['kimi', 'Kimi', 'moonshot'] },
    ];

    // 创建适配器实例
    this.adapters.set('doubao', new DoubaoAdapter());
    this.adapters.set('qianwen', new QianwenAdapter());
    this.adapters.set('yiyan', new YiyanAdapter());
    this.adapters.set('deepseek', new DeepSeekAdapter());
    this.adapters.set('zhipu', new ZhipuAdapter());
    this.adapters.set('kimi', new KimiAdapter());

    // 建立名称到ID的映射
    for (const mapping of platformMapping) {
      for (const name of mapping.names) {
        this.nameToIdMap.set(name.toLowerCase(), mapping.id);
      }
    }
  }

  /**
   * 通过平台ID获取适配器
   */
  static getAdapter(platformId: string): PlatformAdapter | null {
    return this.adapters.get(platformId) || null;
  }

  /**
   * 通过平台名称获取适配器（支持中文名称）
   */
  static getAdapterByName(platformName: string): PlatformAdapter | null {
    const normalizedId = this.nameToIdMap.get(platformName.toLowerCase());
    if (normalizedId) {
      return this.adapters.get(normalizedId) || null;
    }
    return null;
  }

  /**
   * 获取所有支持的平台ID
   */
  static getSupportedPlatforms(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * 检查平台名称是否支持
   */
  static isPlatformSupported(platformName: string): boolean {
    return this.nameToIdMap.has(platformName.toLowerCase());
  }
}
