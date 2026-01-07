'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Navbar from '@/components/Navbar';

interface Platform {
  id: string;
  name: string;
  url: string;
  isLoggedIn: boolean;
}

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [loginInProgress, setLoginInProgress] = useState<string | null>(null);

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      // 先初始化平台
      await fetch('/api/platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' }),
      });

      const response = await fetch('/api/platforms');
      const data = await response.json();
      setPlatforms(data.platforms || []);
    } catch (error) {
      console.error('获取平台失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (platformId: string, platformName: string) => {
    setActionLoading(platformId);
    setLoginInProgress(platformId);
    try {
      const response = await fetch('/api/platforms/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`🌐 ${data.message}\n\n请在打开的浏览器中完成登录，然后点击"确认登录完成"按钮。`);
      } else {
        alert(`登录失败: ${data.message}`);
        setLoginInProgress(null);
      }
    } catch (error) {
      alert(`操作失败: ${error}`);
      setLoginInProgress(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmLogin = async (platformId: string, platformName: string) => {
    setActionLoading(platformId);
    try {
      const response = await fetch('/api/platforms/confirm-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${platformName}登录成功！`);
        fetchPlatforms();
      } else {
        alert(`确认登录失败: ${data.message}`);
      }
    } catch (error) {
      alert(`操作失败: ${error}`);
    } finally {
      setActionLoading(null);
      setLoginInProgress(null);
    }
  };

  const handleLogout = async (platformId: string) => {
    if (!confirm('确定要登出此平台吗？')) {
      return;
    }

    setActionLoading(platformId);
    try {
      const response = await fetch('/api/platforms/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId }),
      });

      const data = await response.json();

      if (data.success) {
        fetchPlatforms();
      } else {
        alert(`登出失败: ${data.message}`);
      }
    } catch (error) {
      alert(`操作失败: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-muted-foreground">加载平台信息中...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">平台管理</h1>
            <p className="text-muted-foreground mt-2">
              管理各大模型AI平台的登录状态
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>📱 <strong>登录流程：</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>点击平台卡片上的"登录"按钮</li>
                <li>系统会自动打开Playwright浏览器并导航到平台官网</li>
                <li>您在打开的浏览器中手动完成登录流程</li>
                <li>登录完成后，返回本页面点击"确认登录完成"按钮</li>
              </ol>
              <p className="mt-3">✅ 已登录的平台可以用于自动提问功能，无需重复登录</p>
            </CardContent>
          </Card>

          {platforms.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  暂无平台数据，请刷新页面重试
                </p>
                <Button onClick={fetchPlatforms} className="mt-4">
                  刷新
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {platforms.map((platform) => (
                <Card
                  key={platform.id}
                  className={`transition-all hover:shadow-md ${
                    platform.isLoggedIn ? 'border-green-500 bg-green-50 dark:bg-green-950/20' :
                    loginInProgress === platform.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{platform.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            platform.isLoggedIn ? 'bg-green-500' :
                            loginInProgress === platform.id ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                          }`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {platform.isLoggedIn ? '已登录' :
                           loginInProgress === platform.id ? '登录中...' : '未登录'}
                        </span>
                      </div>
                    </div>
                    <CardDescription className="text-xs truncate">
                      {platform.url}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {platform.isLoggedIn ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>已启用此平台</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleLogout(platform.id)}
                          disabled={actionLoading === platform.id}
                        >
                          {actionLoading === platform.id ? '处理中...' : '登出'}
                        </Button>
                      </div>
                    ) : loginInProgress === platform.id ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>请在浏览器中登录</span>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full"
                          onClick={() => handleConfirmLogin(platform.id, platform.name)}
                          disabled={actionLoading === platform.id}
                        >
                          {actionLoading === platform.id ? '处理中...' : '确认登录完成'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full"
                          onClick={() => setLoginInProgress(null)}
                          disabled={actionLoading === platform.id}
                        >
                          取消
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleLogin(platform.id, platform.name)}
                        disabled={actionLoading === platform.id}
                      >
                        {actionLoading === platform.id ? '打开浏览器中...' : '登录'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
