import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 更新问题内容
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionId, text } = body;

    if (!questionId || text === undefined) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const question = await prisma.question.update({
      where: { id: questionId },
      data: { text },
    });

    return NextResponse.json({ question });
  } catch (error) {
    console.error('更新问题失败:', error);
    return NextResponse.json(
      { error: '更新问题失败' },
      { status: 500 }
    );
  }
}
