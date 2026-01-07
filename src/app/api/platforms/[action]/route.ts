import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { loginPlatform as playwrightLoginPlatform, logoutPlatform as playwrightLogoutPlatform, openPlatformBrowser, confirmPlatformLogin } from '@/lib/playwright';

// 平台登录/登出操作
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    const body = await request.json();
    const { platformId } = body;

    if (!platformId) {
      return NextResponse.json(
        { error: '缺少平台ID' },
        { status: 400 }
      );
    }

    if (action === 'login') {
      // 使用Playwright打开浏览器让用户登录
      const result = await openPlatformBrowser(platformId);
      return NextResponse.json(result);
    }

    if (action === 'confirm-login') {
      // 用户确认登录完成，保存会话
      const result = await confirmPlatformLogin(platformId);
      return NextResponse.json(result);
    }

    if (action === 'logout') {
      // 先清除Playwright的会话
      await playwrightLogoutPlatform(platformId);

      // 再清除数据库中的登录状态
      await prisma.platform.update({
        where: { id: platformId },
        data: {
          isLoggedIn: false,
          sessionData: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: '登出成功',
      });
    }

    if (action === 'check') {
      const platform = await prisma.platform.findUnique({
        where: { id: platformId },
      });

      return NextResponse.json({
        isValid: platform?.isLoggedIn || false,
      });
    }

    return NextResponse.json(
      { error: '无效的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('平台操作错误:', error);
    return NextResponse.json(
      { error: `操作失败: ${error}` },
      { status: 500 }
    );
  }
}
