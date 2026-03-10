import { Package, CheckCircle2, Clock, MessageCircle, ChevronRight, AlertCircle, XCircle, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useTelegram } from '@/contexts/TelegramContext';
import { useOrders, useUserStats, useUserProfile } from '@/hooks/useOrders';
import { Skeleton } from '@/components/ui/skeleton';
import { ORDER_STATUS_LABELS } from '@/types/database';
import type { DbOrder } from '@/types/database';

const statusIcon = (status: DbOrder['status']) => {
  switch (status) {
    case 'completed': case 'delivered': case 'paid':
      return <CheckCircle2 className="w-3 h-3 text-primary" />;
    case 'processing': case 'awaiting_payment': case 'pending':
      return <Clock className="w-3 h-3 text-warning" />;
    case 'cancelled':
      return <XCircle className="w-3 h-3 text-muted-foreground" />;
    case 'error':
      return <AlertCircle className="w-3 h-3 text-destructive" />;
    default:
      return <Clock className="w-3 h-3" />;
  }
};

const statusColor = (status: DbOrder['status']) => {
  switch (status) {
    case 'completed': case 'delivered': case 'paid': return 'text-primary';
    case 'processing': case 'awaiting_payment': case 'pending': return 'text-warning';
    case 'cancelled': return 'text-muted-foreground';
    case 'error': return 'text-destructive';
    default: return 'text-muted-foreground';
  }
};

const Account = () => {
  const { user, isInTelegram } = useTelegram();
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const { data: profile, isLoading: profileLoading } = useUserProfile();

  const displayName = user
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : 'Telegram User';
  const username = user?.username ? `@${user.username}` : '';
  const avatar = user?.firstName?.[0]?.toUpperCase() || 'T';

  return (
    <div className="container-main mx-auto px-4 py-4 sm:py-6">
      {/* Telegram Profile */}
      <div className="bg-card border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-3">
          {user?.photoUrl ? (
            <img src={user.photoUrl} alt={displayName} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold font-display">{avatar}</div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-semibold text-base truncate">{displayName}</h2>
            {username && <p className="text-xs text-muted-foreground">{username}</p>}
            {user?.id && <p className="text-[10px] text-muted-foreground/60">ID: {user.id}</p>}
          </div>
          {user?.isPremium && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gold/30 bg-gold/10 text-gold">⭐ Premium</span>
          )}
        </div>
        <div className="mt-3 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-[10px] text-primary flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {isInTelegram ? 'Аккаунт подключён через Telegram' : 'Откройте в Telegram для полного доступа'}
          </p>
        </div>
      </div>

      {/* Balance */}
      <div className="mt-4 bg-card border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Баланс</div>
            {profileLoading ? (
              <Skeleton className="h-6 w-20 mt-0.5" />
            ) : (
              <div className="font-display font-bold text-xl text-primary">
                ${Number(profile?.balance || 0).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {statsLoading ? (
          <>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </>
        ) : (
          <>
            <div className="bg-card border border-border/50 rounded-xl p-3 text-center">
              <Package className="w-4 h-4 text-primary mx-auto mb-1.5" />
              <div className="font-display font-bold text-lg">{stats?.orderCount || 0}</div>
              <div className="text-[10px] text-muted-foreground">Заказов</div>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-3 text-center">
              <CheckCircle2 className="w-4 h-4 text-primary mx-auto mb-1.5" />
              <div className="font-display font-bold text-lg">${stats?.totalSpent?.toFixed(2) || '0.00'}</div>
              <div className="text-[10px] text-muted-foreground">Потрачено</div>
            </div>
          </>
        )}
      </div>

      {/* Orders */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-sm">Мои заказы</h3>
        </div>
        {ordersLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">У вас пока нет заказов</p>
            <Link to="/catalog"><Button variant="outline" size="sm" className="mt-3">Перейти в каталог</Button></Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map(order => (
              <div key={order.id} className="bg-card border border-border/50 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">Заказ {order.order_number}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold">${Number(order.total_amount).toFixed(2)}</div>
                  <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${statusColor(order.status)}`}>
                    {statusIcon(order.status)}
                    {ORDER_STATUS_LABELS[order.status]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Support */}
      <a href="https://t.me/paveldurov" target="_blank" rel="noopener noreferrer" className="mt-4 block">
        <div className="bg-card border border-border/50 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Поддержка в Telegram</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </a>
    </div>
  );
};

export default Account;
