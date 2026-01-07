// Playwright浏览器自动化库
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { prisma } from '@/lib/prisma';
import { PlatformAdapterFactory } from '@/lib/platform-adapters';
import type { Platform } from '@/types';

// 浏览器实例管理
let browser: Browser | null = null;
const contexts = new Map<string, BrowserContext>();

/**
 * 获取或创建浏览器实例
 */
export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });
  }
  return browser;
}

/**
 * 获取默认的浏览器上下文配置
 */
function getDefaultContextOptions() {
  return {
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    permissions: ['geolocation', 'notifications'],
    bypassCSP: true,
    ignoreHTTPSErrors: true,
  };
}

/**
 * 获取平台的浏览器上下文
 */
async function getPlatformContext(platform: Platform): Promise<BrowserContext> {
  // 如果已有上下文，先检查是否可用
  if (contexts.has(platform.id)) {
    const existingContext = contexts.get(platform.id)!;
    if (existingContext.pages().length > 0) {
      return existingContext;
    }
    // 如果没有页面了，关闭并重新创建
    await existingContext.close();
    contexts.delete(platform.id);
  }

  // 创建新上下文
  const browser = await getBrowser();
  const defaultOptions = getDefaultContextOptions();
  let context: BrowserContext;

  // 如果有保存的会话数据，恢复会话
  if (platform.sessionData) {
    try {
      const parsed = JSON.parse(platform.sessionData);

      // 检查数据格式
      let storageState;

      if (Array.isArray(parsed)) {
        // 旧格式：纯 cookies 数组
        storageState = { cookies: parsed, origins: [] };
      } else if (parsed && typeof parsed === 'object' && 'cookies' in parsed) {
        // 新格式：完整的 storageState 对象
        storageState = parsed;
      } else {
        // 未知格式，创建新上下文
        console.warn('未知的会话数据格式，创建新上下文');
        storageState = null;
      }

      if (storageState) {
        context = await browser.newContext({
          ...defaultOptions,
          storageState,
        });
      } else {
        context = await browser.newContext(defaultOptions);
      }
    } catch (error) {
      console.error('恢复会话失败，创建新上下文:', error);
      context = await browser.newContext(defaultOptions);
    }
  } else {
    context = await browser.newContext(defaultOptions);
  }

  // 隐藏webdriver特征
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  contexts.set(platform.id, context);
  return context;
}

/**
 * 保存平台会话数据
 */
async function savePlatformSession(platformId: string, context: BrowserContext): Promise<void> {
  try {
    // 获取完整的 storageState
    const storageState = await context.storageState();

    // 保存为 JSON 字符串
    const sessionData = JSON.stringify(storageState);

    await prisma.platform.update({
      where: { id: platformId },
      data: { sessionData },
    });
  } catch (error) {
    console.error('保存会话失败:', error);
  }
}

/**
 * 平台登录
 * 注意：这个函数会打开浏览器，用户需要手动完成登录过程
 */
export async function loginPlatform(platformId: string): Promise<{ success: boolean; message: string }> {
  try {
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      return { success: false, message: '平台不存在' };
    }

    const context = await getPlatformContext(platform);
    const page = await context.newPage();

    await page.goto(platform.url);

    // 等待用户手动登录（在实际部署中可能需要更复杂的自动化登录逻辑）
    // 这里我们等待页面URL变化或特定元素出现来判断登录成功

    // 简化版本：等待30秒让用户手动登录
    await page.waitForTimeout(30000);

    // 保存会话
    await savePlatformSession(platformId, context);

    // 更新登录状态
    await prisma.platform.update({
      where: { id: platformId },
      data: { isLoggedIn: true },
    });

    await page.close();

    return { success: true, message: '登录成功' };
  } catch (error) {
    console.error('平台登录错误:', error);
    return { success: false, message: `登录失败: ${error}` };
  }
}

/**
 * 打开平台浏览器让用户登录（两步流程：第一步）
 * 这个函数会打开浏览器后立即返回，不等待用户登录完成
 */
