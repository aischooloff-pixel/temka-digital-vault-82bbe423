import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Contact = () => {
  return (
    <div className="container-main mx-auto px-4 py-8 sm:py-12 text-center max-w-md">
      <h1 className="font-display text-xl sm:text-2xl font-bold">Контакты</h1>
      <p className="text-sm text-muted-foreground mt-2">Свяжитесь с нами напрямую в Telegram.</p>

      <a href="https://t.me/temka_support" target="_blank" rel="noopener noreferrer" className="block mt-6">
        <Button variant="hero" size="lg" className="w-full">
          <MessageCircle className="w-4 h-4 mr-2" /> Написать в Telegram
        </Button>
      </a>

      <p className="text-xs text-muted-foreground mt-3">⚡ Среднее время ответа: 5–30 минут</p>
    </div>
  );
};

export default Contact;
