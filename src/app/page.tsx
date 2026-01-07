'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  productsCount: number;
  questionsCount: number;
  analysesCount: number;
  queriesCount: number;
  platformsCount: number;
  loggedInPlatformsCount: number;
  recentQueries: Array<{
    id: string;
    platformName: string;
    questionText: string;
    hasProduct: boolean;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('获取仪表板数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">加载仪表板数据中...</p>
          </div>
        </main>
      </div>
    );
  }

  const platformLoginRate = stats?.platformsCount
    ? Math.round((stats.loggedInPlatformsCount / stats.platformsCount) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">仪表板</h1>
            <p className="text-muted-foreground mt-2">
              GEO（大模型应用引擎优化）运营平台概览
            </p>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>产品数量</CardDescription>
                <CardTitle className="text-3xl">{stats?.productsCount || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  已创建的产品信息
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>问题数量</CardDescription>
                <CardTitle className="text-3xl">{stats?.questionsCount || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  已生成的测试问题
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>分析次数</CardDescription>
                <CardTitle className="text-3xl">{stats?.analysesCount || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  已完成的GEO分析
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>查询次数</CardDescription>
                <CardTitle className="text-3xl">{stats?.queriesCount || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  在各平台的提问总数
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 平台状态 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>平台登录状态</CardTitle>
                <CardDescription>
                  各大模型AI平台的登录情况
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">已登录平台</span>
                    <span className="text-2xl font-bold">
                      {stats?.loggedInPlatformsCount || 0} / {stats?.platformsCount || 0}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${platformLoginRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {platformLoginRate}% 的平台已登录
                  </p>
                  <Link href="/platforms">
                    <Button variant="outline" className="w-full">
                      前往平台管理
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>快速开始</CardTitle>
                <CardDescription>
                  常用操作快捷入口
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/questions" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    📝 生成新问题
                  </Button>
                </Link>
                <Link href="/analysis" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    🔍 开始GEO分析
                  </Button>
                </Link>
                <Link href="/statistics" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    📊 查看数据统计
                  </Button>
                </Link>
                <Link href="/settings" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    ⚙️ 系统设置
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* 最近查询 */}
          <Card>
            <CardHeader>
              <CardTitle>最近查询</CardTitle>
              <CardDescription>
                最近在各个平台的提问记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentQueries && stats.recentQueries.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentQueries.map((query) => (
                    <div
                      key={query.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{query.questionText}</p>
                        <p className="text-xs text-muted-foreground">
                          {query.platformName} · {new Date(query.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="ml-4">
                        {query.hasProduct ? (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            包含产品
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            未包含
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  暂无查询记录，前往<Link href="/analysis" className="text-primary hover:underline">分析页面</Link>开始GEO分析
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