export async function openPlatformBrowser(platformId: string): Promise<{ success: boolean; message: string; browserOpened?: boolean }> {
  try {
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      return { success: false, message: '平台不存在' };
    }

    const context = await getPlatformContext(platform);
    const page = await context.newPage();

    await page.goto(platform.url);

    // 不等待登录完成，立即返回
    // 保持页面打开，让用户在浏览器中手动登录

    return {
      success: true,
      message: `已打开${platform.name}的登录页面，请在浏览器中完成登录。登录完成后，请返回平台管理界面点击"确认登录完成"按钮。`,
      browserOpened: true
    };
  } catch (error) {
    console.error('打开浏览器错误:', error);
    return { success: false, message: `打开浏览器失败: ${error}` };
  }
}

/**
 * 确认平台登录完成（两步流程：第二步）
 * 保存当前浏览器会话到数据库
 */
export async function confirmPlatformLogin(platformId: string): Promise<{ success: boolean; message: string }> {
  try {
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      return { success: false, message: '平台不存在' };
    }

    // 获取当前平台的浏览器上下文
    const context = await getPlatformContext(platform);

    // 保存会话
    await savePlatformSession(platformId, context);

    // 更新登录状态
    await prisma.platform.update({
      where: { id: platformId },
      data: { isLoggedIn: true },
    });

    // 关闭所有打开的页面
    const pages = context.pages();
    for (const page of pages) {
      await page.close();
    }

    return { success: true, message: '登录会话已保存成功' };
  } catch (error) {
    console.error('保存登录会话错误:', error);
    return { success: false, message: `保存会话失败: ${error}` };
  }
}

/**
 * 在平台上提问
 */
