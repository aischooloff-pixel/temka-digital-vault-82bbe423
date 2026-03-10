import { MessageCircle, Headphones, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Support = () => {
  return (
    <div className="container-main mx-auto px-4 py-8 sm:py-12 text-center max-w-md">
      <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
        <Headphones className="w-8 h-8" />
      </div>
      <h1 className="font-display text-xl sm:text-2xl font-bold">Поддержка</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Свяжитесь с нами в Telegram — отвечаем быстро.
      </p>

      <a href="https://t.me/temka_support" target="_blank" rel="noopener noreferrer" className="block mt-6">
        <Button variant="hero" size="lg" className="w-full">
          <MessageCircle className="w-4 h-4 mr-2" /> Написать в Telegram
        </Button>
      </a>

      <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
        ⚡ Среднее время ответа: 5–30 минут
      </p>

      <div className="mt-8 pt-6 border-t border-border/30">
        <Link to="/faq">
          <Button variant="outline" size="sm" className="gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Читать FAQ
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Support;
