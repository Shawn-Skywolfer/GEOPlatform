import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      // 简化方案：直接将平台标记为已登录
      // 用户在实际使用时需要手动在浏览器中登录对应平台
      // 系统使用此状态来启用自动提问功能
      await prisma.platform.update({
        where: { id: platformId },
        data: {
          isLoggedIn: true,
          sessionData: JSON.stringify({ loggedInAt: new Date().toISOString() }),
        },
      });

      return NextResponse.json({
        success: true,
        message: '平台已标记为已登录。注意：实际使用时请确保您已在浏览器中登录该平台。',
      });
    }

    if (action === 'logout') {
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
