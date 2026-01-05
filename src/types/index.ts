// TypeScript类型定义

export interface Platform {
  id: string;
  name: string;
  url: string;
  isLoggedIn: boolean;
  sessionData?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  targetAudience: string;
  sellingPoints: string;
  coreContent: string;
  createdAt: Date;
}

export interface Question {
  id: string;
  productId: string;
  text: string;
  createdAt: Date;
}

export interface Query {
  id: string;
  questionId: string;
  platformId: string;
  response: string;
  hasProduct: boolean;
  sources?: string | null;
  createdAt: Date;
}

export interface Analysis {
  id: string;
  totalQueries: number;
  mentionedCount: number;
  adoptionRate: number;
  topSources: string;
  createdAt: Date;
}

export interface Settings {
  id: string;
  llmApiUrl: string;
  llmApiKey?: string | null;
  llmModel: string;
}

// 支持的平台配置
export const SUPPORTED_PLATFORMS = [
  { id: 'doubao', name: '豆包', url: 'https://www.doubao.com' },
  { id: 'qianwen', name: '千问', url: 'https://www.qianwen.com' },
  { id: 'yiyan', name: '文心一言', url: 'https://yiyan.baidu.com' },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://www.deepseek.com' },
  { id: 'zhipu', name: '智谱', url: 'https://chatglm.cn' },
  { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn' },
] as const;

export type PlatformId = typeof SUPPORTED_PLATFORMS[number]['id'];

// API请求/响应类型
export interface GenerateQuestionsRequest {
  targetAudience: string;
  productName: string;
  sellingPoints: string;
  coreContent: string;
}

export interface GenerateQuestionsResponse {
  questions: string[];
}

export interface AskQuestionRequest {
  questionId: string;
  platformIds: string[];
}

export interface AskQuestionResponse {
  results: Query[];
}

export interface AnalyzeResponseRequest {
  queryId: string;
  productInfo: {
    name: string;
    sellingPoints: string;
    coreContent: string;
  };
}

export interface AnalyzeResponseResponse {
  hasProduct: boolean;
  sources: SourceInfo[];
  matchedPoints: string[];
}

export interface SourceInfo {
  url: string;
  title?: string;
  snippet?: string;
}

export interface StatisticsResponse {
  adoptionRate: number;
  platformStats: PlatformStats[];
  topSources: SourceInfo[];
}

export interface PlatformStats {
  platformId: string;
  platformName: string;
  totalQueries: number;
  mentionedCount: number;
  adoptionRate: number;
}

export interface SuggestionsRequest {
  analysisData: {
    adoptionRate: number;
    platformStats: PlatformStats[];
    topSources: SourceInfo[];
  };
}

export interface SuggestionsResponse {
  suggestions: string[];
}
