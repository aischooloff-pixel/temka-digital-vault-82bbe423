import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStorefrontPath } from '@/contexts/StorefrontContext';

const Legal = () => {
  const buildPath = useStorefrontPath();

  return (
    <div className="container-main mx-auto px-4 py-4 sm:py-6">
      <Link to={buildPath('/')}>
        <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-xs text-muted-foreground">
          <ArrowLeft className="w-3 h-3 mr-1" /> На главную
        </Button>
      </Link>

      <h1 className="font-display text-xl font-bold mb-4">Условия использования и отказ от ответственности</h1>
      <p className="text-[10px] text-muted-foreground mb-4">Последнее обновление: 10 марта 2026</p>

      <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
        <section>
          <h2 className="font-display font-semibold text-sm text-foreground mb-1.5">1. Общие положения</h2>
          <p>Настоящий документ регулирует условия использования сервиса (далее — «Сервис»), доступного в формате Telegram Mini App. Используя Сервис, оформляя заказ или совершая оплату, вы соглашаетесь с настоящими условиями.</p>
          <p className="mt-1">Сервис предоставляет возможность приобретения цифровых товаров: ключей ПО, подписок, аккаунтов и иных электронных продуктов. Все товары являются цифровыми и не имеют материального носителя.</p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-sm text-foreground mb-1.5">2. Оплата и доставка</h2>
          <p>Оплата производится в криптовалюте через платёжный сервис CryptoBot и/или за счёт внутреннего баланса пользователя. Товар считается доставленным в момент предоставления данных доступа в личном кабинете и/или через уведомление в Telegram.</p>
          <p className="mt-1">Цены указаны в USD. Администрация оставляет за собой право изменять цены без предварительного уведомления. Ранее оформленные и оплаченные заказы исполняются по цене на момент оплаты.</p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-sm text-foreground mb-1.5">3. Возврат</h2>
          <p>В связи с цифровым характером товара, возврат возможен только в случае, если товар не был доставлен или данные доступа оказались нерабочими на момент получения. Обращение по возврату принимается в течение 24 часов после покупки через службу поддержки.</p>
          <p className="mt-1">Возврат невозможен, если товар был использован, активирован или передан третьим лицам.</p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-sm text-foreground mb-1.5">4. Отказ от ответственности</h2>
          <p>Сервис предоставляется «как есть» (as is). Администрация не несёт ответственности за:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Действия третьих лиц (блокировки аккаунтов, изменение условий сторонних сервисов).</li>
            <li>Потери, вызванные некорректным использованием приобретённых товаров.</li>
            <li>Временную недоступность Сервиса по техническим причинам.</li>
            <li>Курсовые разницы при оплате криптовалютой.</li>
          </ul>
          <p className="mt-1">Пользователь самостоятельно несёт ответственность за соблюдение законодательства своей страны при использовании приобретённых товаров.</p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-sm text-foreground mb-1.5">5. Персональные данные</h2>
          <p>Сервис обрабатывает только данные, предоставляемые Telegram (имя, username, ID). Эти данные используются исключительно для идентификации пользователя, выполнения заказов и поддержки. Данные не передаются третьим лицам, за исключением случаев, предусмотренных законодательством.</p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-sm text-foreground mb-1.5">6. Промокоды и баланс</h2>
          <p>Средства на внутреннем балансе не являются электронными деньгами и не подлежат обратному выводу. Промокоды не суммируются и применяются однократно к заказу.</p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-sm text-foreground mb-1.5">7. Модерация и блокировки</h2>
          <p>Администрация вправе ограничить доступ пользователю без объяснения причин в случае нарушения условий, злоупотреблений, мошенничества или подозрительной активности.</p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-sm text-foreground mb-1.5">8. Изменение условий</h2>
          <p>Администрация вправе изменять настоящие условия в одностороннем порядке. Продолжение использования Сервиса после изменений означает согласие с обновлёнными условиями.</p>
        </section>
      </div>
    </div>
  );
};

export { Legal as Terms, Legal as Privacy, Legal as Refund, Legal as PersonalData, Legal as Consent, Legal as ServiceRules, Legal as Disclaimer };
export default Legal;
