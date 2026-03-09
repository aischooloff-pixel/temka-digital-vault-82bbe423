import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Package, MessageCircle, ShoppingCart, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/hooks/useOrders';

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');
  const { data: orders } = useOrders();

  const order = orders?.find(o => o.order_number === orderNumber);

  return (
    <div className="container-main mx-auto px-4 py-12 sm:py-16 text-center max-w-md">
      <div className="animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h1 className="font-display text-xl sm:text-2xl font-bold">Заказ оформлен!</h1>
        <p className="text-muted-foreground text-sm mt-2">Ожидайте подтверждения оплаты через CryptoBot.</p>

        <div className="bg-card border border-border/50 rounded-xl p-4 mt-5 text-left space-y-2.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">ID заказа</span>
            <span className="font-mono font-medium">{orderNumber || '—'}</span>
          </div>
          {order ? (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Сумма</span>
                <span className="font-medium">${Number(order.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Статус оплаты</span>
                <span className="text-warning font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {order.payment_status === 'paid' ? 'Оплачен' : 'Ожидание оплаты'}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Статус</span>
              <span className="text-warning font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Ожидание оплаты</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Доставка</span>
            <span className="font-medium">После подтверждения оплаты</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Товар будет доставлен в Telegram после подтверждения оплаты.
        </p>

        <div className="flex flex-col gap-2 mt-5">
          <Link to="/account"><Button variant="outline" size="sm" className="w-full"><Package className="w-4 h-4 mr-1" /> Мои заказы</Button></Link>
          <a href="https://t.me/paveldurov" target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full"><MessageCircle className="w-4 h-4 mr-1" /> Поддержка в Telegram</Button></a>
          <Link to="/catalog"><Button variant="hero" size="sm" className="w-full"><ShoppingCart className="w-4 h-4 mr-1" /> Продолжить покупки</Button></Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
