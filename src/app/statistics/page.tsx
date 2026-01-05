'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import type { Question } from '@/types';

export default function StatisticsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
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

  const fetchStatistics = async () => {
    if (!selectedQuestion) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/statistics?questionId=${selectedQuestion.id}`);
      const data = await response.json();

      if (response.ok) {
        setStats(data);
        // 同时获取建议
        fetchSuggestions(data);
      } else {
        alert(`获取统计失败: ${data.error}`);
      }
    } catch (error) {
      alert(`获取统计失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async (analysisData: any) => {
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisData }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('获取建议失败:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">数据统计</h1>
            <p className="text-muted-foreground mt-2">
              查看GEO优化效果和各平台采信率
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>选择问题</CardTitle>
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
              <Button
                onClick={fetchStatistics}
                disabled={!selectedQuestion || loading}
                className="mt-4"
              >
                {loading ? '加载中...' : '生成统计'}
              </Button>
            </CardContent>
          </Card>

          {stats && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>整体采信率</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-primary">
                      {stats.adoptionRate.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>查询总数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold">
                      {stats.platformStats.reduce((sum: number, p: any) => sum + p.totalQueries, 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>被采信次数</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-green-600">
                      {stats.platformStats.reduce((sum: number, p: any) => sum + p.mentionedCount, 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>各平台表现</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.platformStats.map((platform: any) => (
                      <div key={platform.platformId}>
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{platform.platformName}</span>
                          <span className="text-muted-foreground">
                            {platform.mentionedCount}/{platform.totalQueries} ({platform.adoptionRate.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${platform.adoptionRate}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {stats.topSources && stats.topSources.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>主要来源</CardTitle>
                    <CardDescription>被采信内容的主要来源网站</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.topSources.map((source: any, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-muted-foreground w-6">{index + 1}.</span>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline truncate"
                          >
                            {source.url}
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {suggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>GEO优化建议</CardTitle>
                    <CardDescription>基于当前数据的优化建议</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {suggestions.map((suggestion, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg">
                          <p className="text-sm">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
