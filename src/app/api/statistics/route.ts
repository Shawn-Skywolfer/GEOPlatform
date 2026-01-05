import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { StatisticsResponse, PlatformStats, SourceInfo } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json(
        { error: '缺少问题ID' },
        { status: 400 }
      );
    }

    // 获取该问题的所有查询结果
    const queries = await prisma.query.findMany({
      where: { questionId },
      include: { platform: true },
    });

    if (queries.length === 0) {
      return NextResponse.json({
        adoptionRate: 0,
        platformStats: [],
        topSources: [],
      } as StatisticsResponse);
    }

    // 计算整体采信率
    const mentionedCount = queries.filter(q => q.hasProduct).length;
    const adoptionRate = (mentionedCount / queries.length) * 100;

    // 计算各平台统计数据
    const platformMap = new Map<string, PlatformStats>();

    for (const query of queries) {
      const existing = platformMap.get(query.platformId);
      const isMentioned = query.hasProduct ? 1 : 0;

      if (existing) {
        existing.totalQueries++;
        existing.mentionedCount += isMentioned;
        existing.adoptionRate = (existing.mentionedCount / existing.totalQueries) * 100;
      } else {
        platformMap.set(query.platformId, {
          platformId: query.platformId,
          platformName: query.platform.name,
          totalQueries: 1,
          mentionedCount: isMentioned,
          adoptionRate: isMentioned * 100,
        });
      }
    }

    const platformStats = Array.from(platformMap.values());

    // 提取所有来源
    const sourcesMap = new Map<string, number>();

    for (const query of queries) {
      if (query.sources) {
        try {
          const sources = JSON.parse(query.sources) as string[];
          for (const source of sources) {
            const count = sourcesMap.get(source) || 0;
            sourcesMap.set(source, count + 1);
          }
        } catch (error) {
          console.error('解析来源失败:', error);
        }
      }
    }

    // 按出现频率排序，取前10
    const topSources: SourceInfo[] = Array.from(sourcesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([url]) => ({ url }));

    // 保存分析结果
    await prisma.analysis.create({
      data: {
        totalQueries: queries.length,
        mentionedCount,
        adoptionRate,
        topSources: JSON.stringify(topSources),
      },
    });

    const result: StatisticsResponse = {
      adoptionRate: Math.round(adoptionRate * 100) / 100,
      platformStats,
      topSources,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('统计错误:', error);
    return NextResponse.json(
      { error: `统计失败: ${error}` },
      { status: 500 }
    );
  }
}

// 获取历史分析记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { limit = 10 } = body;

    const analyses = await prisma.analysis.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ analyses });
  } catch (error) {
    console.error('获取分析记录错误:', error);
    return NextResponse.json(
      { error: `获取分析记录失败: ${error}` },
      { status: 500 }
    );
  }
}
