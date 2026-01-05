# GEO平台开发日志

## 项目概述

**项目名称**: GEO（大模型应用引擎优化）运营平台

**开发时间**: 2026年1月4日

**项目目标**: 开发一个帮助企业优化产品在大模型AI应用中的曝光度和推荐率的运营平台。

---

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI组件库**: shadcn/ui + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: SQLite + Prisma ORM
- **浏览器自动化**: Playwright（已安装但改用手动输入方式）
- **大模型API**: 标准OpenAI格式API

## 支持的AI平台

1. 豆包 - https://www.doubao.com
2. 千问 - https://www.qianwen.com
3. 文心一言 - https://yiyan.baidu.com
4. DeepSeek - https://www.deepseek.com
5. 智谱 - https://chatglm.cn
6. Kimi - https://kimi.moonshot.cn

---

## 开发历程

### 第一阶段：需求确认与计划

**用户需求**：
1. 输入目标客户群体、产品、卖点和核心推广内容，自动生成3个高频问题
2. 支持多平台登录管理
3. 自动在各平台提问并采集回答
4. 分析回答中是否包含产品信息
5. 数据统计功能
6. GEO优化建议

**技术决策**：
- 技术栈：Next.js + shadcn/ui + Prisma
- 大模型访问：浏览器自动化（Playwright）
- 问题生成：标准OpenAI格式API
- 平台支持：全部六大平台

### 第二阶段：项目初始化

**创建的文件**：
- `package.json` - 项目依赖配置
- `next.config.mjs` - Next.js配置
- `tsconfig.json` - TypeScript配置
- `tailwind.config.ts` - Tailwind CSS配置
- `postcss.config.mjs` - PostCSS配置
- `.env.example` - 环境变量示例
- `.gitignore` - Git忽略配置

**执行的命令**：
```bash
npm install
npx prisma generate
npx prisma db push
```

### 第三阶段：核心功能开发

#### 1. 数据库模型
创建 `prisma/schema.prisma`，定义以下模型：
- Platform（平台）
- Product（产品）
- Question（问题）
- Query（查询记录）
- Analysis（分析记录）
- Settings（系统设置）

#### 2. 类型定义
创建 `src/types/index.ts`，定义所有TypeScript类型

#### 3. 核心库文件
- `src/lib/prisma.ts` - Prisma客户端
- `src/lib/llm.ts` - 大模型API调用
- `src/lib/playwright.ts` - 浏览器自动化

#### 4. API路由
- `src/app/api/generate-questions/route.ts` - 问题生成API
- `src/app/api/platforms/route.ts` - 平台管理API
- `src/app/api/platforms/[action]/route.ts` - 平台登录/登出API
- `src/app/api/ask-question/route.ts` - 自动提问API
- `src/app/api/analyze-response/route.ts` - 回答分析API
- `src/app/api/statistics/route.ts` - 统计API
- `src/app/api/suggestions/route.ts` - 建议生成API
- `src/app/api/settings/route.ts` - 系统设置API

#### 5. UI组件
创建shadcn/ui组件：
- Button
- Input
- Textarea
- Label
- Card
- Tabs

#### 6. 页面
- `src/app/page.tsx` - 首页（重定向到问题生成）
- `src/app/layout.tsx` - 根布局
- `src/app/globals.css` - 全局样式
- `src/app/questions/page.tsx` - 问题生成页面
- `src/app/platforms/page.tsx` - 平台管理页面
- `src/app/analysis/page.tsx` - 分析结果页面
- `src/app/statistics/page.tsx` - 数据统计页面
- `src/app/settings/page.tsx` - 系统设置页面

#### 7. 导航组件
- `src/components/Navbar.tsx` - 顶部导航栏

### 第四阶段：问题修复

#### 问题1：Next.js配置错误
**错误信息**：
```
SyntaxError: Unexpected token '{'
```

**原因**：`next.config.mjs` 中使用了TypeScript的 `type` 导入

**解决方案**：移除类型导入，使用纯JavaScript语法

#### 问题2：平台管理页面登录按钮不显示
**原因**：
1. 平台初始化API返回400错误 - 前端将action放在请求体，API从URL参数读取
2. 平台数据未初始化到数据库

**解决方案**：
1. 修改API从请求体读取action参数
2. 创建初始化脚本 `scripts/init-platforms.ts`
3. 手动运行脚本初始化6个平台数据

#### 问题3：千问地址错误
**用户反馈**：千问地址应该是 www.qianwen.com

**解决方案**：
1. 更新 `src/app/api/platforms/route.ts`
2. 更新 `src/types/index.ts`
3. 创建脚本更新数据库中的千问地址

#### 问题4：Playwright浏览器未安装
**错误信息**：
```
Executable doesn't exist at C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1200\chrome-win64\chrome.exe
```

**解决方案**：运行 `npx playwright install chromium` 安装浏览器

#### 问题5：自动提问功能不实用
**问题**：使用Playwright进行浏览器自动化存在以下挑战：
1. 各平台网页结构不同，需要针对性编写选择器
2. 反爬虫机制
3. 登录状态维护困难
4. 动态内容加载时间不确定

**解决方案**：重构"分析结果"页面为手动输入方式

**新的操作流程**：
1. 用户在各平台手动提问
2. 复制AI回答
3. 粘贴到系统输入框
4. 系统分析回答并给出统计

---

## 最终功能清单

### 1. 问题生成 (`/questions`)
- 输入目标客户群体、产品名称、卖点、核心推广内容
- AI生成3个高频问题
- 保存到数据库

