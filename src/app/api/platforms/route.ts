import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 支持的平台列表
const SUPPORTED_PLATFORMS = [
  { id: 'doubao', name: '豆包', url: 'https://www.doubao.com' },
  { id: 'qianwen', name: '千问', url: 'https://www.qianwen.com' },
  { id: 'yiyan', name: '文心一言', url: 'https://yiyan.baidu.com' },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://www.deepseek.com' },
  { id: 'zhipu', name: '智谱', url: 'https://chatglm.cn' },
  { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn' },
];

// 初始化平台数据
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'initialize') {
      // 直接在API中初始化平台
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
      return NextResponse.json({ success: true, message: '平台初始化成功' });
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

// 获取所有平台
export async function GET() {
  try {
    const platforms = await prisma.platform.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ platforms });
  } catch (error) {
    console.error('获取平台错误:', error);
    return NextResponse.json(
      { error: `获取平台失败: ${error}` },
      { status: 500 }
    );
  }
}
