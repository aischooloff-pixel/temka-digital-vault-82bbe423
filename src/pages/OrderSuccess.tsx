import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Package, MessageCircle, ShoppingCart, Clock, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/hooks/useOrders';
import { useSupportUsername } from '@/hooks/useSupportUsername';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');
  const { data: orders } = useOrders();
  const queryClient = useQueryClient();
  const { data: supportUsername } = useSupportUsername();
  const [polling, setPolling] = useState(true);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [expired, setExpired] = useState(false);

  const order = orders?.find(o => o.order_number === orderNumber);

  const checkPayment = useCallback(async () => {
    if (!order?.id) return;
    if (order.payment_status === 'paid') {
      setPaymentConfirmed(true);
      setPolling(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-payment', {
        body: { orderId: order.id },
      });

      if (error) {
        console.error('Check payment error:', error);
        return;
      }

      if (data?.paymentStatus === 'paid') {
        setPaymentConfirmed(true);
        setPolling(false);
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        queryClient.invalidateQueries({ queryKey: ['balance-history'] });
        queryClient.invalidateQueries({ queryKey: ['user-stats'] });
      } else if (data?.paymentStatus === 'expired') {
        setExpired(true);
        setPolling(false);
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    } catch (err) {
      console.error('Payment check failed:', err);
    }
  }, [order?.id, order?.payment_status, queryClient]);

  useEffect(() => {
    if (!order?.id || paymentConfirmed || expired) return;

    // Already paid
    if (order.payment_status === 'paid') {
      setPaymentConfirmed(true);
      setPolling(false);
      return;
    }

    // Poll every 5s for up to 5 minutes
    const interval = setInterval(checkPayment, 5000);
    const timeout = setTimeout(() => {
      setPolling(false);
      clearInterval(interval);
    }, 5 * 60 * 1000);

    // Initial check
    checkPayment();

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [order?.id, order?.payment_status, paymentConfirmed, expired, checkPayment]);

  const isPaid = paymentConfirmed || order?.payment_status === 'paid';
  const isDelivered = order?.status === 'delivered' || order?.status === 'completed';

  return (
    <div className="container-main mx-auto px-4 py-12 sm:py-16 text-center max-w-md">
      <div className="animate-fade-in">
        {expired ? (
          <>
            <div className="w-14 h-14 rounded-full bg-destructive/20 text-destructive flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7" />
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold">Инвойс истёк</h1>
            <p className="text-muted-foreground text-sm mt-2">Время оплаты истекло. Попробуйте оформить заказ снова.</p>
          </>
        ) : isPaid ? (
          <>
            <div className="w-14 h-14 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold">
              {isDelivered ? 'Товар доставлен!' : 'Оплата подтверждена!'}
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              {isDelivered
                ? 'Данные товара отправлены вам в Telegram.'
                : 'Ваш товар будет доставлен в ближайшее время.'}
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-warning/20 text-warning flex items-center justify-center mx-auto mb-4">
              {polling ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : (
                <Clock className="w-7 h-7" />
              )}
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold">Ожидание оплаты</h1>
            <p className="text-muted-foreground text-sm mt-2">
              {polling
                ? 'Проверяем статус оплаты через CryptoBot...'
                : 'Оплатите инвойс в CryptoBot. Статус обновится автоматически.'}
            </p>
          </>
        )}

        <div className="bg-card border border-border/50 rounded-xl p-4 mt-5 text-left space-y-2.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">ID заказа</span>
            <span className="font-mono font-medium">{orderNumber || '—'}</span>
          </div>
          {order && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Сумма</span>
                <span className="font-medium">${Number(order.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Статус оплаты</span>
                <span className={`font-medium flex items-center gap-1 ${
                  isPaid ? 'text-primary' : expired ? 'text-destructive' : 'text-warning'
                }`}>
                  {isPaid ? (
                    <><CheckCircle2 className="w-3 h-3" /> Оплачен</>
                  ) : expired ? (
                    <><XCircle className="w-3 h-3" /> Истёк</>
                  ) : (
                    <><Clock className="w-3 h-3" /> Ожидание оплаты</>
                  )}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Доставка</span>
            <span className="font-medium">
              {isDelivered ? 'Доставлено в Telegram' : 'После подтверждения оплаты'}
            </span>
          </div>
        </div>

        {!isPaid && !expired && (
          <p className="text-xs text-muted-foreground mt-3">
            Товар будет доставлен в Telegram после подтверждения оплаты.
          </p>
        )}

        <div className="flex flex-col gap-2 mt-5">
          {expired && (
            <Link to="/catalog"><Button variant="hero" size="sm" className="w-full"><ShoppingCart className="w-4 h-4 mr-1" /> Оформить заново</Button></Link>
          )}
          <Link to="/account"><Button variant="outline" size="sm" className="w-full"><Package className="w-4 h-4 mr-1" /> Мои заказы</Button></Link>
          <a href={`https://t.me/${supportUsername}`} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full"><MessageCircle className="w-4 h-4 mr-1" /> Поддержка в Telegram</Button></a>
          {!expired && (
            <Link to="/catalog"><Button variant="hero" size="sm" className="w-full"><ShoppingCart className="w-4 h-4 mr-1" /> Продолжить покупки</Button></Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
