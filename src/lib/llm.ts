// 大模型API调用库
import type { Settings } from '@/types';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

/**
 * 获取当前LLM设置
 */
async function getSettings(): Promise<Settings> {
  const { prisma } = await import('@/lib/prisma');
  let settings = await prisma.settings.findFirst();

  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        llmApiUrl: process.env.LLM_API_URL || 'https://api.openai.com/v1',
        llmModel: process.env.LLM_MODEL || 'gpt-3.5-turbo',
      },
    });
  }

  return settings;
}

/**
 * 调用大模型API
 */
export async function callLLM(request: LLMRequest): Promise<string> {
  const settings = await getSettings();
  const apiUrl = settings.llmApiUrl;
  const apiKey = settings.llmApiKey || process.env.LLM_API_KEY;

  if (!apiKey) {
    throw new Error('LLM API密钥未配置，请在设置中配置或设置环境变量LLM_API_KEY');
  }

  const url = `${apiUrl.replace(/\/$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: request.model || settings.llmModel,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API调用失败: ${response.status} ${errorText}`);
  }

  const data: LLMResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * 生成问题的提示词模板
 */
export function getQuestionGenerationPrompt(
  targetAudience: string,
  productName: string,
  sellingPoints: string,
  coreContent: string
): string {
  return `你是一位普通用户，不是专家也不是销售人员。请模拟真实用户在AI助手（如ChatGPT、豆包等）中会问的自然问题。

**背景信息**：
- 你是：${targetAudience}
- 想了解的产品：${productName}
- 产品主要特点：${sellingPoints}
- 核心内容：${coreContent}

**重要要求**：
1. **像真实用户一样思考**：
   - 用户不会直接说出产品名（除非已经在用）
   - 用户关心的是自己的问题和需求，不是产品
   - 提问方式要口语化、自然，避免"请问""能否"等过于礼貌的用语
   - 可以使用"有没有""怎么样""怎么""哪个"等常见问法

2. **避免的提问方式**：
   - ❌ "请问XX产品有什么特点？"（太正式，像广告）
   - ❌ "我想了解XX产品"（直接说产品名）
   - ❌ "能否推荐一下XX"（太客气）
   - ❌ "什么产品可以解决XX问题？"（太专业）

3. **推荐的提问方式**：
   - ✅ "最近感觉XX，有什么办法吗？"
   - ✅ "想找个能XX的东西，有什么推荐吗？"
   - ✅ "大家平时都怎么XX啊？"
   - ✅ "最近想XX，但不知道从哪开始"
   - ✅ "有什么好用的XX工具吗？"

4. **生成3个不同角度的问题**：
   - 问题1：从痛点/困扰角度（"最近XX很烦"）
   - 问题2：从好奇/了解角度（"听说XX，是真的吗"）
   - 问题3：从比较/选择角度（"XX和YY哪个更好"）

**输出格式**：
只返回JSON数组，例如：["问题1", "问题2", "问题3"]
不要有任何其他解释或说明。`;
}

/**
 * 分析回答是否包含产品信息的提示词模板
 */
export function getAnalysisPrompt(
  response: string,
  productName: string,
  sellingPoints: string,
  coreContent: string
): string {
  return `你是一位GEO分析专家。请分析以下大模型AI的回答，判断其中是否包含了指定产品的相关信息。

**产品名称**：${productName}
**产品卖点**：${sellingPoints}
**核心推广内容**：${coreContent}

**AI回答内容**：
${response}

**分析要求**：
1. 判断回答中是否明确提到了该产品
2. 刔回答中是否包含了产品的核心卖点或推广内容
3. 提取回答中的所有来源链接（如果有的话）
4. 列出所有匹配到的关键信息点

请以JSON格式返回分析结果：
{
  "hasProduct": true/false,
  "sources": ["来源URL1", "来源URL2"],
  "matchedPoints": ["匹配的卖点1", "匹配的卖点2"]
}

请只返回JSON对象，不要包含其他内容。`;
}

/**
 * 生成GEO优化建议的提示词模板
 */
export function getSuggestionsPrompt(analysisData: {
  adoptionRate: number;
  platformStats: Array<{
    platformName: string;
    adoptionRate: number;
  }>;
  topSources: Array<{
    url: string;
  }>;
}): string {
  const { adoptionRate, platformStats, topSources } = analysisData;

  return `你是一位资深的GEO（大模型应用引擎优化）专家。根据以下数据分析结果，请提供专业的GEO优化建议。

**当前GEO表现**：
- 整体采信率：${adoptionRate}%

**各平台表现**：
${platformStats.map(s => `- ${s.platformName}：采信率 ${s.adoptionRate}%`).join('\n')}

**主要来源**：
${topSources.map(s => `- ${s.url}`).join('\n')}

**请提供以下建议**：
1. 内容优化建议（如何在现有渠道上提升内容质量）
2. 新渠道建议（还有哪些网站或平台值得布局）
3. SEO/GEO策略建议
4. 短期和长期的行动建议

请以清晰、专业的格式提供建议，每条建议都要具体可执行。`;
}
