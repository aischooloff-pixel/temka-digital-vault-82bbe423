import { Zap, Shield, CheckCircle2, Clock, RefreshCcw, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const Delivery = () => (
  <div className="container-main mx-auto px-4 py-6 sm:py-8 max-w-3xl">
    <div className="text-center mb-8 sm:mb-10">
      <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">Как работает доставка</h1>
      <p className="text-muted-foreground text-sm mt-2">Быстро, безопасно и просто</p>
    </div>
    <div className="space-y-4 sm:space-y-6">
      {[
        { icon: '1️⃣', title: 'Оформите заказ', desc: 'Выберите товары в каталоге, добавьте в корзину и оформите заказ выбранным способом оплаты.' },
        { icon: '2️⃣', title: 'Подтверждение оплаты', desc: 'После подтверждения оплаты ваш заказ автоматически ставится в очередь на доставку.' },
        { icon: '3️⃣', title: 'Мгновенная доставка', desc: 'Для товаров с мгновенной доставкой данные отправляются на email в течение нескольких минут. Товары с ручной доставкой обрабатываются в течение 1-24 часов.' },
        { icon: '4️⃣', title: 'Доступ к товару', desc: 'Следуйте приложенным инструкциям для доступа и защиты вашего товара. Инструкции по настройке включены в каждую покупку.' },
      ].map((step, i) => (
        <div key={i} className="flex gap-3 sm:gap-4 p-4 sm:p-5 bg-card border border-border/50 rounded-xl">
          <span className="text-xl sm:text-2xl shrink-0">{step.icon}</span>
          <div>
            <h3 className="font-display font-semibold text-sm sm:text-base">{step.title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
    <div className="text-center mt-6 sm:mt-8">
      <Link to="/catalog"><Button variant="hero" size="lg">Начать покупки</Button></Link>
    </div>
  </div>
);

export const Guarantees = () => (
  <div className="container-main mx-auto px-4 py-6 sm:py-8 max-w-3xl">
    <div className="text-center mb-8 sm:mb-10">
      <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">Наши гарантии</h1>
      <p className="text-muted-foreground text-sm mt-2">Ваше удовлетворение — наш приоритет</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {[
        { icon: Shield, title: 'Защита покупателя', desc: 'Каждая покупка защищена. Если товар не соответствует описанию, мы предоставим замену или полный возврат.' },
        { icon: CheckCircle2, title: 'Проверенные товары', desc: 'Все товары тестируются и проверяются перед размещением. Мы гарантируем подлинность и качество.' },
        { icon: RefreshCcw, title: 'Бесплатная замена', desc: 'Если товар перестал работать в гарантийный период, мы заменим его бесплатно.' },
        { icon: Headphones, title: 'Поддержка 24/7', desc: 'Наша команда поддержки всегда доступна для помощи с любыми вопросами.' },
        { icon: Clock, title: 'Быстрое решение', desc: 'Проблемы обычно решаются в течение 1-2 часов. Мы ценим ваше время.' },
        { icon: Zap, title: 'Мгновенная доставка', desc: 'Большинство товаров доставляется в течение минут. Без ожидания, без задержек.' },
      ].map((g, i) => (
        <div key={i} className="p-4 sm:p-5 bg-card border border-border/50 rounded-xl">
          <g.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-2" />
          <h3 className="font-display font-semibold text-xs sm:text-sm">{g.title}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{g.desc}</p>
        </div>
      ))}
    </div>
    <div className="text-center mt-6 sm:mt-8">
      <Link to="/catalog"><Button variant="hero" size="lg">Покупайте с уверенностью</Button></Link>
    </div>
  </div>
);
