import React, { useEffect, useState } from 'react';
import { useTelegram } from '@/contexts/TelegramContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, Crown, Wallet, Calendar, Clock, Bot, Wifi, ExternalLink, ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';

interface ProfileData {
  user: {
    id: string;
    telegram_id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    is_premium?: boolean;
    created_at: string;
  };
  subscription: {
    status: string;
    expires_at: string | null;
    trial_started_at: string | null;
    has_used_trial: boolean;
    pricing_tier: string | null;
    billing_price_usd: number | null;
    first_paid_at: string | null;
  };
  balance: number;
  shops: {
    id: string;
    name: string;
    slug: string;
    status: string;
    bot_username: string | null;
    webhook_status: string;
    created_at: string;
  }[];
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active: { label: 'Активна', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: <ShieldCheck className="w-5 h-5 text-emerald-500" /> },
  trial: { label: 'Пробный период', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: <Clock className="w-5 h-5 text-blue-500" /> },
  expired: { label: 'Истекла', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: <AlertTriangle className="w-5 h-5 text-red-500" /> },
  grace_period: { label: 'Льготный период', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <AlertTriangle className="w-5 h-5 text-amber-500" /> },
  cancelled: { label: 'Отменена', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-300', icon: <AlertTriangle className="w-5 h-5 text-gray-400" /> },
  blocked: { label: 'Заблокирована', color: 'text-red-700', bg: 'bg-red-50 border-red-300', icon: <AlertTriangle className="w-5 h-5 text-red-600" /> },
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const PlatformProfile: React.FC = () => {
  const { user: tgUser, initData, isInTelegram } = useTelegram();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mockData: ProfileData = {
    user: {
      id: 'demo-id',
      telegram_id: 123456789,
      first_name: 'Александр',
      last_name: 'Иванов',
      username: 'alex_ivanov',
      is_premium: true,
      created_at: '2025-01-15T00:00:00Z',
    },
    subscription: {
      status: 'active',
      expires_at: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
      trial_started_at: null,
      has_used_trial: true,
      pricing_tier: 'early',
      billing_price_usd: 3,
      first_paid_at: '2025-02-01T00:00:00Z',
    },
    balance: 12.50,
    shops: [
      {
        id: 'shop-1',
        name: 'Digital Store',
        slug: 'digital-store',
        status: 'active',
        bot_username: 'digital_store_bot',
        webhook_status: 'active',
        created_at: '2025-02-10T00:00:00Z',
      },
    ],
  };

  useEffect(() => {
    if (!initData || !tgUser) {
      // Use mock data as fallback for preview
      setData(mockData);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data: res, error: err } = await supabase.functions.invoke('get-my-data', {
          body: { initData, action: 'platform-profile' },
        });
        if (err) throw err;
        if (res?.error) throw new Error(res.error);
        setData(res);
      } catch (e: any) {
        setError(e.message || 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    })();
  }, [initData, tgUser]);

  if (error || (!loading && !data)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F0F7FF] to-white flex items-center justify-center p-6">
        <Card className="max-w-md w-full border border-red-100 bg-white shadow-lg">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
            <p className="text-gray-700 font-medium">Не удалось загрузить профиль</p>
            <p className="text-gray-400 text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { user, subscription, shops } = data;
  const subCfg = statusConfig[subscription.status] || statusConfig.expired;
  const daysLeft = daysUntil(subscription.expires_at);
  const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F7FF] to-white">
      <div className="max-w-lg mx-auto p-4 pb-8 space-y-4">

