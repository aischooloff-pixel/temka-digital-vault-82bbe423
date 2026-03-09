import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const faqData = [
  {
    category: 'Общие вопросы',
    items: [
      { q: 'Что такое TEMKA.STORE?', a: 'TEMKA.STORE — это премиум цифровой маркетплейс, где вы можете приобрести проверенные цифровые товары: ключи ПО, подписки на стриминг, аккаунты соцсетей и многое другое.' },
      { q: 'Безопасно ли покупать на TEMKA.STORE?', a: 'Да. Все товары проверяются перед размещением. Мы используем безопасную обработку платежей и предлагаем защиту покупателя с гарантией замены или возврата на все покупки.' },
      { q: 'Как создать аккаунт?', a: 'Нажмите на иконку пользователя в шапке сайта и следуйте процессу регистрации. Вы можете зарегистрироваться через email или Telegram.' },
    ],
  },
  {
    category: 'Заказы и доставка',
    items: [
      { q: 'Как быстро доставка?', a: 'Товары с мгновенной доставкой отправляются в течение нескольких минут после подтверждения оплаты. Товары с ручной доставкой обрабатываются в течение 1-24 часов.' },
      { q: 'Как я получу свой товар?', a: 'Данные товара, учётные записи или лицензионные ключи отправляются на ваш email. Также вы можете просмотреть их в личном кабинете.' },
      { q: 'Можно ли отследить заказ?', a: 'Да, все заказы можно отследить в разделе Аккаунт > История заказов. Также вы получите email-уведомления о статусе заказа.' },
    ],
  },
  {
    category: 'Оплата',
    items: [
      { q: 'Какие способы оплаты вы принимаете?', a: 'Мы принимаем банковские карты (Visa, Mastercard), криптовалюту (BTC, ETH, USDT), PayPal и другие региональные способы оплаты.' },
      { q: 'Безопасна ли моя платёжная информация?', a: 'Да, все платежи обрабатываются через безопасные зашифрованные каналы. Мы никогда не храним полные данные ваших карт на наших серверах.' },
      { q: 'Что делать, если платёж не прошёл?', a: 'Если платёж не прошёл, попробуйте другой способ оплаты или свяжитесь с вашим банком. Если сумма была списана, но заказ не создан, обратитесь в поддержку.' },
    ],
  },
  {
    category: 'Возвраты и замены',
    items: [
      { q: 'Можно ли получить возврат?', a: 'Мы предоставляем возврат в течение гарантийного периода, если товар не соответствует описанию или перестал работать. У каждого товара свой гарантийный срок.' },
      { q: 'Как работают замены?', a: 'Если товар неисправен, свяжитесь с поддержкой, указав ID заказа. Мы проверим проблему и предоставим бесплатную замену в течение гарантийного периода.' },
      { q: 'Что не покрывается гарантией?', a: 'Гарантия не распространяется на товары, заблокированные по вине пользователя, нарушения правил платформы или использование не по назначению.' },
    ],
  },
  {
    category: 'Аккаунт и безопасность',
    items: [
      { q: 'Как защитить купленный аккаунт?', a: 'После получения аккаунта немедленно смените пароль, включите двухфакторную аутентификацию и обновите email/телефон для восстановления. К каждой покупке прилагается инструкция.' },
      { q: 'Можно ли перепродавать купленные товары?', a: 'Перепродажа не рекомендуется и аннулирует гарантию. Товары предназначены только для личного использования.' },
    ],
  },
];

const FAQ = () => {
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggle = (key: string) => {
    setOpenItems(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const filtered = faqData.map(cat => ({
    ...cat,
    items: cat.items.filter(i => !search || i.q.toLowerCase().includes(search.toLowerCase()) || i.a.toLowerCase().includes(search.toLowerCase())),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="container-main mx-auto px-4 py-6 sm:py-8">
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">Часто задаваемые вопросы</h1>
        <p className="text-muted-foreground text-sm mt-2">Найдите ответы на популярные вопросы о нашей платформе</p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto mb-8 sm:mb-10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Поиск по вопросам..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-11 sm:h-12 pl-11 pr-4 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
      </div>

      {/* FAQ List */}
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        {filtered.map(cat => (
          <div key={cat.category}>
            <h3 className="font-display font-semibold text-base sm:text-lg mb-3">{cat.category}</h3>
            <div className="space-y-2">
              {cat.items.map((item, i) => {
                const key = `${cat.category}-${i}`;
                const isOpen = openItems.includes(key);
                return (
                  <div key={key} className="bg-card border border-border/50 rounded-xl overflow-hidden">
                    <button onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium hover:bg-secondary/30 transition-colors">
                      {item.q}
                      {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />}
                    </button>
                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-3 sm:pb-4 text-xs sm:text-sm text-muted-foreground border-t border-border/30 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="font-display font-semibold">Вопросы не найдены</h3>
            <p className="text-sm text-muted-foreground mt-1">Попробуйте другой поисковый запрос</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="text-center mt-10 sm:mt-12">
        <p className="text-muted-foreground text-sm">Не нашли ответ?</p>
        <a href="https://t.me/paveldurov" target="_blank" rel="noopener noreferrer"><Button variant="hero" className="mt-3"><Headphones className="w-4 h-4 mr-1" /> Связаться с поддержкой</Button></a>
      </div>
    </div>
  );
};

export default FAQ;
