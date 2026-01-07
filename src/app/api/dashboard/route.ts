import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 获取产品数量
    const productsCount = await prisma.product.count();

    // 获取问题数量
    const questionsCount = await prisma.question.count();

    // 获取分析数量
    const analysesCount = await prisma.analysis.count();

    // 获取查询数量
    const queriesCount = await prisma.query.count();

    // 获取平台数量和已登录平台数量
    const platformsCount = await prisma.platform.count();
    const loggedInPlatformsCount = await prisma.platform.count({
      where: { isLoggedIn: true },
    });

    // 获取最近查询记录（最多10条）
    const recentQueries = await prisma.query.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        question: {
          include: {
            product: true,
          },
        },
        platform: true,
      },
    });

    // 格式化最近查询数据
    const formattedQueries = recentQueries.map((query) => ({
      id: query.id,
      platformName: query.platform.name,
      questionText: query.question.text,
      hasProduct: query.hasProduct,
      createdAt: query.createdAt.toISOString(),
    }));

    return NextResponse.json({
      productsCount,
      questionsCount,
      analysesCount,
      queriesCount,
      platformsCount,
      loggedInPlatformsCount,
      recentQueries: formattedQueries,
    });
  } catch (error) {
    console.error('获取仪表板数据失败:', error);
    return NextResponse.json(
      { error: '获取仪表板数据失败' },
      { status: 500 }
    );
  }
}
