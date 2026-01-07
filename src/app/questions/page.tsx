'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import type { Question } from '@/types';

interface Product {
  id: string;
  name: string;
  questions: Question[];
}

export default function QuestionsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    targetAudience: '',
    productName: '',
    sellingPoints: '',
    coreContent: '',
  });
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [defaultPrompt] = useState(`你是一位普通用户，不是专家也不是销售人员。请模拟真实用户在AI助手（如ChatGPT、豆包等）中会问的自然问题。

**背景信息**：
- 你是：{{targetAudience}}
- 想了解的产品：{{productName}}
- 产品主要特点：{{sellingPoints}}
- 核心内容：{{coreContent}}

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
不要有任何其他解释或说明。`);

  const [editingQuestions, setEditingQuestions] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchProducts();
    fetchPromptTemplate();
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

  const fetchPromptTemplate = async () => {
    try {
      const response = await fetch('/api/prompt-templates');
      const data = await response.json();
      const template = data.templates?.find((t: any) => t.name === 'question-generation');
      if (template && template.template) {
        setCurrentPrompt(template.template);
      } else {
        setCurrentPrompt(defaultPrompt);
      }
    } catch (error) {
      console.error('获取Prompt模板失败:', error);
      setCurrentPrompt(defaultPrompt);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customPrompt: currentPrompt !== defaultPrompt ? currentPrompt : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 重新获取产品列表
        await fetchProducts();
      } else {
        alert(`生成失败: ${data.error}`);
      }
    } catch (error) {
      alert(`生成失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrompt = async () => {
    // 验证Prompt模板不为空
    if (!currentPrompt || currentPrompt.trim().length === 0) {
      alert('Prompt模板不能为空');
      return;
    }

    // 验证必要的变量占位符存在
    const requiredVariables = ['targetAudience', 'productName', 'sellingPoints', 'coreContent'];
    const missingVariables = requiredVariables.filter(
      variable => !currentPrompt.includes(`{{${variable}}}`)
    );

    if (missingVariables.length > 0) {
      alert(`Prompt模板缺少必要的变量占位符：\n${missingVariables.map(v => `{{${v}}}`).join(', ')}\n\n请确保包含所有必要的变量占位符。`);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/prompt-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'question-generation',
          displayName: '问题生成模板',
          description: '用于生成GEO测试问题的Prompt模板',
          template: currentPrompt,
          variables: requiredVariables,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Prompt模板已保存');
      } else {
        alert(`保存失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      alert(`保存失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPrompt = () => {
    setCurrentPrompt(defaultPrompt);
  };

  const handleQuestionEdit = (questionId: string, newText: string) => {
    setEditingQuestions(prev => ({ ...prev, [questionId]: newText }));
  };

  const handleSaveQuestion = async (questionId: string) => {
    const newText = editingQuestions[questionId];
    if (!newText) return;

    setSaving(true);
    try {
      const response = await fetch('/api/questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, text: newText }),
      });

      if (response.ok) {
        await fetchProducts();
        setEditingQuestions(prev => {
          const updated = { ...prev };
          delete updated[questionId];
          return updated;
        });
        alert('问题已更新');
      } else {
        alert('更新失败');
      }
    } catch (error) {
      alert(`更新失败: ${error}`);
    } finally {
      setSaving(false);
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">问题生成</h1>
              <p className="text-muted-foreground mt-2">
                根据您的产品信息，生成目标客户最可能提出的问题
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPrompt(!showPrompt)}
            >
              {showPrompt ? '隐藏' : '编辑'} Prompt
            </Button>
          </div>

          {/* Prompt编辑区域 */}
          {showPrompt && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle>Prompt 模板编辑</CardTitle>
                <CardDescription>
                  自定义问题生成的Prompt模板。使用 <code className="bg-muted px-1 py-0.5 rounded">{'{{变量名}}'}</code> 作为占位符。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">可用的变量占位符：</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <code className="bg-background px-2 py-1 rounded">{'{{targetAudience}}'}</code>
                    <span className="text-muted-foreground">- 目标客户群体</span>
                    <code className="bg-background px-2 py-1 rounded">{'{{productName}}'}</code>
                    <span className="text-muted-foreground">- 产品名称</span>
                    <code className="bg-background px-2 py-1 rounded">{'{{sellingPoints}}'}</code>
                    <span className="text-muted-foreground">- 产品卖点</span>
                    <code className="bg-background px-2 py-1 rounded">{'{{coreContent}}'}</code>
                    <span className="text-muted-foreground">- 核心推广内容</span>
                  </div>
                </div>
                <Textarea
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="输入Prompt模板..."
                />
                <div className="flex space-x-2">
                  <Button onClick={handleSavePrompt} disabled={saving}>
                    {saving ? '保存中...' : '保存Prompt'}
                  </Button>
                  <Button variant="outline" onClick={handleResetPrompt} disabled={saving}>
                    重置为默认
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 产品信息表单 */}
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

          {/* 已生成的问题列表 */}
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>
                  点击问题可以进行编辑
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.questions.map((question) => (
                    <div key={question.id} className="p-4 bg-muted rounded-lg">
                      {editingQuestions[question.id] !== undefined ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingQuestions[question.id]}
                            onChange={(e) => handleQuestionEdit(question.id, e.target.value)}
                            rows={3}
                            className="bg-background"
                          />
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveQuestion(question.id)}
                              disabled={saving}
                            >
                              {saving ? '保存中...' : '保存'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingQuestions(prev => {
                                  const updated = { ...prev };
                                  delete updated[question.id];
                                  return updated;
                                });
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between space-x-3">
                          <p className="flex-1">{question.text}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleQuestionEdit(question.id, question.text)}
                          >
                            编辑
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {products.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <Button onClick={() => window.location.href = '/analysis'}>
                  前往GEO分析
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
