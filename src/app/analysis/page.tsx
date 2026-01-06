'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/Navbar';
import type { Question, Platform } from '@/types';

interface ProgressEvent {
  type: 'started' | 'progress' | 'complete' | 'error';
  message: string;
  step?: string;
  platformIndex?: number;
  platformId?: string;
  platformName?: string;
  total?: number;
  result?: any;
  error?: string;
}

export default function AnalysisPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [autoAnalyzing, setAutoAnalyzing] = useState(false);
  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>([]);
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
    } else {
      const platform = platforms.find((p) => p.id === platformId);
      if (platform && platform.isLoggedIn) {
        setSelectedPlatforms([...selectedPlatforms, platformId]);
      }
    }
  };

  const handleAutoAnalyze = async () => {
    if (!selectedQuestion || selectedPlatforms.length === 0) {
      alert('请选择问题和至少一个平台');
      return;
    }

    // 检查所有选中的平台是否都已登录
    const allLoggedIn = selectedPlatforms.every(platformId => {
      const platform = platforms.find(p => p.id === platformId);
      return platform?.isLoggedIn;
    });

    if (!allLoggedIn) {
      alert('请先在"平台管理"页面登录所有选中的平台');
      return;
    }

    setAutoAnalyzing(true);
    setProgressEvents([]);
    setAnalysisResults([]);

    try {
      const response = await fetch('/api/auto-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: selectedQuestion.id,
          platformIds: selectedPlatforms,
        }),
      });

      if (!response.ok) {
        throw new Error('分析请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 处理SSE数据
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              setProgressEvents(prev => [...prev, data]);

              if (data.type === 'complete') {
                setAnalysisResults(data.results || []);
                setAutoAnalyzing(false);

                // 切换到结果标签页
                setTimeout(() => {
                  const resultsTab = document.querySelector('[value="results"]') as HTMLElement;
                  if (resultsTab) {
                    resultsTab.click();
                  }
                }, 500);
              } else if (data.type === 'error') {
                alert(`错误: ${data.message}`);
                setAutoAnalyzing(false);
              }
            } catch (e) {
              console.error('解析SSE数据失败:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('自动分析错误:', error);
      alert(`自动分析失败: ${error instanceof Error ? error.message : String(error)}`);
      setAutoAnalyzing(false);
    }
  };

  // 获取最新的进度事件
  const latestEvent = progressEvents[progressEvents.length - 1];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">GEO自动分析</h1>
            <p className="text-muted-foreground mt-2">
              自动在各AI平台提问并分析产品提及情况
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>🚀 <strong>自动分析流程：</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>选择一个问题</li>
                <li>选择要测试的平台（需已在"平台管理"页面登录）</li>
                <li>点击"一键分析"按钮</li>
                <li>系统会自动在所有平台提问并分析结果，实时显示进度</li>
                <li>完成后自动跳转到结果页面</li>
              </ol>
            </CardContent>
          </Card>

          <Tabs defaultValue="input">
            <TabsList>
              <TabsTrigger value="input">分析设置</TabsTrigger>
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
                  <CardTitle>2. 选择平台</CardTitle>
                  <CardDescription>
                    勾选要测试的平台（仅显示已登录的平台）
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-3">
                    {platforms.map((platform) => {
                      const isSelected = selectedPlatforms.includes(platform.id);
                      return (
                        <div
                          key={platform.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted'
                          } ${!platform.isLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => platform.isLoggedIn && handlePlatformSelect(platform.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{platform.name}</span>
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'bg-primary border-primary'
                                  : 'border-gray-300'
                              }`}
                            >
                              {isSelected && (
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
                          {!platform.isLoggedIn && (
                            <p className="text-xs text-orange-500 mt-1">未登录 - 请先在平台管理页面登录</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 一键分析按钮 */}
                  {selectedQuestion && selectedPlatforms.length > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-blue-900 dark:text-blue-100">
                            🚀 准备就绪
                          </h3>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            已选择 {selectedPlatforms.length} 个平台
                          </p>
                        </div>
                        <Button
                          onClick={handleAutoAnalyze}
                          disabled={autoAnalyzing}
                          className="bg-blue-600 hover:bg-blue-700"
                          size="lg"
                        >
                          {autoAnalyzing ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              分析中...
                            </>
                          ) : (
                            <>
                              <span className="mr-2">⚡</span>
                              一键分析
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        系统将自动在所有选中的平台上提问并分析结果，整个过程可能需要几分钟
                      </p>
                    </div>
                  )}

                  {/* 实时进度显示 */}
                  {autoAnalyzing && progressEvents.length > 0 && (
                    <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border">
                      <h3 className="font-medium mb-3">📊 分析进度</h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {progressEvents.slice(-5).map((event, index) => (
                          <div
                            key={index}
                            className={`text-sm p-2 rounded ${
                              event.type === 'error' ? 'bg-red-50 text-red-700' :
                              event.type === 'complete' ? 'bg-green-50 text-green-700' :
                              event.step === 'completed' ? 'bg-green-50 text-green-700' :
                              event.step === 'failed' ? 'bg-orange-50 text-orange-700' :
                              'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {event.step === 'asking' && <span>🔍</span>}
                              {event.step === 'analyzing' && <span>🤖</span>}
                              {event.step === 'completed' && <span>✅</span>}
                              {event.step === 'failed' && <span>❌</span>}
                              {event.type === 'complete' && <span>🎉</span>}
                              {event.type === 'error' && <span>⚠️</span>}
                              <span>{event.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {latestEvent && latestEvent.type === 'progress' && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${((latestEvent.platformIndex || 0) + 1) / selectedPlatforms.length * 100}%`
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-600 mt-1 text-center">
                            {latestEvent.platformIndex !== undefined && (
                              <>进度: {latestEvent.platformIndex + 1} / {selectedPlatforms.length}</>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              {analysisResults.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      暂无分析结果，请先选择问题和平台，然后点击"一键分析"
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
