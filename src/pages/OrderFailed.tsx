import { Link } from 'react-router-dom';
import { XCircle, Headphones, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OrderFailed = () => {
  return (
    <div className="container-main mx-auto px-4 py-16 sm:py-20 text-center max-w-xl">
      <div className="animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-destructive/20 text-destructive flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Ошибка оплаты</h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-3">Не удалось обработать ваш платёж. Попробуйте снова или используйте другой способ оплаты.</p>

        <div className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 mt-6 sm:mt-8 text-left space-y-2 text-xs sm:text-sm text-muted-foreground">
          <p>Частые причины ошибки оплаты:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Недостаточно средств</li>
            <li>Карта отклонена банком</li>
            <li>Неверные платёжные данные</li>
            <li>Транзакция отмечена для проверки безопасности</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6 sm:mt-8">
          <Link to="/checkout"><Button variant="hero"><RefreshCcw className="w-4 h-4 mr-1" /> Попробовать снова</Button></Link>
          <Link to="/support"><Button variant="outline"><Headphones className="w-4 h-4 mr-1" /> Связаться с поддержкой</Button></Link>
        </div>
      </div>
    </div>
  );
};

export default OrderFailed;
