# GEO（大模型应用引擎优化）运营平台

帮助企业优化产品在大模型AI应用中的曝光度和推荐率。

## 功能特性

1. **问题生成** - 基于目标客户和产品卖点，AI自动生成3个高频问题
2. **平台管理** - 支持豆包、千问、文心一言、DeepSeek、智谱、Kimi六大平台
3. **自动提问** - 在各平台自动提问并采集AI回答
4. **回答分析** - 检测产品是否被AI采信，提取来源信息
5. **数据统计** - 展示各平台采信率、来源分布等GEO数据
6. **优化建议** - 以GEO专家角度给出优化建议

## 技术栈

- **前端**: Next.js 14 + shadcn/ui + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: SQLite + Prisma ORM
- **浏览器自动化**: Playwright
- **大模型API**: 支持OpenAI兼容格式

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填写您的配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```
LLM_API_URL=https://api.openai.com/v1
LLM_API_KEY=your-api-key-here
LLM_MODEL=gpt-3.5-turbo
```

### 3. 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 使用指南

### 第一步：配置API

1. 访问"系统设置"页面
2. 填写您的大模型API配置（支持OpenAI、DeepSeek等兼容格式）

### 第二步：生成问题

1. 访问"问题生成"页面
2. 填写产品信息：
   - 目标客户群体
   - 产品名称
   - 产品卖点
   - 核心推广内容
3. 点击"生成问题"

### 第三步：管理平台

1. 访问"平台管理"页面
2. 点击"登录"按钮打开浏览器
3. 手动完成平台登录（系统会保存会话）

### 第四步：自动提问

1. 访问"分析结果"页面
2. 选择要提问的问题
3. 选择已登录的平台
4. 点击"开始提问"

### 第五步：查看统计

1. 访问"数据统计"页面
2. 选择问题查看GEO效果
3. 查看优化建议

## 项目结构

```
GEOPlatform/
├── prisma/
│   └── schema.prisma          # 数据库模型
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API路由
│   │   ├── questions/         # 问题生成页
│   │   ├── platforms/         # 平台管理页
│   │   ├── analysis/          # 分析结果页
│   │   ├── statistics/        # 数据统计页
│   │   └── settings/          # 系统设置页
│   ├── components/            # React组件
│   │   └── ui/                # shadcn/ui组件
│   ├── lib/                   # 工具库
│   │   ├── prisma.ts          # Prisma客户端
│   │   ├── playwright.ts      # 浏览器自动化
│   │   └── llm.ts             # 大模型API调用
│   └── types/                 # TypeScript类型
└── package.json
```

## API接口

- `POST /api/generate-questions` - 生成问题
- `GET/POST /api/platforms` - 获取/初始化平台
- `POST /api/platforms/login` - 平台登录
- `POST /api/platforms/logout` - 平台登出
- `POST /api/ask-question` - 自动提问
- `POST /api/analyze-response` - 分析回答
- `GET /api/statistics` - 获取统计数据
- `POST /api/suggestions` - 获取优化建议
- `GET/POST /api/settings` - 获取/保存设置

## 支持的AI平台

- 豆包 - https://www.doubao.com
- 千问 - https://tongyi.aliyun.com
- 文心一言 - https://yiyan.baidu.com
- DeepSeek - https://www.deepseek.com
- 智谱 - https://chatglm.cn
- Kimi - https://kimi.moonshot.cn

## 注意事项

1. **浏览器自动化**：首次运行会自动下载Playwright浏览器
2. **平台登录**：由于各平台的安全策略，目前需要手动登录
3. **API限制**：注意您的大模型API调用限额
4. **并发控制**：多平台提问时会自动添加延迟

## 许可证

MIT
