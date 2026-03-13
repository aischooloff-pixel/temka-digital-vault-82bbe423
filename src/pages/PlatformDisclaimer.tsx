const PlatformDisclaimer = () => (
  <div style={{ margin: 0, padding: 0, background: '#fff', color: '#111', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', minHeight: '100vh' }}>
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
      <p style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Документ</p>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.3 }}>Отказ от ответственности</h1>
      <p style={{ fontSize: 11, color: '#999', marginBottom: 32 }}>Последнее обновление: 13 марта 2026</p>

      <div style={{ fontSize: 14, lineHeight: 1.7, color: '#333' }}>
        <Section title="1. Цифровые товары">
          Платформа предоставляет инфраструктуру для создания магазинов и продажи цифровых товаров. Ответственность за качество, законность и соответствие описанию товаров несёт исключительно продавец.
        </Section>

        <Section title="2. Платежи">
          Платежи обрабатываются через сторонние сервисы (CryptoBot). Платформа не несёт ответственности за курсовые разницы, задержки транзакций или действия платёжных систем.
        </Section>

        <Section title="3. Доступность сервиса">
          Сервис предоставляется «как есть» без гарантий бесперебойной работы. Платформа не несёт ответственности за убытки, связанные с временной недоступностью по техническим причинам.
        </Section>

        <Section title="4. Ответственность пользователя">
          Пользователь самостоятельно несёт ответственность за соблюдение законодательства своей юрисдикции при использовании платформы и продаже товаров через созданные магазины.
        </Section>

        <Section title="5. Споры между продавцом и покупателем">
          Платформа не является стороной сделки между продавцом и покупателем. Все споры решаются между сторонами самостоятельно. Платформа может оказать содействие по запросу, но не обязана это делать.
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

export default PlatformDisclaimer;
