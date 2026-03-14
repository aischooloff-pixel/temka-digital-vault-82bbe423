import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Clock, AlertTriangle, Crown, Calendar, CreditCard, Sparkles } from 'lucide-react';

interface SubscriptionData {
  status: string;
  expires_at: string | null;
  trial_started_at: string | null;
  has_used_trial: boolean;
  pricing_tier: string | null;
  billing_price_usd: number | null;
  first_paid_at: string | null;
}

interface Props {
  subscription: SubscriptionData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenew: () => void;
}

const statusConfig: Record<string, { label: string; color: string; badgeVariant: 'default' | 'secondary' | 'destructive' }> = {
  active: { label: 'Активна', color: 'text-emerald-600', badgeVariant: 'default' },
  trial: { label: 'Пробный период', color: 'text-blue-600', badgeVariant: 'secondary' },
  expired: { label: 'Истекла', color: 'text-red-600', badgeVariant: 'destructive' },
  grace_period: { label: 'Льготный период', color: 'text-amber-600', badgeVariant: 'secondary' },
  cancelled: { label: 'Отменена', color: 'text-gray-600', badgeVariant: 'secondary' },
  blocked: { label: 'Заблокирована', color: 'text-red-700', badgeVariant: 'destructive' },
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const SubscriptionSheet = ({ subscription, open, onOpenChange, onRenew }: Props) => {
  const cfg = statusConfig[subscription.status] || statusConfig.expired;
  const daysLeft = daysUntil(subscription.expires_at);
  const needsRenewal = ['expired', 'trial', 'grace_period', 'cancelled'].includes(subscription.status);
  const tierLabels: Record<string, string> = { early_3: '🎉 Early Bird', standard_5: 'Стандартный' };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <CreditCard className="w-4 h-4 text-blue-500" />
            Подписка
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Статус</span>
            <Badge variant={cfg.badgeVariant} className="text-xs">{cfg.label}</Badge>
          </div>

          <Separator />

          {/* Price */}
          {subscription.billing_price_usd != null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Стоимость</span>
              <span className="text-lg font-bold text-gray-900">${subscription.billing_price_usd}/мес</span>
            </div>
          )}

          {/* Tier */}
          {subscription.pricing_tier && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Тариф</span>
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                {tierLabels[subscription.pricing_tier] || subscription.pricing_tier}
              </span>
            </div>
          )}

          <Separator />

          {/* Expiration */}
          {subscription.expires_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Действует до
              </span>
              <span className="text-sm font-medium text-gray-800">{formatDate(subscription.expires_at)}</span>
            </div>
          )}

          {daysLeft !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Осталось
              </span>
              <span className={`text-sm font-bold ${daysLeft <= 3 ? 'text-red-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {daysLeft > 0 ? `${daysLeft} дн.` : 'Истекает сегодня'}
              </span>
            </div>
          )}

          {/* First paid */}
          {subscription.first_paid_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Первая оплата</span>
              <span className="text-xs text-gray-400">{formatDate(subscription.first_paid_at)}</span>
            </div>
          )}

          {/* Includes */}
          <Separator />
          <div>
            <p className="text-xs text-gray-400 font-medium mb-2">Включено в подписку:</p>
            <div className="space-y-1.5">
              {['1 магазин с собственным ботом', 'Приём платежей через CryptoBot', 'Авто-доставка цифровых товаров', '7 дней бесплатного пробного периода'].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <Sparkles className="w-3 h-3 text-blue-400 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Warning messages */}
          {subscription.status === 'trial' && (
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-700 font-medium">
                🎉 Вы используете пробный период. Оформите подписку, чтобы продолжить.
              </p>
            </div>
          )}
          {subscription.status === 'expired' && (
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-xs text-red-700 font-medium">
                ⚠️ Подписка истекла. Магазины приостановлены. Продлите для возобновления.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 pt-2 space-y-2">
          {needsRenewal && (
            <Button onClick={onRenew} className="w-full bg-[#2B7FFF] hover:bg-[#2070EE] text-white">
              💳 {subscription.status === 'trial' ? 'Оформить подписку' : 'Продлить подписку'}
              {subscription.billing_price_usd != null && ` — $${subscription.billing_price_usd}`}
            </Button>
          )}
          <DrawerClose asChild>
            <Button variant="outline" size="sm" className="w-full">Закрыть</Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SubscriptionSheet;
