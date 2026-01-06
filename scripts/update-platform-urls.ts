import { prisma } from '../src/lib/prisma';

async function updatePlatformUrls() {
  console.log('开始更新平台URL...');

  const platforms = [
    { name: '豆包', url: 'https://www.doubao.com/chat/' },
    { name: '千问', url: 'https://qianwen.aliyun.com/chat' },
    { name: '文心一言', url: 'https://yiyan.baidu.com' },
    { name: 'DeepSeek', url: 'https://chat.deepseek.com' },
    { name: '智谱', url: 'https://chatglm.cn' },
    { name: 'Kimi', url: 'https://kimi.moonshot.cn' },
  ];

  for (const platform of platforms) {
    const existing = await prisma.platform.findFirst({
      where: { name: platform.name },
    });

    if (existing) {
      await prisma.platform.update({
        where: { id: existing.id },
        data: { url: platform.url },
      });
      console.log(`✓ 更新 ${platform.name}: ${platform.url}`);
    } else {
      await prisma.platform.create({
        data: {
          name: platform.name,
          url: platform.url,
          isLoggedIn: false,
        },
      });
      console.log(`+ 创建 ${platform.name}: ${platform.url}`);
    }
  }

  console.log('\n平台URL更新完成！');
  await prisma.$disconnect();
}

updatePlatformUrls().catch(console.error);
