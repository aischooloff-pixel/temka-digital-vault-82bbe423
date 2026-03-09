import { Shield, Zap, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const About = () => (
  <div className="container-main mx-auto px-4 py-6 sm:py-8">
    <div className="text-center mb-8 sm:mb-12">
      <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">О TEMKA.STORE</h1>
      <p className="text-muted-foreground text-sm mt-3 max-w-2xl mx-auto">
        Мы — премиум цифровой маркетплейс, посвящённый предоставлению проверенных, высококачественных цифровых товаров с мгновенной доставкой и защитой покупателя.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16">
      {[
        { icon: Shield, title: 'Надёжная платформа', desc: 'Более 50 000 довольных клиентов доверяют нам. Каждая транзакция защищена.' },
        { icon: Zap, title: 'Мгновенная доставка', desc: 'Большинство товаров доставляется мгновенно после оплаты. Без ожидания — просто мгновенный доступ.' },
        { icon: Star, title: 'Гарантия качества', desc: 'Каждый товар проверяется и тестируется перед размещением. Мы поддерживаем высочайшие стандарты.' },
      ].map((item, i) => (
        <div key={i} className="bg-card border border-border/50 rounded-xl p-5 sm:p-6 text-center">
          <item.icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary mx-auto mb-3" />
          <h3 className="font-display font-semibold text-sm sm:text-base mb-2">{item.title}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
        </div>
      ))}
    </div>

    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
      <h2 className="font-display text-xl sm:text-2xl font-bold">Наша миссия</h2>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
        TEMKA.STORE основан с простой миссией: сделать премиум цифровые товары доступными для каждого. Мы верим, что высококачественное ПО, подписки и цифровые сервисы должны быть доступны по справедливым ценам с надёжной доставкой.
      </p>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
        Наша команда работает круглосуточно, чтобы находить, проверять и доставлять цифровые товары от проверенных поставщиков по всему миру. Мы вкладываемся в контроль качества, защиту покупателей и клиентскую поддержку.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 py-6 sm:py-8">
        {[
          { value: '50K+', label: 'Клиентов' },
          { value: '12K+', label: 'Товаров продано' },
          { value: '99.8%', label: 'Довольных' },
          { value: '24/7', label: 'Поддержка' },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <div className="font-display text-xl sm:text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="text-center pt-6 sm:pt-8">
        <Link to="/catalog"><Button variant="hero" size="lg">Перейти в каталог</Button></Link>
      </div>
    </div>
  </div>
);

export default About;
