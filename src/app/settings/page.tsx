'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Navbar from '@/components/Navbar';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    llmApiUrl: 'https://api.openai.com/v1',
    llmApiKey: '',
    llmModel: 'gpt-3.5-turbo',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || settings);
      }
    } catch (error) {
      console.error('获取设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('设置保存成功');
      } else {
        alert('设置保存失败');
      }
    } catch (error) {
      alert('设置保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">系统设置</h1>
            <p className="text-muted-foreground mt-2">
              配置大模型API参数
            </p>
          </div>

          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center">加载中...</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>大模型API配置</CardTitle>
                <CardDescription>
                  配置用于问题生成和分析的大模型API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiUrl">API地址</Label>
                  <Input
                    id="apiUrl"
                    placeholder="https://api.openai.com/v1"
                    value={settings.llmApiUrl}
                    onChange={(e) => handleInputChange('llmApiUrl', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    支持OpenAI兼容格式的API，如OpenAI、DeepSeek等
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API密钥</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="sk-..."
                    value={settings.llmApiKey}
                    onChange={(e) => handleInputChange('llmApiKey', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    您的API密钥将安全保存在数据库中
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">模型名称</Label>
                  <Input
                    id="model"
                    placeholder="gpt-3.5-turbo"
                    value={settings.llmModel}
                    onChange={(e) => handleInputChange('llmModel', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    常用模型：gpt-3.5-turbo、gpt-4、deepseek-chat等
                  </p>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? '保存中...' : '保存设置'}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>环境变量配置</CardTitle>
              <CardDescription>
                也可以通过环境变量配置API参数
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm font-mono bg-muted p-4 rounded-lg">
              <p>LLM_API_URL={settings.llmApiUrl}</p>
              <p>LLM_API_KEY=********</p>
              <p>LLM_MODEL={settings.llmModel}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
