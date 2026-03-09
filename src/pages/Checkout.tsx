import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Zap, Lock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/contexts/StoreContext';

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [agreed, setAgreed] = useState(false);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  if (cart.length === 0) {
    return (
      <div className="container-main mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="font-display text-2xl font-bold">Нечего оформлять</h2>
        <Link to="/catalog"><Button variant="hero" className="mt-6">Перейти в каталог</Button></Link>
      </div>
    );
  }

  const handleCheckout = () => {
    if (!email || !agreed) return;
    setProcessing(true);
    setTimeout(() => {
      clearCart();
      navigate('/order-success');
    }, 2000);
  };

  return (
    <div className="container-main mx-auto px-4 py-6 sm:py-8">
      <Link to="/cart" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-6">
        <ArrowLeft className="w-4 h-4" /> Назад в корзину
      </Link>
      <h1 className="font-display text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Оформление заказа</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Form */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Contact */}
          <div className="bg-card border border-border/50 rounded-xl p-4 sm:p-6">
            <h3 className="font-display font-semibold mb-4">Контактная информация</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ваш@email.com"
                  className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Telegram / Discord (необязательно)</label>
                <input type="text" value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="@username"
                  className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-card border border-border/50 rounded-xl p-4 sm:p-6">
            <h3 className="font-display font-semibold mb-4">Способ оплаты</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {[
                { id: 'card', label: 'Банковская карта', icon: '💳' },
                { id: 'crypto', label: 'Криптовалюта', icon: '₿' },
                { id: 'paypal', label: 'PayPal', icon: '🅿️' },
                { id: 'other', label: 'Другое', icon: '💱' },
              ].map(method => (
                <button key={method.id} onClick={() => setPaymentMethod(method.id)}
                  className={`p-3 rounded-xl border text-center text-xs sm:text-sm transition-all ${paymentMethod === method.id ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/30'}`}>
                  <div className="text-xl sm:text-2xl mb-1">{method.icon}</div>
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-card border border-border/50 rounded-xl p-4 sm:p-6">
            <h3 className="font-display font-semibold mb-4">Примечания к заказу (необязательно)</h3>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Особые пожелания..."
              className="w-full h-24 px-4 py-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>

          {/* Agreement */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-border bg-secondary text-primary focus:ring-primary" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              Я согласен с <Link to="/terms" className="text-primary hover:underline">Условиями использования</Link>,{' '}
              <Link to="/privacy" className="text-primary hover:underline">Политикой конфиденциальности</Link> и{' '}
              <Link to="/refund" className="text-primary hover:underline">Политикой возврата</Link>.
            </span>
          </label>
        </div>

        {/* Summary */}
        <div>
          <div className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 space-y-4 sticky top-24">
            <h3 className="font-display font-semibold text-base sm:text-lg">Итого заказа</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {cart.map(item => (
                <div key={item.product.id} className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground line-clamp-1 flex-1">{item.product.title} ×{item.quantity}</span>
                  <span className="font-medium ml-2">${(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border/30 pt-3 flex justify-between font-display font-bold text-lg">
              <span>Итого</span><span>${cartTotal.toFixed(2)}</span>
            </div>

            <Button variant="hero" size="xl" className="w-full" onClick={handleCheckout}
              disabled={!email || !agreed || processing}>
              {processing ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Обработка...</span>
              ) : (
                <><Lock className="w-4 h-4 mr-1" /> Оплатить ${cartTotal.toFixed(2)}</>
              )}
            </Button>

            <div className="space-y-2 pt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-primary" /> SSL шифрование</span>
              <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-primary" /> Мгновенная доставка</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-primary" /> Защита покупателя</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
