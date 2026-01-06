import { prisma } from '../src/lib/prisma';

async function updateQianwenUrl() {
  console.log('更新千问地址...');

  const platform = await prisma.platform.findFirst({
    where: { name: '千问' },
  });

  if (platform) {
    await prisma.platform.update({
      where: { id: platform.id },
      data: { url: 'https://www.qianwen.com' },
    });
    console.log('✓ 千问地址已更新为: https://www.qianwen.com');
  } else {
    console.log('✗ 未找到千问平台');
  }

  await prisma.$disconnect();
}

updateQianwenUrl().catch(console.error);
