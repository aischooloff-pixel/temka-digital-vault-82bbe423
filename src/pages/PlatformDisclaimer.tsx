import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PlatformDisclaimer = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link to="/">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-xs text-muted-foreground">
          <ArrowLeft className="w-3 h-3 mr-1" /> Назад
        </Button>
      </Link>

      <h1 className="text-xl font-bold mb-1">Отказ от ответственности</h1>
      <p className="text-[10px] text-muted-foreground mb-5">Последнее обновление: 13 марта 2026</p>

      <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
        <section>
          <h2 className="font-semibold text-sm text-foreground mb-1">1. Цифровые товары</h2>
          <p>Платформа предоставляет инфраструктуру для продажи цифровых товаров. Ответственность за качество, законность и соответствие товаров несёт продавец.</p>
        </section>

        <section>
          <h2 className="font-semibold text-sm text-foreground mb-1">2. Платежи</h2>
          <p>Платежи обрабатываются через сторонние сервисы (CryptoBot). Платформа не несёт ответственности за курсовые разницы, задержки транзакций или действия платёжных систем.</p>
        </section>

        <section>
          <h2 className="font-semibold text-sm text-foreground mb-1">3. Доступность сервиса</h2>
          <p>Сервис предоставляется «как есть» без гарантий бесперебойной работы. Платформа не несёт ответственности за убытки, связанные с временной недоступностью.</p>
        </section>

        <section>
          <h2 className="font-semibold text-sm text-foreground mb-1">4. Ответственность пользователя</h2>
          <p>Пользователь самостоятельно несёт ответственность за соблюдение законодательства своей юрисдикции при использовании платформы и продаже товаров.</p>
        </section>
      </div>
    </div>
  </div>
);

export default PlatformDisclaimer;
