import { useParams, Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShop } from '@/contexts/ShopContext';

const ShopCart = () => {
  const { shopId } = useParams();
  const { cart, updateQuantity, removeFromCart, clearCart, cartTotal, cartCount } = useShop();
  const base = `/shop/${shopId}`;

  if (cart.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-display text-xl font-bold mb-2">Корзина пуста</h2>
        <p className="text-sm text-muted-foreground mb-6">Добавьте товары из каталога</p>
        <Link to={`${base}/catalog`}>
          <Button>Перейти в каталог</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="container-main mx-auto max-w-lg">
        <div className="flex items-center justify-between mb-5">
          <h1 className="font-display text-xl font-bold">Корзина ({cartCount})</h1>
          <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Очистить
          </Button>
        </div>

        <div className="space-y-3">
          {cart.map(({ product, quantity }) => (
            <div key={product.id} className="bg-card border border-border/50 rounded-xl p-3 flex gap-3">
              {product.image && (
                <img src={product.image} alt={product.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-sm line-clamp-1">{product.name}</h3>
                <p className="text-xs text-muted-foreground">${product.price}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQuantity(product.id, quantity - 1)}
                    className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-medium w-6 text-center">{quantity}</span>
                  <button onClick={() => updateQuantity(product.id, quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button onClick={() => removeFromCart(product.id)} className="ml-auto text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="font-display font-bold text-sm shrink-0">
                ${(product.price * quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-card border border-border/50 rounded-xl p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Итого</span>
            <span className="font-display font-bold text-lg">${cartTotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Оплата через CryptoBot. Товары будут выданы мгновенно после оплаты.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShopCart;
