import { MessageCircle, Clock, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Contact = () => {
  return (
    <div className="container-main mx-auto px-4 py-6 sm:py-8">
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">Контакты</h1>
        <p className="text-muted-foreground text-sm mt-2">Есть вопрос? Мы будем рады помочь.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-xl mx-auto mb-8 sm:mb-10">
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

      <div className="text-center">
        <Link to="/support">
          <Button variant="hero" size="lg">
            <Headphones className="w-4 h-4 mr-2" />
            Поддержка
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Contact;
