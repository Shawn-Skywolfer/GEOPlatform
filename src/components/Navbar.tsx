'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: '仪表板' },
  { href: '/questions', label: '问题生成' },
  { href: '/platforms', label: '平台管理' },
  { href: '/analysis', label: '分析结果' },
  { href: '/statistics', label: '数据统计' },
  { href: '/settings', label: '系统设置' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-primary">GEO</span>
              <span className="text-sm text-muted-foreground">运营平台</span>
            </Link>
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={pathname === item.href ? 'default' : 'ghost'}
                    size="sm"
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
