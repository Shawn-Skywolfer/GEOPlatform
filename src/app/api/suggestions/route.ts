import { NextRequest, NextResponse } from 'next/server';
import { callLLM, getSuggestionsPrompt } from '@/lib/llm';
import type { SuggestionsRequest, SuggestionsResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: SuggestionsRequest = await request.json();
    const { analysisData } = body;

    // 验证请求参数
    if (!analysisData) {
      return NextResponse.json(
        { error: '缺少分析数据' },
        { status: 400 }
      );
    }

    // 生成建议提示词
    const prompt = getSuggestionsPrompt(analysisData);

    // 调用大模型生成建议
    const response = await callLLM({
      messages: [
        { role: 'system', content: '你是一位资深的GEO（大模型应用引擎优化）专家。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
    });

    // 解析建议（按行或按段落分割）
    const suggestions = response
      .split(/\n\n|\n/)
      .filter(line => line.trim())
      .map(line => line.trim())
      .filter(line =>
        line.includes('建议') ||
        line.includes('优化') ||
        line.includes('策略') ||
        line.length > 20
      )
      .slice(0, 10);

    const result: SuggestionsResponse = {
      suggestions: suggestions.length > 0 ? suggestions : [
        '建议增加高质量内容的发布频率',
        '优化关键词布局，提高在各大平台的曝光度',
        '与行业权威网站合作，提升品牌可信度',
      ],
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('生成建议错误:', error);
    return NextResponse.json(
      { error: `生成建议失败: ${error}` },
      { status: 500 }
    );
  }
}
