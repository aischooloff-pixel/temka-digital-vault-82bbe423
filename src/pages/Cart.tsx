import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Shield, Zap, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/contexts/StoreContext';
import ProductCard from '@/components/ProductCard';
import { products } from '@/data/products';
import { useState } from 'react';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useStore();
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const recommended = products.filter(p => !cart.some(c => c.product.id === p.id)).slice(0, 4);

  if (cart.length === 0) {
    return (
      <div className="container-main mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="font-display text-2xl font-bold">Your Cart is Empty</h2>
        <p className="text-muted-foreground mt-2">Browse our catalog and find something you like!</p>
        <Link to="/catalog"><Button variant="hero" className="mt-6">Browse Catalog <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
      </div>
    );
  }

  const discount = promoApplied ? cartTotal * 0.1 : 0;
  const total = cartTotal - discount;

  return (
    <div className="container-main mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map(item => (
            <div key={item.product.id} className="bg-card border border-border/50 rounded-xl p-4 flex gap-4">
              <div className="w-20 h-20 bg-secondary/50 rounded-lg flex items-center justify-center text-3xl shrink-0">
                {item.product.category === 'social-media' ? '📱' : item.product.category === 'gaming' ? '🎮' : item.product.category === 'streaming' ? '🎬' : item.product.category === 'software' ? '🔑' : '⚡'}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/product/${item.product.id}`} className="font-display font-semibold text-sm hover:text-primary transition-colors line-clamp-1">{item.product.title}</Link>
                <p className="text-xs text-muted-foreground mt-0.5">{item.product.subtitle}</p>
                <div className="flex items-center gap-1 mt-1">
                  {item.product.deliveryType === 'instant' ? (
                    <span className="text-[10px] text-primary flex items-center gap-0.5"><Zap className="w-3 h-3" /> Instant</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" /> Manual</span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold">${(item.product.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground">Clear Cart</Button>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="bg-card border border-border/50 rounded-xl p-6 space-y-4 sticky top-24">
            <h3 className="font-display font-semibold text-lg">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
              {promoApplied && <div className="flex justify-between text-primary"><span>Promo (-10%)</span><span>-${discount.toFixed(2)}</span></div>}
              <div className="border-t border-border/30 pt-2 flex justify-between font-display font-bold text-lg">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Promo Code */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <input type="text" placeholder="Promo code" value={promoCode} onChange={e => setPromoCode(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <Button variant="outline" size="sm" onClick={() => { if (promoCode.trim()) setPromoApplied(true); }}>Apply</Button>
            </div>

            <Link to="/checkout" className="block">
              <Button variant="hero" size="xl" className="w-full">
                Proceed to Checkout <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>

            <div className="space-y-2 pt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-primary" /> Secure checkout</span>
              <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-primary" /> Instant digital delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended */}
      {recommended.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-xl font-bold mb-6">You Might Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommended.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
};

export default Cart;
