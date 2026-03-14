import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Store, Bot, Wifi, Package, ShoppingCart, Users, DollarSign, Calendar } from 'lucide-react';

interface ShopData {
  id: string;
  name: string;
  slug: string;
  status: string;
  bot_username: string | null;
  webhook_status: string;
  created_at: string;
  stats?: {
    products: number;
    orders: number;
    customers: number;
    revenue: number;
  };
}

interface Props {
  shop: ShopData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const ShopInfoSheet = ({ shop, open, onOpenChange }: Props) => {
  if (!shop) return null;

  const stats = shop.stats;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <Store className="w-4 h-4 text-blue-500" />
            {shop.name}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Статус</span>
            <Badge variant={shop.status === 'active' ? 'default' : 'secondary'} className="text-xs">
              {shop.status === 'active' ? '✅ Активен' : shop.status === 'paused' ? '⏸ Приостановлен' : shop.status}
            </Badge>
          </div>

          {/* Bot */}
          {shop.bot_username && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" /> Бот
              </span>
              <span className="text-sm font-medium text-gray-700">@{shop.bot_username}</span>
            </div>
          )}

          {/* Webhook */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5" /> Webhook
            </span>
            <Badge variant={shop.webhook_status === 'active' ? 'default' : 'secondary'} className="text-xs">
              {shop.webhook_status === 'active' ? '✅ Активен' : '❌ Неактивен'}
            </Badge>
          </div>

          {/* Created */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Создан
            </span>
            <span className="text-xs text-gray-400">{formatDate(shop.created_at)}</span>
          </div>

          {/* Stats */}
          {stats && (
            <>
              <Separator />
              <p className="text-xs text-gray-400 font-medium">Статистика</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <Package className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{stats.products}</p>
                  <p className="text-[10px] text-gray-400">Товаров</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <ShoppingCart className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{stats.orders}</p>
                  <p className="text-[10px] text-gray-400">Заказов</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">{stats.customers}</p>
                  <p className="text-[10px] text-gray-400">Клиентов</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <DollarSign className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900">${stats.revenue.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">Выручка</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 pt-2">
          <DrawerClose asChild>
            <Button variant="outline" size="sm" className="w-full">Закрыть</Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ShopInfoSheet;
