import { NextRequest, NextResponse } from 'next/server';
import { callLLM, getAnalysisPrompt } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { response, productInfo } = body;

    // 验证请求参数
    if (!response || !productInfo) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 生成分析提示词
    const prompt = getAnalysisPrompt(
      response,
      productInfo.name,
      productInfo.sellingPoints,
      productInfo.coreContent
    );

    // 调用大模型分析
    const llmResponse = await callLLM({
      messages: [
        { role: 'system', content: '你是一位资深的GEO分析专家。' },
        { role: 'user', content: prompt },
      ],
    });

    // 解析分析结果
    let hasProduct = false;
    let sources: string[] = [];
    let matchedPoints: string[] = [];

    try {
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisResult = JSON.parse(jsonMatch[0]);
        hasProduct = analysisResult.hasProduct || false;
        sources = analysisResult.sources || [];
        matchedPoints = analysisResult.matchedPoints || [];
      }
    } catch (error) {
      // 解析失败，使用简单的关键词匹配
      const responseLower = response.toLowerCase();
      const nameLower = productInfo.name.toLowerCase();
      hasProduct = responseLower.includes(nameLower);

      // 检查卖点
      if (productInfo.sellingPoints) {
        const points = productInfo.sellingPoints.split('\n');
        matchedPoints = points
          .filter(point => responseLower.includes(point.toLowerCase()))
          .slice(0, 5);
      }
    }

    const result = {
      hasProduct,
      sources: sources.map((url: string) => ({ url })),
      matchedPoints,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('分析错误:', error);

    // 如果大模型调用失败，返回简单的关键词匹配结果
    try {
      const body = await request.json();
      const { response, productInfo } = body;

      const responseLower = response.toLowerCase();
      const nameLower = productInfo.name.toLowerCase();
      const hasProduct = responseLower.includes(nameLower);

      let matchedPoints: string[] = [];
      if (productInfo.sellingPoints) {
        const points = productInfo.sellingPoints.split('\n');
        matchedPoints = points
          .filter(point => responseLower.includes(point.toLowerCase()))
          .slice(0, 5);
      }

      return NextResponse.json({
        hasProduct,
        sources: [],
        matchedPoints,
      });
    } catch (fallbackError) {
      return NextResponse.json(
        { error: `分析失败: ${error}` },
        { status: 500 }
      );
    }
  }
}
