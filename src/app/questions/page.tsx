'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Navbar from '@/components/Navbar';

export default function QuestionsPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    targetAudience: '',
    productName: '',
    sellingPoints: '',
    coreContent: '',
  });
  const [questions, setQuestions] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setQuestions(data.questions);
      } else {
        alert(`生成失败: ${data.error}`);
      }
    } catch (error) {
      alert(`生成失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">问题生成</h1>
            <p className="text-muted-foreground mt-2">
              根据您的产品信息，生成目标客户最可能提出的问题
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>产品信息</CardTitle>
              <CardDescription>
                填写您想要推广的产品信息和目标客户群体
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="productName">产品名称</Label>
                  <Input
                    id="productName"
                    placeholder="例如：智能客服SaaS平台"
                    value={formData.productName}
                    onChange={(e) => handleInputChange('productName', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetAudience">目标客户群体</Label>
                  <Textarea
                    id="targetAudience"
                    placeholder="例如：中小企业的客服主管，他们正在寻找提高客服效率的解决方案"
                    value={formData.targetAudience}
                    onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sellingPoints">产品卖点</Label>
                  <Textarea
                    id="sellingPoints"
                    placeholder="例如：AI智能回复、24/7全天候服务、降低80%人工成本"
                    value={formData.sellingPoints}
                    onChange={(e) => handleInputChange('sellingPoints', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coreContent">核心推广内容</Label>
                  <Textarea
                    id="coreContent"
                    placeholder="例如：我们的平台已经帮助500+企业提升客服满意度，平均响应时间从5分钟降至10秒"
                    value={formData.coreContent}
                    onChange={(e) => handleInputChange('coreContent', e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? '生成中...' : '生成问题'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>生成的问题</CardTitle>
                <CardDescription>
                  以下是AI生成的3个高频问题
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <div key={index} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <p className="flex-1">{question}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button onClick={() => window.location.href = '/platforms'}>
                    前往平台管理
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
