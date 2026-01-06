import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { askQuestion } from '@/lib/playwright';
import { callLLM, getAnalysisPrompt } from '@/lib/llm';

/**
 * 自动分析流程 - 支持实时进度反馈
 * 使用Server-Sent Events (SSE)发送进度更新
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // 创建SSE流式响应
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await request.json();
        const { questionId, platformIds } = body;

        // 验证请求参数
        if (!questionId || !platformIds || platformIds.length === 0) {
          sendEvent({ type: 'error', message: '缺少必要参数' });
          controller.close();
          return;
        }

        // 发送开始事件
        sendEvent({
          type: 'started',
          message: '开始自动分析',
          total: platformIds.length,
        });

        // 获取问题信息
        const question = await prisma.question.findUnique({
          where: { id: questionId },
          include: { product: true },
        });

        if (!question) {
          sendEvent({ type: 'error', message: '问题不存在' });
          controller.close();
          return;
        }

        const results = [];
        let completedCount = 0;
        let failedCount = 0;

        // 在每个平台上提问并分析
        for (let i = 0; i < platformIds.length; i++) {
          const platformId = platformIds[i];

          try {
            // 发送进度更新
            sendEvent({
              type: 'progress',
              step: 'asking',
              platformIndex: i,
              platformId,
              message: `正在 ${platformId} 提问...`,
            });

            // 获取平台信息
            const platform = await prisma.platform.findUnique({
              where: { id: platformId },
            });

            if (!platform) {
              results.push({
                platformId,
                platformName: '未知平台',
                error: '平台不存在',
              });
              failedCount++;
              continue;
            }

            // 发送平台名称
            sendEvent({
              type: 'progress',
              step: 'asking',
              platformIndex: i,
              platformId,
              platformName: platform.name,
              message: `正在 "${platform.name}" 提问...`,
            });

            // 在平台上提问
            const askResult = await askQuestion(platformId, question.text);

            if (!askResult.success) {
              results.push({
                platformId,
                platformName: platform.name,
                error: askResult.error || '提问失败',
              });
              failedCount++;

              sendEvent({
                type: 'progress',
                step: 'failed',
                platformIndex: i,
                platformId,
                platformName: platform.name,
                message: `"${platform.name}" 提问失败`,
                error: askResult.error,
              });

              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }

            // 发送正在分析事件
            sendEvent({
              type: 'progress',
              step: 'analyzing',
              platformIndex: i,
              platformId,
              platformName: platform.name,
              message: `正在分析 "${platform.name}" 的回答...`,
            });

            // 分析回答
            let hasProduct = false;
            let sources: string[] = [];
            let matchedPoints: string[] = [];

            if (askResult.response) {
              try {
                // 生成分析提示词
                const prompt = getAnalysisPrompt(
                  askResult.response,
                  question.product.name,
                  question.product.sellingPoints,
                  question.product.coreContent
                );

                // 调用大模型分析
                const llmResponse = await callLLM({
                  messages: [
                    { role: 'system', content: '你是一位资深的GEO分析专家。' },
                    { role: 'user', content: prompt },
                  ],
                });

                // 解析分析结果
                try {
                  const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    const analysisResult = JSON.parse(jsonMatch[0]);
                    hasProduct = analysisResult.hasProduct || false;
                    sources = analysisResult.sources || [];
                    matchedPoints = analysisResult.matchedPoints || [];
                  }
                } catch {
                  // 解析失败，使用简单的关键词匹配
                  const responseLower = askResult.response.toLowerCase();
                  const nameLower = question.product.name.toLowerCase();
                  hasProduct = responseLower.includes(nameLower);

                  if (question.product.sellingPoints) {
                    const points = question.product.sellingPoints.split('\n');
                    matchedPoints = points
                      .filter((point: string) => responseLower.includes(point.toLowerCase()))
                      .slice(0, 5);
                  }
                }
              } catch (llmError) {
                // 如果大模型调用失败，使用简单的关键词匹配
                const responseLower = askResult.response.toLowerCase();
                const nameLower = question.product.name.toLowerCase();
                hasProduct = responseLower.includes(nameLower);

                if (question.product.sellingPoints) {
                  const points = question.product.sellingPoints.split('\n');
                  matchedPoints = points
                    .filter((point: string) => responseLower.includes(point.toLowerCase()))
                    .slice(0, 5);
                }
              }
            }

            // 保存查询结果到数据库
            const query = await prisma.query.create({
              data: {
                questionId,
                platformId,
                response: askResult.response || '',
                hasProduct,
                sources: sources.length > 0 ? JSON.stringify(sources) : null,
              },
            });

            results.push({
              id: query.id,
              platformId,
              platformName: platform.name,
              response: askResult.response,
              hasProduct,
              sources: sources.map((url: string) => ({ url })),
              matchedPoints,
            });

            completedCount++;

            // 发送完成事件
            sendEvent({
              type: 'progress',
              step: 'completed',
              platformIndex: i,
              platformId,
              platformName: platform.name,
              message: `"${platform.name}" 分析完成`,
              result: {
                platformId,
                platformName: platform.name,
                hasProduct,
              },
            });

            // 添加延迟避免请求过快
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`平台 ${platformId} 处理错误:`, error);
            results.push({
              platformId,
              error: `处理失败: ${error instanceof Error ? error.message : String(error)}`,
            });
            failedCount++;

            sendEvent({
              type: 'progress',
              step: 'error',
              platformIndex: i,
              platformId,
              message: `平台 ${platformId} 处理出错`,
              error: String(error),
            });
          }
        }

        // 发送最终结果
        sendEvent({
          type: 'complete',
          message: '所有平台分析完成',
          results,
          summary: {
            total: platformIds.length,
            completed: completedCount,
            failed: failedCount,
            hasProductCount: results.filter((r: any) => r.hasProduct).length,
          },
        });

        controller.close();
      } catch (error) {
        console.error('自动分析错误:', error);
        sendEvent({
          type: 'error',
          message: `自动分析失败: ${error instanceof Error ? error.message : String(error)}`,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
