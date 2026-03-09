import { MessageCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const Contact = () => {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="container-main mx-auto px-4 py-6 sm:py-8">
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">Контакты</h1>
        <p className="text-muted-foreground text-sm mt-2">Есть вопрос? Мы будем рады помочь.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-3xl mx-auto mb-8 sm:mb-10">
        {[
          { icon: MessageCircle, label: 'Telegram', value: '@temka_support' },
          { icon: Clock, label: 'Время ответа', value: '1-2 часа' },
        ].map((c, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
            <c.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            <div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{c.label}</div>
              <div className="text-xs sm:text-sm font-medium">{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {submitted ? (
        <div className="text-center py-12 max-w-md mx-auto">
          <div className="text-5xl mb-4">✉️</div>
          <h3 className="font-display font-semibold text-lg">Сообщение отправлено!</h3>
          <p className="text-sm text-muted-foreground mt-2">Мы ответим в течение 1-2 часов.</p>
        </div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="max-w-xl mx-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Имя</label>
              <input type="text" required placeholder="Ваше имя"
                className="w-full h-10 px-4 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1.5">Email</label>
              <input type="email" required placeholder="ваш@email.com"
                className="w-full h-10 px-4 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Тема</label>
            <input type="text" required placeholder="Чем можем помочь?"
              className="w-full h-10 px-4 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Сообщение</label>
            <textarea required rows={5} placeholder="Расскажите подробнее..."
              className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full">Отправить сообщение</Button>
        </form>
      )}
    </div>
  );
};

export default Contact;
