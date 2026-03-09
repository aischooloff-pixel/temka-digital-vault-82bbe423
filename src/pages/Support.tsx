import { useState } from 'react';
import { Headphones, Send, MessageCircle, Mail, Clock, AlertTriangle, CreditCard, Package, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const issueTypes = [
  { id: 'order', label: 'Проблема с заказом', icon: Package, desc: 'Проблемы с заказом или доставкой' },
  { id: 'payment', label: 'Проблема с оплатой', icon: CreditCard, desc: 'Платёж не прошёл или списана неверная сумма' },
  { id: 'product', label: 'Проблема с товаром', icon: AlertTriangle, desc: 'Товар не работает как ожидалось' },
  { id: 'refund', label: 'Запрос на возврат', icon: HelpCircle, desc: 'Запрос возврата или замены' },
];

const Support = () => {
  const [selectedIssue, setSelectedIssue] = useState('');
  const [email, setEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="container-main mx-auto px-4 py-16 sm:py-20 text-center max-w-xl">
        <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-6">
          <Headphones className="w-8 h-8" />
        </div>
        <h2 className="font-display text-xl sm:text-2xl font-bold">Тикет отправлен!</h2>
        <p className="text-muted-foreground text-sm mt-3">Мы получили ваш запрос и ответим в течение 1-2 часов. Проверяйте email.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Link to="/"><Button variant="outline">На главную</Button></Link>
          <Link to="/faq"><Button variant="outline">Читать FAQ</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main mx-auto px-4 py-6 sm:py-8">
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">Центр поддержки</h1>
        <p className="text-muted-foreground text-sm mt-2">Мы здесь, чтобы помочь. Свяжитесь с нами, и мы ответим как можно скорее.</p>
      </div>

      {/* Contact channels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10 max-w-3xl mx-auto">
        {[
          { icon: MessageCircle, label: 'Telegram', value: '@temka_support', desc: 'Самый быстрый ответ' },
          { icon: MessageCircle, label: 'Discord', value: 'TEMKA.STORE', desc: 'Сообщество и поддержка' },
          { icon: Mail, label: 'Email', value: 'support@temka.store', desc: 'Для сложных вопросов' },
        ].map((ch, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-xl p-4 sm:p-5 text-center">
            <ch.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary mx-auto mb-2" />
            <h4 className="font-display font-semibold text-xs sm:text-sm">{ch.label}</h4>
            <p className="text-primary text-xs sm:text-sm mt-1">{ch.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{ch.desc}</p>
          </div>
        ))}
      </div>

      {/* Issue types */}
      <div className="max-w-3xl mx-auto mb-6 sm:mb-8">
        <h3 className="font-display font-semibold text-base sm:text-lg mb-3 sm:mb-4">Чем мы можем помочь?</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {issueTypes.map(type => (
            <button key={type.id} onClick={() => setSelectedIssue(type.id)}
              className={`p-3 sm:p-4 rounded-xl border text-left transition-all ${selectedIssue === type.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}>
              <type.icon className={`w-4 h-4 sm:w-5 sm:h-5 mb-2 ${selectedIssue === type.id ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-xs sm:text-sm font-medium">{type.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{type.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ваш@email.com"
            className="w-full h-10 px-4 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">ID заказа (необязательно)</label>
          <input type="text" value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="TK-XXXXXX"
            className="w-full h-10 px-4 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">Опишите вашу проблему</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={5} placeholder="Расскажите, что случилось..."
            className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
        </div>
        <Button type="submit" variant="hero" size="lg" className="w-full">
          <Send className="w-4 h-4 mr-1" /> Отправить тикет
        </Button>
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Clock className="w-3 h-3" /> Среднее время ответа: 1-2 часа
        </p>
      </form>
    </div>
  );
};

export default Support;
