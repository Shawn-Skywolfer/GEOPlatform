'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/Navbar';
import type { Question, Platform } from '@/types';

interface ManualInput {
  platformId: string;
  platformName: string;
  response: string;
}

export default function AnalysisPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [manualInputs, setManualInputs] = useState<ManualInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchPlatforms();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/generate-questions');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('获取产品失败:', error);
    }
  };

  const fetchPlatforms = async () => {
    try {
      const response = await fetch('/api/platforms');
      const data = await response.json();
      setPlatforms(data.platforms || []);
    } catch (error) {
      console.error('获取平台失败:', error);
    }
  };

  const handlePlatformSelect = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      setSelectedPlatforms(selectedPlatforms.filter((id) => id !== platformId));
      setManualInputs(manualInputs.filter((input) => input.platformId !== platformId));
    } else {
      const platform = platforms.find((p) => p.id === platformId);
      if (platform) {
        setSelectedPlatforms([...selectedPlatforms, platformId]);
        setManualInputs([
          ...manualInputs,
          { platformId, platformName: platform.name, response: '' },
        ]);
      }
    }
  };

  const handleResponseChange = (platformId: string, response: string) => {
    setManualInputs(
      manualInputs.map((input) =>
        input.platformId === platformId ? { ...input, response } : input
      )
    );
  };

  const handleAnalyzeAll = async () => {
    if (!selectedQuestion || manualInputs.length === 0) {
      alert('请选择问题和至少一个平台的回答');
      return;
    }

    setAnalyzing(true);
    setAnalysisResults([]);

    const results = [];

    for (const input of manualInputs) {
      if (!input.response.trim()) continue;

      try {
        // 首先创建查询记录
        const queryResponse = await fetch('/api/analyze-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            response: input.response,
            productInfo: {
              name: selectedQuestion.productId, // 简化处理
              sellingPoints: '产品卖点',
              coreContent: '核心内容',
            },
          }),
        });

        const queryData = await queryResponse.json();

        results.push({
          platformId: input.platformId,
          platformName: input.platformName,
          response: input.response,
          hasProduct: queryData.hasProduct || false,
          sources: queryData.sources || [],
          matchedPoints: queryData.matchedPoints || [],
        });

        // 添加延迟避免请求过快
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        results.push({
          platformId: input.platformId,
          platformName: input.platformName,
          response: input.response,
          error: `分析失败: ${error}`,
        });
      }
    }

    setAnalysisResults(results);
    setAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">手动输入与分析</h1>
            <p className="text-muted-foreground mt-2">
              手动在各平台提问后，将AI回答粘贴到系统中进行分析
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>📝 <strong>操作流程：</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>选择一个问题</li>
                <li>选择要测试的平台</li>
                <li>在各平台手动提问，复制AI的回答</li>
                <li>将回答粘贴到对应的输入框中</li>
                <li>点击"开始分析"查看结果</li>
              </ol>
            </CardContent>
          </Card>

          <Tabs defaultValue="input">
            <TabsList>
              <TabsTrigger value="input">输入回答</TabsTrigger>
              <TabsTrigger value="results">查看结果</TabsTrigger>
            </TabsList>

            <TabsContent value="input" className="space-y-6">
              {/* 选择问题 */}
              <Card>
                <CardHeader>
                  <CardTitle>1. 选择问题</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {products.map((product) =>
                      product.questions.map((question: Question) => (
                        <div
                          key={question.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedQuestion?.id === question.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => setSelectedQuestion(question)}
                        >
                          <p className="font-medium">{question.text}</p>
                          <p className="text-sm text-muted-foreground">{product.name}</p>
                        </div>
                      ))
                    )}
                    {products.length === 0 && (
                      <p className="text-muted-foreground">暂无产品，请先在问题生成页面创建</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 选择平台 */}
              <Card>
                <CardHeader>
                  <CardTitle>2. 选择平台并输入回答</CardTitle>
                  <CardDescription>勾选平台后，在输入框中粘贴该平台的AI回答</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    {platforms.map((platform) => (
                      <div
                        key={platform.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedPlatforms.includes(platform.id)
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => handlePlatformSelect(platform.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{platform.name}</span>
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedPlatforms.includes(platform.id)
                                ? 'bg-primary border-primary'
                                : 'border-gray-300'
                            }`}
                          >
                            {selectedPlatforms.includes(platform.id) && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        <a
                          href={platform.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {platform.url}
                        </a>
                      </div>
                    ))}
                  </div>

                  {selectedPlatforms.length > 0 && (
                    <div className="space-y-4 mt-6">
                      <h3 className="font-medium">粘贴各平台的AI回答：</h3>
                      {manualInputs.map((input) => (
                        <div key={input.platformId} className="space-y-2">
                          <label className="text-sm font-medium">{input.platformName} 的回答：</label>
                          <Textarea
                            placeholder={`请粘贴 ${input.platformName} 的AI回答...`}
                            value={input.response}
                            onChange={(e) => handleResponseChange(input.platformId, e.target.value)}
                            rows={6}
                            className="w-full"
                          />
                          <a
                            href={platforms.find((p) => p.id === input.platformId)?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            → 打开 {input.platformName} 提问
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedQuestion && manualInputs.length > 0 && (
                <Button onClick={handleAnalyzeAll} disabled={analyzing} className="w-full" size="lg">
                  {analyzing ? '分析中...' : '开始分析'}
                </Button>
              )}
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              {analysisResults.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      暂无分析结果，请先在"输入回答"标签页输入各平台的AI回答
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>分析摘要</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-muted rounded-lg">
                          <div className="text-3xl font-bold text-primary">
                            {analysisResults.length}
                          </div>
                          <div className="text-sm text-muted-foreground">分析总数</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <div className="text-3xl font-bold text-green-600">
                            {analysisResults.filter((r) => r.hasProduct).length}
                          </div>
                          <div className="text-sm text-muted-foreground">包含产品信息</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                          <div className="text-3xl font-bold text-blue-600">
                            {analysisResults.length > 0
                              ? Math.round(
                                  (analysisResults.filter((r) => r.hasProduct).length /
                                    analysisResults.length) *
                                    100
                                )
                              : 0}
                            %
                          </div>
                          <div className="text-sm text-muted-foreground">采信率</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {analysisResults.map((result, index) => (
                    <Card
                      key={index}
                      className={result.hasProduct ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{result.platformName}</CardTitle>
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              result.hasProduct
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {result.hasProduct ? '✓ 包含产品信息' : '✗ 未包含'}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">AI回答：</h4>
                          <p className="text-sm bg-muted p-3 rounded-lg whitespace-pre-wrap">
                            {result.response}
                          </p>
                        </div>

                        {result.error ? (
                          <div className="text-destructive text-sm">{result.error}</div>
                        ) : (
                          <>
                            {result.matchedPoints && result.matchedPoints.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">匹配的要点：</h4>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                  {result.matchedPoints.map((point: string, i: number) => (
                                    <li key={i}>{point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {result.sources && result.sources.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">来源链接：</h4>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                  {result.sources.map((source: any, i: number) => (
                                    <li key={i}>
                                      <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        {source.url}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
