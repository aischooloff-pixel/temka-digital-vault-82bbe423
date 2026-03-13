const PlatformTerms = () => (
  <div style={{ margin: 0, padding: 0, background: '#fff', color: '#111', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', minHeight: '100vh' }}>
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
      <p style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Документ</p>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.3 }}>Условия использования</h1>
      <p style={{ fontSize: 11, color: '#999', marginBottom: 32 }}>Последнее обновление: 13 марта 2026</p>

      <div style={{ fontSize: 14, lineHeight: 1.7, color: '#333' }}>
        <Section title="1. Общие положения">
          Платформа предоставляет инструменты для создания и управления Telegram-магазинами цифровых товаров. Используя сервис, вы соглашаетесь с настоящими условиями в полном объёме.
        </Section>

        <Section title="2. Подписка и оплата">
          Доступ к функциям платформы предоставляется по подписке. Оплата производится в криптовалюте через CryptoBot. Стоимость и условия могут изменяться с предварительным уведомлением.
        </Section>

        <Section title="3. Обязанности пользователя">
          Пользователь обязуется не использовать платформу для продажи запрещённых товаров, мошенничества или нарушения законодательства. Администрация вправе ограничить доступ без объяснения причин при выявлении нарушений.
        </Section>

        <Section title="4. Интеллектуальная собственность">
          Все элементы платформы, включая код, дизайн и торговые марки, принадлежат администрации. Пользователь получает ограниченную лицензию на использование платформы в рамках подписки.
        </Section>

        <Section title="5. Ограничение ответственности">
          Сервис предоставляется «как есть» (as is). Платформа не несёт ответственности за содержимое магазинов, действия покупателей или продавцов, а также за временную недоступность сервиса по техническим причинам.
        </Section>

        <Section title="6. Изменение условий">
          Администрация вправе изменять настоящие условия в одностороннем порядке. Продолжение использования сервиса после публикации изменений означает согласие с обновлёнными условиями.
        </Section>
      </div>

      <Footer />
    </div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 24 }}>
    <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111', margin: '0 0 6px' }}>{title}</h2>
    <p style={{ margin: 0 }}>{children}</p>
  </div>
);

const Footer = () => (
  <div style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid #eee', fontSize: 11, color: '#aaa' }}>
    © 2026 · Все права защищены
  </div>
);

export default PlatformTerms;