        {/* Block 1: Profile Header */}
        <Card className="border border-blue-100 bg-white shadow-sm overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-[#2B7FFF] to-[#60A5FA]" />
          <CardContent className="p-5 -mt-10">
            <div className="flex items-end gap-4">
              <Avatar className="w-16 h-16 border-[3px] border-white shadow-md">
                {user.photo_url ? (
                  <AvatarImage src={user.photo_url} alt={user.first_name} />
                ) : null}
                <AvatarFallback className="bg-blue-500 text-white text-lg font-semibold">
                  {initials || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-gray-900 truncate">
                    {user.first_name} {user.last_name || ''}
                  </h1>
                  {user.is_premium && (
                    <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0 text-[10px] px-1.5 py-0 gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Premium
                    </Badge>
                  )}
                </div>
                {user.username && (
                  <p className="text-sm text-gray-400">@{user.username}</p>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Подключён через Telegram
              <span className="ml-auto text-gray-300">ID {user.telegram_id}</span>
            </div>
          </CardContent>
        </Card>

        {/* Block 2: Balance */}
        <Card className="border border-blue-100 bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Баланс</p>
                  <p className="text-2xl font-bold text-gray-900">${data.balance.toFixed(2)}</p>
                </div>
              </div>
              <button className="px-4 py-2 rounded-xl bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition-colors">
                Пополнить
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Block 3: Subscription — dominant */}
        <Card className={`border shadow-sm overflow-hidden ${subCfg.bg}`}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
                  {subCfg.icon}
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Подписка</p>
                  <p className={`text-lg font-bold ${subCfg.color}`}>{subCfg.label}</p>
                </div>
              </div>
              {subscription.billing_price_usd != null && (
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-gray-900">${subscription.billing_price_usd}</p>
                  <p className="text-[10px] text-gray-400 font-medium">/ мес</p>
                </div>
              )}
            </div>

            {/* Details row */}
            <div className="grid grid-cols-2 gap-3">
              {subscription.expires_at && (
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Действует до
                  </p>
                  <p className="text-sm font-semibold text-gray-800">{formatDate(subscription.expires_at)}</p>
                </div>
              )}
              {daysLeft !== null && (
                <div className="bg-white/60 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Осталось
                  </p>
                  <p className={`text-sm font-semibold ${daysLeft <= 3 ? 'text-red-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-gray-800'}`}>
                    {daysLeft > 0 ? `${daysLeft} дн.` : 'Истекает сегодня'}
                  </p>
                </div>
              )}
            </div>

            {subscription.pricing_tier && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                Тариф: <span className="font-medium text-gray-700 capitalize">{subscription.pricing_tier}</span>
              </div>
            )}

            {subscription.status === 'trial' && (
              <div className="bg-blue-100/50 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-700 font-medium">
                  🎉 Вы используете пробный период. Оформите подписку, чтобы продолжить.
                </p>
              </div>
            )}

            {subscription.status === 'expired' && (
              <div className="bg-red-100/50 rounded-xl p-3 text-center">
                <p className="text-xs text-red-700 font-medium">
                  ⚠️ Подписка истекла. Продлите, чтобы продолжить работу с платформой.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Block 4: Shops */}
        <Card className="border border-blue-100 bg-white shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-4.5 h-4.5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">Мои магазины</h3>
              </div>
              <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-0 text-xs">
                {shops.length}
              </Badge>
            </div>

            {shops.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <Store className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">У вас пока нет магазинов</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shops.map((shop) => (
                  <div key={shop.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 hover:bg-blue-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                      {shop.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{shop.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span className={`inline-flex items-center gap-0.5 ${shop.status === 'active' ? 'text-emerald-500' : 'text-gray-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${shop.status === 'active' ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                          {shop.status === 'active' ? 'Активен' : shop.status}
                        </span>
                        {shop.bot_username && (
                          <span className="flex items-center gap-0.5">
                            <Bot className="w-2.5 h-2.5" /> @{shop.bot_username}
                          </span>
                        )}
                        {shop.webhook_status === 'active' && (
                          <span className="flex items-center gap-0.5 text-emerald-500">
                            <Wifi className="w-2.5 h-2.5" /> Webhook
                          </span>
                        )}
                      </div>
                    </div>
                    <a
                      href={`/shop/${shop.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-blue-400" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-gray-300 pt-2">
          Платформа · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default PlatformProfile;
