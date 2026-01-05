import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { askQuestion } from '@/lib/playwright';
import type { AskQuestionRequest, AskQuestionResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: AskQuestionRequest = await request.json();
    const { questionId, platformIds } = body;

    // 验证请求参数
    if (!questionId || !platformIds || platformIds.length === 0) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取问题信息
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { product: true },
    });

    if (!question) {
      return NextResponse.json(
        { error: '问题不存在' },
        { status: 404 }
      );
    }

    const results = [];

    // 在每个平台上提问
    for (const platformId of platformIds) {
      try {
        const result = await askQuestion(platformId, question.text);

        if (result.success && result.response) {
          // 保存查询结果
          const query = await prisma.query.create({
            data: {
              questionId,
              platformId,
              response: result.response,
              sources: result.sources ? JSON.stringify(result.sources) : null,
            },
          });

          results.push({
            id: query.id,
            platformId,
            response: result.response,
            sources: result.sources || [],
          });
        } else {
          results.push({
            platformId,
            error: result.error || '提问失败',
          });
        }

        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        results.push({
          platformId,
          error: `提问失败: ${error}`,
        });
      }
    }

    const response: AskQuestionResponse = {
      results: results as any,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('提问错误:', error);
    return NextResponse.json(
      { error: `提问失败: ${error}` },
      { status: 500 }
    );
  }
}

// 获取某个问题的所有查询结果
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

    const queries = await prisma.query.findMany({
      where: { questionId },
      include: { platform: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ queries });
  } catch (error) {
    console.error('获取查询结果错误:', error);
    return NextResponse.json(
      { error: `获取查询结果失败: ${error}` },
      { status: 500 }
    );
  }
}
