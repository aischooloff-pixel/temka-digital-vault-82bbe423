import { Shield, Zap, Star, Users, Package, CheckCircle2, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useShopStats } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';

const About = () => {
  const { data: stats, isLoading } = useShopStats();

  return (
    <div className="container-main mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-10 sm:mb-14">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">О TEMKA.STORE</h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-4 max-w-2xl mx-auto leading-relaxed">
          Премиум маркетплейс цифровых товаров с мгновенной доставкой, оплатой через CryptoBot и гарантией качества каждого товара.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
        {[
          { icon: Shield, title: 'Надёжная платформа', desc: 'Каждый товар проверяется перед размещением. Транзакции защищены через CryptoBot.' },
          { icon: Zap, title: 'Мгновенная доставка', desc: 'Цифровые товары доставляются автоматически сразу после подтверждения оплаты.' },
          { icon: Star, title: 'Гарантия качества', desc: 'Работаем только с проверенными поставщиками. Поддержка решает любые вопросы.' },
        ].map((item, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8 text-center">
            <item.icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary mx-auto mb-4" />
            <h3 className="font-display font-semibold text-base sm:text-lg mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        <h2 className="font-display text-2xl sm:text-3xl font-bold">Наша миссия</h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          TEMKA.STORE создан, чтобы сделать премиум цифровые товары доступными. Мы находим, проверяем и доставляем цифровые продукты от надёжных поставщиков по всему миру.
        </p>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Наша команда обеспечивает контроль качества, защиту покупателей и оперативную поддержку через Telegram.
        </p>

        {/* Dynamic stats from real DB */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-8">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <Skeleton className="h-8 w-16 mx-auto" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))
          ) : (
            <>
              {(stats?.users ?? 0) > 0 && (
                <div className="text-center">
                  <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="font-display text-2xl sm:text-3xl font-bold text-primary">{stats!.users}</div>
                  <div className="text-xs text-muted-foreground mt-1">Пользователей</div>
                </div>
              )}
              {(stats?.completedOrders ?? 0) > 0 && (
                <div className="text-center">
                  <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="font-display text-2xl sm:text-3xl font-bold text-primary">{stats!.completedOrders}</div>
                  <div className="text-xs text-muted-foreground mt-1">Заказов выполнено</div>
                </div>
              )}
              {(stats?.activeProducts ?? 0) > 0 && (
                <div className="text-center">
                  <Package className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="font-display text-2xl sm:text-3xl font-bold text-primary">{stats!.activeProducts}</div>
                  <div className="text-xs text-muted-foreground mt-1">Товаров</div>
                </div>
              )}
              {(stats?.approvedReviews ?? 0) > 0 && (
                <div className="text-center">
                  <MessageCircle className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="font-display text-2xl sm:text-3xl font-bold text-primary">{stats!.approvedReviews}</div>
                  <div className="text-xs text-muted-foreground mt-1">Отзывов</div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-center pt-6 sm:pt-8">
          <Link to="/catalog"><Button variant="hero" size="lg">Перейти в каталог</Button></Link>
        </div>
      </div>
    </div>
  );
};

export default About;
