import { Link } from 'react-router-dom';
import { CheckCircle2, Package, Headphones, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OrderSuccess = () => {
  const orderId = `TK-${Date.now().toString(36).toUpperCase()}`;

  return (
    <div className="container-main mx-auto px-4 py-16 sm:py-20 text-center max-w-xl">
      <div className="animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Заказ оформлен!</h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-3">Спасибо за покупку. Ваш заказ обрабатывается.</p>

        <div className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 mt-6 sm:mt-8 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ID заказа</span>
            <span className="font-mono font-medium">{orderId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Статус</span>
            <span className="text-primary font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> В обработке</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ожидаемая доставка</span>
            <span className="font-medium">В течение минут</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6">
          Вы получите данные товара на email в ближайшее время. Проверьте входящие (и спам).
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6 sm:mt-8">
          <Link to="/account"><Button variant="outline"><Package className="w-4 h-4 mr-1" /> История заказов</Button></Link>
          <Link to="/support"><Button variant="outline"><Headphones className="w-4 h-4 mr-1" /> Поддержка</Button></Link>
          <Link to="/catalog"><Button variant="hero"><ShoppingCart className="w-4 h-4 mr-1" /> Продолжить покупки</Button></Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
