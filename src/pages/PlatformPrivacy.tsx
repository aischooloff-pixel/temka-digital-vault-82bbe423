import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PlatformPrivacy = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link to="/">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-xs text-muted-foreground">
          <ArrowLeft className="w-3 h-3 mr-1" /> Назад
        </Button>
      </Link>

      <h1 className="text-xl font-bold mb-1">Политика конфиденциальности</h1>
      <p className="text-[10px] text-muted-foreground mb-5">Последнее обновление: 13 марта 2026</p>

      <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
        <section>
          <h2 className="font-semibold text-sm text-foreground mb-1">1. Какие данные мы собираем</h2>
          <p>Мы обрабатываем только данные, предоставляемые Telegram: имя, username, ID пользователя. Дополнительные данные не запрашиваются.</p>
        </section>

        <section>
          <h2 className="font-semibold text-sm text-foreground mb-1">2. Как мы используем данные</h2>
          <p>Данные используются для идентификации пользователя, управления магазинами, обработки заказов и оказания поддержки.</p>
        </section>

        <section>
          <h2 className="font-semibold text-sm text-foreground mb-1">3. Хранение и защита</h2>
          <p>Данные хранятся на защищённых серверах. Токены ботов шифруются. Мы не передаём данные третьим лицам, за исключением случаев, предусмотренных законодательством.</p>
        </section>

        <section>
          <h2 className="font-semibold text-sm text-foreground mb-1">4. Удаление данных</h2>
          <p>Вы можете запросить удаление своих данных через поддержку. При удалении магазина все связанные данные удаляются безвозвратно.</p>
        </section>
      </div>
    </div>
  </div>
);

export default PlatformPrivacy;
