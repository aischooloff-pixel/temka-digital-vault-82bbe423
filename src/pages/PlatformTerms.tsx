import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PlatformTerms = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link to="/">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-xs text-muted-foreground">
          <ArrowLeft className="w-3 h-3 mr-1" /> Назад
        </Button>
      </Link>

      <h1 className="text-xl font-bold mb-1">Условия использования</h1>
      <p className="text-[10px] text-muted-foreground mb-5">Последнее обновление: 13 марта 2026</p>

      <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
        <section>
          <h2 className="font-semibold text-sm text-foreground mb-1">1. Общие положения</h2>
          <p>Платформа предоставляет инструменты для создания и управления Telegram-магазинами цифровых товаров. Используя сервис, вы соглашаетесь с настоящими условиями.</p>
        </section>

        <section>
          <h2 className="font-semibold text-sm text-foreground mb-1">2. Подписка и оплата</h2>
          <p>Доступ к функциям платформы предоставляется по подписке. Оплата производится в криптовалюте. Стоимость и условия могут изменяться с предварительным уведомлением.</p>
        </section>

        <section>
          <h2 className="font-semibold text-sm text-foreground mb-1">3. Обязанности пользователя</h2>
          <p>Пользователь обязуется не использовать платформу для продажи запрещённых товаров, мошенничества или нарушения законодательства. Администрация вправе ограничить доступ без объяснения причин.</p>
        </section>

        <section>
          <h2 className="font-semibold text-sm text-foreground mb-1">4. Ограничение ответственности</h2>
          <p>Сервис предоставляется «как есть». Платформа не несёт ответственности за содержимое магазинов, действия покупателей или продавцов, а также за временную недоступность сервиса.</p>
        </section>

        <section>
          <h2 className="font-semibold text-sm text-foreground mb-1">5. Изменение условий</h2>
          <p>Администрация вправе изменять настоящие условия. Продолжение использования сервиса означает согласие с обновлёнными условиями.</p>
        </section>
      </div>
    </div>
  </div>
);

export default PlatformTerms;