export async function askQuestion(
  platformId: string,
  question: string
): Promise<{ success: boolean; response?: string; sources?: string[]; error?: string }> {
  let page: Page | null = null;

  try {
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      return { success: false, error: '平台不存在' };
    }

    if (!platform.isLoggedIn) {
      return { success: false, error: '平台未登录，请先登录' };
    }

    // 获取平台适配器（通过平台名称匹配）
    const adapter = PlatformAdapterFactory.getAdapterByName(platform.name);
    if (!adapter) {
      return { success: false, error: `平台 "${platform.name}" 暂不支持自动提问` };
    }

    const context = await getPlatformContext(platform);
    page = await context.newPage();

    // 导航到平台（使用domcontentloaded而不是networkidle来避免超时）
    await page.goto(platform.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000); // 等待页面加载完成

    // 记录当前消息数量（用于判断新回答）
    const initialMessageCount = await page.locator('[class*="message"], [class*="chat"], [class*="conversation"]').count();

    // 使用适配器提问
    const askResult = await adapter.askQuestion(page, question);

    if (!askResult.success) {
      return { success: false, error: askResult.error };
    }

    // 等待回答生成
    await adapter.waitForResponse(page);
    await page.waitForTimeout(3000); // 额外等待确保内容完全加载

    // 尝试从适配器提取回答（如果支持）
    let response = '';
    let sources: string[] = [];

    // 尝试从不同的适配器方法提取回答
    if ('extractResponse' in adapter && typeof adapter.extractResponse === 'function') {
      try {
        response = await (adapter as any).extractResponse(page);
      } catch {
        // 忽略错误，使用备用方法
      }
    }

    // 如果没有提取到回答，使用通用方法
    if (!response) {
      response = await extractResponseGeneric(page, initialMessageCount);
    }

    // 提取来源链接
    if ('extractSources' in adapter && typeof adapter.extractSources === 'function') {
      try {
        sources = await (adapter as any).extractSources(page);
      } catch {
        // 忽略错误
      }
    }

    if (!sources.length) {
      sources = await extractSourcesGeneric(page);
    }

    // 保存会话
    await savePlatformSession(platformId, context);

    await page.close();

    return {
      success: true,
      response,
      sources,
    };
  } catch (error) {
    if (page) {
      try {
        await page.close();
      } catch {
        // 忽略关闭错误
      }
    }
    console.error('提问错误:', error);
    return { success: false, error: `提问失败: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 通用回答提取方法
 * 只提取提问后新出现的回答，避免包含历史对话
 */
async function extractResponseGeneric(page: Page, initialMessageCount: number): Promise<string> {
  const selectors = [
    '[class*="assistant"]',
    '[class*="ai-message"]',
    '[class*="bot-message"]',
    '[class*="message-content"]',
    '.markdown-body',
    '[class*="chat-response"]',
  ];

  for (const selector of selectors) {
    try {
      const elements = await page.locator(selector).all();
      // 只获取新出现的消息（超过初始数量的部分）
      const newElements = elements.slice(initialMessageCount);

      if (newElements.length > 0) {
        // 获取最新的一条消息
        const newestElement = newElements[newElements.length - 1];
        const text = await newestElement.textContent();

        if (text && text.trim() && text.trim().length > 10) {
          return text.trim();
        }
      }
    } catch {
      continue;
    }
  }

  // 如果上述方法都失败，尝试获取页面文本
  try {
    const bodyText = await page.locator('body').textContent();
    return bodyText?.slice(-1000).trim() || '';
  } catch {
    return '';
  }
}

/**
 * 通用来源链接提取方法
 */
async function extractSourcesGeneric(page: Page): Promise<string[]> {
  const sources: string[] = [];
  try {
    // 查找所有可能的外部链接
    const links = await page.locator('a[href*="http"]').all();
    for (const link of links) {
      try {
        const href = await link.getAttribute('href');
        if (href && href.startsWith('http') && !href.includes('localhost')) {
          // 避免重复
          if (!sources.includes(href)) {
            sources.push(href);
          }
        }
      } catch {
        continue;
      }
    }
  } catch {
    // 忽略错误
  }
  return sources.slice(0, 10); // 最多返回10个链接
}

/**
 * 登出平台
 */
export async function logoutPlatform(platformId: string): Promise<{ success: boolean; message: string }> {
  try {
    // 关闭上下文
    if (contexts.has(platformId)) {
      const context = contexts.get(platformId)!;
      await context.close();
      contexts.delete(platformId);
    }

    // 清除会话数据
    await prisma.platform.update({
      where: { id: platformId },
      data: {
        isLoggedIn: false,
        sessionData: null,
      },
    });

    return { success: true, message: '登出成功' };
  } catch (error) {
    console.error('登出错误:', error);
    return { success: false, message: `登出失败: ${error}` };
  }
}

/**
 * 关闭所有浏览器实例
 */
export async function closeAllBrowsers(): Promise<void> {
  for (const [platformId, context] of contexts.entries()) {
    await context.close();
  }
  contexts.clear();

  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * 初始化平台数据
 */
export async function initializePlatforms(): Promise<void> {
  const { SUPPORTED_PLATFORMS } = await import('@/types');

  for (const platform of SUPPORTED_PLATFORMS) {
    const existing = await prisma.platform.findFirst({
      where: { name: platform.name },
    });

    if (!existing) {
      await prisma.platform.create({
        data: {
          name: platform.name,
          url: platform.url,
          isLoggedIn: false,
        },
      });
    }
  }
}

/**
 * 检查平台会话是否有效
 */
export async function checkPlatformSession(platformId: string): Promise<boolean> {
  try {
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    if (!platform || !platform.isLoggedIn || !platform.sessionData) {
      return false;
    }

    const context = await getPlatformContext(platform);
    const page = await context.newPage();
    await page.goto(platform.url);

    // 检查是否仍在登录状态（需要根据实际页面调整）
    const isLoggedIn = await page.locator('.user-avatar, .logout-button, .user-menu').count() > 0;

    await page.close();

    if (!isLoggedIn) {
      // 会话失效，更新数据库
      await prisma.platform.update({
        where: { id: platformId },
        data: { isLoggedIn: false },
      });
    }

    return isLoggedIn;
  } catch (error) {
    console.error('检查会话错误:', error);
    return false;
  }
}
