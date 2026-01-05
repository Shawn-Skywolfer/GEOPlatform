import { prisma } from './src/lib/prisma.js';

const SUPPORTED_PLATFORMS = [
  { id: 'doubao', name: '豆包', url: 'https://www.doubao.com' },
  { id: 'qianwen', name: '千问', url: 'https://tongyi.aliyun.com' },
  { id: 'yiyan', name: '文心一言', url: 'https://yiyan.baidu.com' },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://www.deepseek.com' },
  { id: 'zhipu', name: '智谱', url: 'https://chatglm.cn' },
  { id: 'kimi', name: 'Kimi', url: 'https://kimi.moonshot.cn' },
];

async function initPlatforms() {
  console.log('开始初始化平台数据...');

  for (const platform of SUPPORTED_PLATFORMS) {
    const existing = await prisma.platform.findFirst({
      where: { name: platform.name },
    });

    if (!existing) {
      await prisma.platform.create({
        data: {
          name: platform.name,
          url: platform.url,
          isLoggedIn: false,
        },
      });
      console.log(`✓ 创建平台: ${platform.name}`);
    } else {
      console.log(`- 平台已存在: ${platform.name}`);
    }
  }

  const allPlatforms = await prisma.platform.findMany();
  console.log(`\n当前平台总数: ${allPlatforms.length}`);
  console.log('平台列表:', allPlatforms.map(p => p.name));

  await prisma.$disconnect();
}

initPlatforms().catch(console.error);
