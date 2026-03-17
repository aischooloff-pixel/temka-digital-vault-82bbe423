import React from 'react';

interface PlatformLegalLayoutProps {
  label?: string;
  title: string;
  version?: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

const PlatformLegalLayout: React.FC<PlatformLegalLayoutProps> = ({
  label = 'Документ',
  title,
  version,
  lastUpdated,
  children,
}) => (
  <div style={{ margin: 0, padding: 0, background: '#fff', color: '#111', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', minHeight: '100vh' }}>
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
      <p style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{label}</p>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.3 }}>{title}</h1>
      <p style={{ fontSize: 11, color: '#999', marginBottom: 32 }}>
        {version && <>Версия: {version} · </>}
        {lastUpdated || ''}
      </p>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: '#333' }}>
        {children}
      </div>
      <div style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid #eee', fontSize: 11, color: '#aaa' }}>
        © {new Date().getFullYear()} TeleStore · Все права защищены
      </div>
    </div>
  </div>
);

export const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 24 }}>
    <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111', margin: '0 0 6px' }}>{title}</h2>
    <div style={{ margin: 0 }}>{children}</div>
  </div>
);

export const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul style={{ margin: '8px 0', paddingLeft: 20, listStyleType: 'disc' }}>
    {items.map((item, i) => (
      <li key={i} style={{ marginBottom: 4 }}>{item}</li>
    ))}
  </ul>
);

export const CalloutBox: React.FC<{ children: React.ReactNode; variant?: 'warning' | 'info' }> = ({ children, variant = 'info' }) => (
  <div style={{
    marginTop: 16,
    padding: '16px 20px',
    background: variant === 'warning' ? '#fef2f2' : '#f9f9f9',
    borderLeft: `3px solid ${variant === 'warning' ? '#e00' : '#2563eb'}`,
    borderRadius: 4,
    fontSize: 13,
    lineHeight: 1.6,
    color: '#333',
  }}>
    {children}
  </div>
);

export default PlatformLegalLayout;
