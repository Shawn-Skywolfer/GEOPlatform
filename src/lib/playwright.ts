// Playwright浏览器自动化库
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { prisma } from '@/lib/prisma';
import type { Platform } from '@/types';

// 浏览器实例管理
let browser: Browser | null = null;
const contexts = new Map<string, BrowserContext>();

/**
 * 获取或创建浏览器实例
 */
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: false, // 设置为true可以无头模式运行
    });
  }
  return browser;
}

/**
 * 获取平台的浏览器上下文
 */
async function getPlatformContext(platform: Platform): Promise<BrowserContext> {
  // 如果已有上下文，先关闭
  if (contexts.has(platform.id)) {
    const existingContext = contexts.get(platform.id)!;
    if (!existingContext.pages().length) {
      await existingContext.close();
      contexts.delete(platform.id);
    } else {
      return existingContext;
    }
  }

  // 创建新上下文
  const browser = await getBrowser();
  let context: BrowserContext;

  // 如果有保存的会话数据，恢复会话
  if (platform.sessionData) {
    const cookies = JSON.parse(platform.sessionData);
    context = await browser.newContext({ storageState: { cookies, origins: [] } });
  } else {
    context = await browser.newContext();
  }

  contexts.set(platform.id, context);
  return context;
}

/**
 * 保存平台会话数据
 */
async function savePlatformSession(platformId: string, context: BrowserContext): Promise<void> {
  const cookies = await context.cookies();
  const sessionData = JSON.stringify(cookies);

  await prisma.platform.update({
    where: { id: platformId },
    data: { sessionData },
  });
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
 * 在平台上提问
 */
export async function askQuestion(
  platformId: string,
  question: string
): Promise<{ success: boolean; response?: string; sources?: string[]; error?: string }> {
  try {
    const platform = await prisma.platform.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      return { success: false, error: '平台不存在' };
    }

    if (!platform.isLoggedIn) {
      return { success: false, error: '平台未登录' };
    }

    const context = await getPlatformContext(platform);
    const page = await context.newPage();

    await page.goto(platform.url);

    // 这里需要根据不同平台的具体页面结构来实现
    // 以下是一个通用的示例流程，实际需要针对每个平台定制

    // 1. 找到输入框
    // 2. 输入问题
    // 3. 点击发送按钮
    // 4. 等待回答
    // 5. 提取回答内容和来源链接

    // 由于每个平台的DOM结构都不同，这里提供一个简化的示例
    // 实际实现需要针对每个平台编写特定的选择器和逻辑

    // 通用等待（给AI一些时间生成回答）
    await page.waitForTimeout(10000);

    // 提取回答（这需要根据实际页面结构调整选择器）
    const responseElement = await page.locator('div.ai-response, .answer, .chat-message').first();
    const response = await responseElement.textContent() || '';

    // 提取来源链接
    const sourceLinks = await page.locator('a.source-link, .reference a').allTextContents();
    const sources = sourceLinks.map(link => link.trim()).filter(Boolean);

    // 保存会话
    await savePlatformSession(platformId, context);

    await page.close();

    return {
      success: true,
      response,
      sources,
    };
  } catch (error) {
    console.error('提问错误:', error);
    return { success: false, error: `提问失败: ${error}` };
  }
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
