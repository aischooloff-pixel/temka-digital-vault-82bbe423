const PlatformRules = () => (
  <div style={{ margin: 0, padding: 0, background: '#fff', color: '#111', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', minHeight: '100vh' }}>
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
      <p style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>Документ</p>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.3 }}>Правила платформы</h1>
      <p style={{ fontSize: 11, color: '#999', marginBottom: 32 }}>Последнее обновление: 16 марта 2026</p>

      <div style={{ fontSize: 14, lineHeight: 1.7, color: '#333' }}>
        <p style={{ margin: '0 0 24px' }}>
          Используя платформу, ты соглашаешься с тремя простыми правилами:
        </p>

        <Rule number="1" title="Не обманывай покупателей">
          Товар должен соответствовать описанию. Деньги получены — товар выдан.
        </Rule>

        <Rule number="2" title="Не продавай нелегал">
          Всё, что нарушает закон, — под запретом без исключений.
        </Rule>

        <Rule number="3" title="Не нарушай закон">
          Платформа не прикрывает и не участвует в незаконной деятельности.
        </Rule>

        <div style={{ marginTop: 32, padding: '16px 20px', background: '#f9f9f9', borderLeft: '3px solid #e00', borderRadius: 4, fontSize: 13, lineHeight: 1.6, color: '#333' }}>
          Нарушение любого из правил — блокировка аккаунта и удаление всех магазинов без предупреждения и без возврата средств.
        </div>
      </div>

      <div style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid #eee', fontSize: 11, color: '#aaa' }}>
        © 2026 · Все права защищены
      </div>
    </div>
  </div>
);

const Rule = ({ number, title, children }: { number: string; title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 20 }}>
    <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111', margin: '0 0 4px' }}>{number}. {title}</h2>
    <p style={{ margin: 0 }}>{children}</p>
  </div>
);

export default PlatformRules;
