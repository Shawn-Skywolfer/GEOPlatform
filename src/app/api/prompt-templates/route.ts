import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 获取所有Prompt模板
export async function GET() {
  try {
    const templates = await prisma.promptTemplate.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('获取Prompt模板失败:', error);
    return NextResponse.json(
      { error: '获取Prompt模板失败' },
      { status: 500 }
    );
  }
}

// 创建或更新Prompt模板
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, displayName, description, template, variables } = body;

    if (!name || !displayName || !template) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 尝试查找现有模板
    const existing = await prisma.promptTemplate.findUnique({
      where: { name },
    });

    let result;

    if (existing) {
      // 更新现有模板
      result = await prisma.promptTemplate.update({
        where: { name },
        data: {
          displayName,
          description,
          template,
          variables: variables ? JSON.stringify(variables) : null,
        },
      });
    } else {
      // 创建新模板
      result = await prisma.promptTemplate.create({
        data: {
          name,
          displayName,
          description,
          template,
          variables: variables ? JSON.stringify(variables) : null,
        },
      });
    }

    return NextResponse.json({ template: result });
  } catch (error) {
    console.error('保存Prompt模板失败:', error);
    return NextResponse.json(
      { error: '保存Prompt模板失败' },
      { status: 500 }
    );
  }
}
