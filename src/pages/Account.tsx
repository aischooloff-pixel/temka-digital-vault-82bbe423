import { Package, Clock, CheckCircle2, Gift, MessageCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const mockOrders = [
  { id: 'TK-A1B2C3', product: 'Windows 11 Pro — Вечный ключ', date: '2024-12-15', status: 'delivered', price: 24.99 },
  { id: 'TK-D4E5F6', product: 'Netflix Премиум — 12 месяцев', date: '2024-12-10', status: 'delivered', price: 29.99 },
  { id: 'TK-G7H8I9', product: 'Spotify Премиум — 6 месяцев', date: '2024-12-08', status: 'processing', price: 19.99 },
];

const Account = () => {
  return (
    <div className="container-main mx-auto px-4 py-4 sm:py-6">
      {/* Telegram Profile */}
      <div className="bg-card border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold font-display">T</div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-semibold text-base truncate">Telegram User</h2>
            <p className="text-xs text-muted-foreground">@username</p>
          </div>
        </div>
        <div className="mt-3 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-[10px] text-primary flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Аккаунт подключён через Telegram
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          { label: 'Заказов', value: '3', icon: Package },
          { label: 'Избранное', value: '5', icon: Heart },
          { label: 'Купоны', value: '1', icon: Gift },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-xl p-3 text-center">
            <s.icon className="w-4 h-4 text-primary mx-auto mb-1.5" />
            <div className="font-display font-bold text-lg">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Orders */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-sm">Мои заказы</h3>
        </div>
        <div className="space-y-2">
          {mockOrders.map(order => (
            <div key={order.id} className="bg-card border border-border/50 rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{order.product}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <span className="font-mono">{order.id}</span> · {order.date}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold">${order.price}</div>
                <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${order.status === 'delivered' ? 'text-primary' : 'text-warning'}`}>
                  {order.status === 'delivered' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {order.status === 'delivered' ? 'Доставлен' : 'В обработке'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Favorites link */}
      <Link to="/favorites" className="mt-4 bg-card border border-border/50 rounded-xl p-3 flex items-center justify-between block">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Избранные товары</span>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>

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

      {/* Referral */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mt-4">
        <Gift className="w-6 h-6 text-primary mb-2" />
        <h3 className="font-display font-semibold text-sm">Пригласи друга</h3>
        <p className="text-xs text-muted-foreground mt-1">Получайте 5% комиссии с каждой покупки.</p>
        <div className="flex gap-2 mt-3">
          <input type="text" readOnly value="https://t.me/temkastore_bot?ref=USER123"
            className="flex-1 h-8 px-3 bg-secondary border border-border rounded-lg text-[10px] text-muted-foreground font-mono min-w-0" />
          <Button size="sm" className="text-xs h-8" onClick={() => navigator.clipboard.writeText('https://t.me/temkastore_bot?ref=USER123')}>Копировать</Button>
        </div>
      </div>
    </div>
  );
};

export default Account;
