import { useState } from 'react';
import { User, Package, Heart, Headphones, Bell, Settings, Shield, Gift, LogOut, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const mockOrders = [
  { id: 'TK-A1B2C3', product: 'Windows 11 Pro — Вечный ключ', date: '2024-12-15', status: 'delivered', price: 24.99 },
  { id: 'TK-D4E5F6', product: 'Netflix Премиум — 12 месяцев', date: '2024-12-10', status: 'delivered', price: 29.99 },
  { id: 'TK-G7H8I9', product: 'Spotify Премиум — 6 месяцев', date: '2024-12-08', status: 'processing', price: 19.99 },
];

const tabs = [
  { id: 'dashboard', label: 'Обзор', icon: User },
  { id: 'orders', label: 'История заказов', icon: Package },
  { id: 'favorites', label: 'Избранное', icon: Heart },
  { id: 'support', label: 'Тикеты', icon: Headphones },
  { id: 'notifications', label: 'Уведомления', icon: Bell },
  { id: 'settings', label: 'Настройки', icon: Settings },
];

const Account = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container-main mx-auto px-4 py-6 sm:py-8">
      <h1 className="font-display text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Мой аккаунт</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar — horizontal scroll on mobile */}
        <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
          <button className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm text-destructive hover:bg-destructive/10 transition-colors whitespace-nowrap shrink-0 lg:mt-4">
            <LogOut className="w-4 h-4" /> Выйти
          </button>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'dashboard' && (
            <div className="space-y-4 sm:space-y-6">
              {/* Welcome */}
              <div className="bg-card border border-border/50 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg sm:text-xl font-bold font-display">U</div>
                  <div>
                    <h2 className="font-display font-semibold text-base sm:text-lg">Добро пожаловать!</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">user@example.com</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { label: 'Заказов', value: '3', icon: Package },
                  { label: 'Избранное', value: '5', icon: Heart },
                  { label: 'Купоны', value: '1', icon: Gift },
                  { label: 'Тикеты', value: '0', icon: Headphones },
                ].map((s, i) => (
                  <div key={i} className="bg-card border border-border/50 rounded-xl p-3 sm:p-4 text-center">
                    <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                    <div className="font-display font-bold text-lg sm:text-xl">{s.value}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent Orders */}
              <div className="bg-card border border-border/50 rounded-xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-sm sm:text-base">Последние заказы</h3>
                  <button onClick={() => setActiveTab('orders')} className="text-xs sm:text-sm text-primary hover:underline">Все заказы</button>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {mockOrders.slice(0, 2).map(order => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg gap-2">
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-medium truncate">{order.product}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 sm:gap-2 mt-0.5">
                          <span className="font-mono">{order.id}</span> · {order.date}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs sm:text-sm font-bold">${order.price}</div>
                        <div className={`text-[10px] sm:text-xs flex items-center gap-1 mt-0.5 ${order.status === 'delivered' ? 'text-primary' : 'text-warning'}`}>
                          {order.status === 'delivered' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {order.status === 'delivered' ? 'Доставлен' : 'В обработке'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Referral */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 sm:p-6">
                <Gift className="w-7 h-7 sm:w-8 sm:h-8 text-primary mb-3" />
                <h3 className="font-display font-semibold text-sm sm:text-base">Пригласи друга</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Поделитесь реферальной ссылкой и получайте 5% комиссии с каждой покупки.</p>
                <div className="flex gap-2 mt-4">
                  <input type="text" readOnly value="https://temka.store/ref/USER123"
                    className="flex-1 h-9 px-3 bg-secondary border border-border rounded-lg text-xs text-muted-foreground font-mono min-w-0" />
                  <Button size="sm" onClick={() => navigator.clipboard.writeText('https://temka.store/ref/USER123')}>Копировать</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-card border border-border/50 rounded-xl p-4 sm:p-6">
              <h3 className="font-display font-semibold mb-4">История заказов</h3>
              <div className="space-y-2 sm:space-y-3">
                {mockOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 sm:p-4 bg-secondary/30 rounded-lg gap-2">
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium truncate">{order.product}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 sm:gap-2 mt-1">
                        <span className="font-mono">{order.id}</span> · {order.date}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-bold">${order.price}</div>
                      <div className={`text-[10px] sm:text-xs flex items-center gap-1 mt-1 ${order.status === 'delivered' ? 'text-primary' : 'text-warning'}`}>
                        {order.status === 'delivered' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {order.status === 'delivered' ? 'Доставлен' : 'В обработке'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="text-center py-12">
              <Heart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-display font-semibold">Ваше избранное</h3>
              <p className="text-sm text-muted-foreground mt-1">Сохранённые товары появятся здесь</p>
              <Link to="/catalog"><Button variant="outline" className="mt-4">Перейти в каталог</Button></Link>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="text-center py-12">
              <Headphones className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-display font-semibold">Нет открытых тикетов</h3>
              <p className="text-sm text-muted-foreground mt-1">У вас нет активных обращений в поддержку</p>
              <Link to="/support"><Button variant="outline" className="mt-4">Создать тикет</Button></Link>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="text-center py-12">
              <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-display font-semibold">Всё прочитано</h3>
              <p className="text-sm text-muted-foreground mt-1">Новых уведомлений нет</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-card border border-border/50 rounded-xl p-4 sm:p-6">
                <h3 className="font-display font-semibold mb-4">Настройки профиля</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1.5">Email</label>
                    <input type="email" value="user@example.com" readOnly className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1.5">Telegram</label>
                    <input type="text" placeholder="@username" className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <Button>Сохранить</Button>
                </div>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-4 sm:p-6">
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Безопасность</h3>
                <div className="space-y-3 max-w-md">
                  <Button variant="outline" className="w-full justify-start">Изменить пароль</Button>
                  <Button variant="outline" className="w-full justify-start">Включить двухфакторную аутентификацию</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Account;
