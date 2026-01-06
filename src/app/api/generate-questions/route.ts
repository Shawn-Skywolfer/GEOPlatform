import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callLLM, getQuestionGenerationPrompt } from '@/lib/llm';
import type { GenerateQuestionsRequest, GenerateQuestionsResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: GenerateQuestionsRequest & { customPrompt?: string } = await request.json();
    const { targetAudience, productName, sellingPoints, coreContent, customPrompt } = body;

    // 验证请求参数
    if (!targetAudience || !productName || !sellingPoints || !coreContent) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 生成提示词（使用自定义Prompt或默认Prompt）
    let prompt: string;

    if (customPrompt) {
      // 使用自定义Prompt模板，替换变量
      prompt = customPrompt
        .replace(/\{\{targetAudience\}\}/g, targetAudience)
        .replace(/\{\{productName\}\}/g, productName)
        .replace(/\{\{sellingPoints\}\}/g, sellingPoints)
        .replace(/\{\{coreContent\}\}/g, coreContent);
    } else {
      // 使用默认Prompt生成函数
      prompt = getQuestionGenerationPrompt(
        targetAudience,
        productName,
        sellingPoints,
        coreContent
      );
    }

    // 调用大模型生成问题
    const response = await callLLM({
      messages: [
        { role: 'system', content: '你是一位资深的GEO（大模型应用引擎优化）专家。' },
        { role: 'user', content: prompt },
      ],
    });

    // 解析响应（尝试提取JSON数组）
    let questions: string[] = [];
    try {
      // 尝试直接解析JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        // 如果没有找到JSON，按行分割
        questions = response
          .split('\n')
          .filter(line => line.trim())
          .map(line => line.replace(/^\d+\.\s*/, '').replace(/^['"]|['"]$/g, '').trim())
          .slice(0, 3);
      }
    } catch (error) {
      // 解析失败，使用备用方案
      questions = response
        .split('\n')
        .filter(line => line.trim() && (line.includes('?') || line.includes('？')))
        .slice(0, 3);
    }

    // 确保至少有3个问题
    while (questions.length < 3) {
      questions.push(`${targetAudience}如何选择${productName}？`);
    }

    // 保存产品信息
    const product = await prisma.product.create({
      data: {
        name: productName,
        targetAudience,
        sellingPoints,
        coreContent,
      },
    });

    // 保存生成的问题
    for (const questionText of questions.slice(0, 3)) {
      await prisma.question.create({
        data: {
          productId: product.id,
          text: questionText,
        },
      });
    }

    const result: GenerateQuestionsResponse = {
      questions: questions.slice(0, 3),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('问题生成错误:', error);
    return NextResponse.json(
      { error: `问题生成失败: ${error}` },
      { status: 500 }
    );
  }
}

// 获取所有产品及其问题
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        questions: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('获取产品错误:', error);
    return NextResponse.json(
      { error: `获取产品失败: ${error}` },
      { status: 500 }
    );
  }
}
