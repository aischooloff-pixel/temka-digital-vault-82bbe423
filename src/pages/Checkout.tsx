import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Zap, Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/contexts/StoreContext';

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useStore();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  if (cart.length === 0) {
    return (
      <div className="container-main mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h2 className="font-display text-xl font-bold">Нечего оформлять</h2>
        <Link to="/catalog"><Button variant="hero" className="mt-4">Перейти в каталог</Button></Link>
      </div>
    );
  }

  const handleCheckout = () => {
    if (!agreed) return;
    setProcessing(true);
    setTimeout(() => {
      clearCart();
      navigate('/order-success');
    }, 2000);
  };

  return (
    <div className="container-main mx-auto px-4 py-4 sm:py-6">
      <Link to="/cart" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-3 h-3" /> Назад в корзину
      </Link>
      <h1 className="font-display text-xl sm:text-2xl font-bold mb-4">Оформление заказа</h1>

      <div className="space-y-3">
        {/* Telegram account info */}
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <h3 className="font-display font-semibold text-sm mb-2">Ваш аккаунт</h3>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">T</div>
            <div>
              <div className="text-sm font-medium">Telegram User</div>
              <div className="text-[10px] text-muted-foreground">Заказ привязан к вашему Telegram профилю</div>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <h3 className="font-display font-semibold text-sm mb-3">Способ оплаты</h3>
          <div className="p-3 rounded-xl border border-primary bg-primary/5 text-center">
            <div className="text-2xl mb-1">₿</div>
            <div className="text-sm font-medium text-primary">CryptoBot</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Оплата криптовалютой через Telegram</div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <h3 className="font-display font-semibold text-sm mb-2">Комментарий к заказу (необязательно)</h3>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Особые пожелания..."
            className="w-full h-20 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
        </div>

        {/* Agreement */}
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary" />
          <span className="text-xs text-muted-foreground">
            Я согласен с <Link to="/terms" className="text-primary hover:underline">Условиями использования</Link>,{' '}
            <Link to="/privacy" className="text-primary hover:underline">Политикой конфиденциальности</Link> и{' '}
            <Link to="/refund" className="text-primary hover:underline">Политикой возврата</Link>.
          </span>
        </label>

        {/* Summary */}
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
          <h3 className="font-display font-semibold text-sm">Итого заказа</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cart.map(item => (
              <div key={item.product.id} className="flex justify-between text-xs">
                <span className="text-muted-foreground line-clamp-1 flex-1">{item.product.title} ×{item.quantity}</span>
                <span className="font-medium ml-2">${(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border/30 pt-2 flex justify-between font-display font-bold text-base">
            <span>Итого</span><span>${cartTotal.toFixed(2)}</span>
          </div>

          <Button variant="hero" size="lg" className="w-full" onClick={handleCheckout}
            disabled={!agreed || processing}>
            {processing ? (
              <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Создание инвойса...</span>
            ) : (
              <><Lock className="w-4 h-4 mr-1" /> Оплатить через CryptoBot — ${cartTotal.toFixed(2)}</>
            )}
          </Button>

          <div className="space-y-1.5 pt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-primary" /> Безопасная оплата</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-primary" /> Мгновенная доставка</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-primary" /> Защита покупателя</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
