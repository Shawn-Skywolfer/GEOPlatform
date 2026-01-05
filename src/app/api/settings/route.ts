import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          llmApiUrl: process.env.LLM_API_URL || 'https://api.openai.com/v1',
          llmModel: process.env.LLM_MODEL || 'gpt-3.5-turbo',
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('获取设置错误:', error);
    return NextResponse.json(
      { error: `获取设置失败: ${error}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { llmApiUrl, llmApiKey, llmModel } = body;

    const existingSettings = await prisma.settings.findFirst();

    if (existingSettings) {
      await prisma.settings.update({
        where: { id: existingSettings.id },
        data: {
          llmApiUrl,
          llmApiKey,
          llmModel,
        },
      });
    } else {
      await prisma.settings.create({
        data: {
          llmApiUrl,
          llmApiKey,
          llmModel,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('保存设置错误:', error);
    return NextResponse.json(
      { error: `保存设置失败: ${error}` },
      { status: 500 }
    );
  }
}