### 2. 平台管理 (`/platforms`)
- 显示6大AI平台卡片
- 点击登录打开平台官网
- 手动登录后标记为"已登录"状态
- 支持登出操作

### 3. 手动输入与分析 (`/analysis`)
**输入回答标签页**：
- 选择要分析的问题
- 勾选要测试的平台
- 粘贴各平台的AI回答
- 一键打开平台网站

**查看结果标签页**：
- 分析摘要（总数、包含产品信息数、采信率）
- 每个平台的详细分析：
  - 是否包含产品信息
  - 匹配的关键要点
  - 来源链接

### 4. 数据统计 (`/statistics`)
- 选择问题查看统计数据
- 整体采信率
- 各平台表现对比
- 主要来源网站
- GEO优化建议

### 5. 系统设置 (`/settings`)
- 配置大模型API地址
- 配置API密钥
- 配置模型名称

---

## 项目结构

```
GEOPlatform/
├── prisma/
│   ├── schema.prisma          # 数据库模型
│   └── geo-platform.db        # SQLite数据库文件
├── scripts/
│   ├── init-platforms.ts      # 平台初始化脚本
│   └── update-qianwen.ts      # 更新千问地址脚本
├── src/
│   ├── app/
│   │   ├── api/               # API路由
│   │   │   ├── generate-questions/
│   │   │   ├── platforms/
│   │   │   │   └── [action]/
│   │   │   ├── analyze-response/
│   │   │   ├── statistics/
│   │   │   ├── suggestions/
│   │   │   └── settings/
│   │   ├── analysis/          # 手动输入与分析页面
│   │   ├── platforms/         # 平台管理页面
│   │   ├── questions/         # 问题生成页面
│   │   ├── settings/          # 系统设置页面
│   │   ├── statistics/        # 数据统计页面
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 首页
│   │   └── globals.css        # 全局样式
│   ├── components/
│   │   ├── Navbar.tsx         # 导航栏
│   │   └── ui/                # shadcn/ui组件
│   ├── lib/
│   │   ├── prisma.ts          # Prisma客户端
│   │   ├── playwright.ts      # 浏览器自动化
│   │   ├── llm.ts             # 大模型API调用
│   │   └── utils.ts           # 工具函数
│   └── types/
│       └── index.ts           # TypeScript类型定义
├── .env.example               # 环境变量示例
├── .gitignore                 # Git忽略配置
├── package.json               # 项目配置
├── next.config.mjs            # Next.js配置
├── tailwind.config.ts         # Tailwind配置
└── tsconfig.json              # TypeScript配置
```

---

## 启动命令

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma generate
npx prisma db push

# 初始化平台数据（可选）
npx tsx scripts/init-platforms.ts

# 安装Playwright浏览器（可选，用于自动化功能）
npx playwright install chromium

# 启动开发服务器
npm run dev
```

---

## 环境变量配置

创建 `.env` 文件：

```
LLM_API_URL=https://api.openai.com/v1
LLM_API_KEY=your-api-key-here
LLM_MODEL=gpt-3.5-turbo
```

---

## 已知限制与未来改进

### 当前限制

1. **手动输入方式**：需要用户手动在各平台提问并复制回答
2. **分析准确性**：依赖大模型API的理解能力
3. **无数据持久化**：手动输入的分析结果未保存到数据库

### 未来改进方向

1. **API集成**：如果各平台提供官方API，可改为直接调用
2. **数据持久化**：将手动输入的分析结果保存到数据库
3. **批量分析**：支持历史查询记录的批量分析
4. **导出功能**：支持将分析结果导出为报告
5. **定时任务**：定期自动检查各平台的回答变化

---

## 开发总结

本次开发成功实现了一个GEO（大模型应用引擎优化）运营平台，具备以下特点：

1. **完整的工作流程**：从问题生成到手动输入分析再到数据统计
2. **用户友好的界面**：使用shadcn/ui构建现代化的UI
3. **实用的设计**：采用手动输入方式，避免了自动化的技术复杂性
4. **可扩展的架构**：基于Next.js和Prisma，易于后续扩展

通过本次开发，我们学到了：
- 浏览器自动化在实际应用中的局限性
- 用户手动输入在早期阶段的实用价值
- 模块化设计的重要性
- 快速迭代和响应用户反馈的重要性

---

## 附录：关键代码片段

### 问题生成提示词模板

```typescript
export function getQuestionGenerationPrompt(
  targetAudience: string,
  productName: string,
  sellingPoints: string,
  coreContent: string
): string {
  return `你是一位GEO（大模型应用引擎优化）专家。根据以下信息，分析并生成3个最有可能被目标客户群体在大模型AI应用中提出的问题。

**目标客户群体**：${targetAudience}
**产品名称**：${productName}
**产品卖点**：${sellingPoints}
**核心推广内容**：${coreContent}

**要求**：
1. 分析目标客户群体的痛点、需求和搜索习惯
2. 思考他们在使用大模型AI应用时会如何提问
3. 生成3个具体、自然、符合用户真实提问习惯的问题
4. 问题应该隐含对产品的需求，但不要太直接
5. 以JSON数组格式返回，格式：["问题1", "问题2", "问题3"]

请只返回JSON数组，不要包含其他内容。`;
}
```

### 分析提示词模板

```typescript
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
2. 判断回答中是否包含了产品的核心卖点或推广内容
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
```

---

**文档生成时间**: 2026年1月4日
**项目版本**: v0.1.0
