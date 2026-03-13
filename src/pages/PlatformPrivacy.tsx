const PlatformPrivacy = () => (
  <div style={{ margin: 0, padding: 0, background: '#fff', color: '#111', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', minHeight: '100vh' }}>
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
      <p style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Документ</p>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.3 }}>Политика конфиденциальности</h1>
      <p style={{ fontSize: 11, color: '#999', marginBottom: 32 }}>Последнее обновление: 13 марта 2026</p>

      <div style={{ fontSize: 14, lineHeight: 1.7, color: '#333' }}>
        <Section title="1. Какие данные мы собираем">
          Мы обрабатываем только данные, предоставляемые Telegram при авторизации: имя, username и ID пользователя. Дополнительные персональные данные не запрашиваются и не хранятся.
        </Section>

        <Section title="2. Как мы используем данные">
          Данные используются исключительно для идентификации пользователя, управления магазинами, обработки заказов и оказания технической поддержки.
        </Section>

        <Section title="3. Хранение и защита">
          Данные хранятся на защищённых серверах. Токены ботов и платёжных систем шифруются. Мы не передаём данные третьим лицам, за исключением случаев, прямо предусмотренных законодательством.
        </Section>

        <Section title="4. Данные покупателей">
          Платформа обрабатывает данные покупателей магазинов (Telegram ID, имя) для выполнения заказов. Продавец несёт ответственность за информирование своих покупателей об обработке данных.
        </Section>

        <Section title="5. Удаление данных">
          Вы можете запросить удаление своих данных через поддержку. При удалении магазина все связанные данные (товары, заказы, клиенты) удаляются безвозвратно.
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

export default PlatformPrivacy;
