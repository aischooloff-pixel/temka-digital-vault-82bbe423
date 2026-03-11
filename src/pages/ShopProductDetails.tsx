import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShop } from '@/contexts/ShopContext';
import { toast } from 'sonner';

const ShopProductDetails = () => {
  const { shopId, productId } = useParams();
  const { products, addToCart } = useShop();
  const product = products.find(p => p.id === productId);

  if (!product) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-muted-foreground">Товар не найден</p>
        <Link to={`/shop/${shopId}`}>
          <Button variant="outline" className="mt-4">На главную</Button>
        </Link>
      </div>
    );
  }

  const handleAdd = () => {
    if (product.stock <= 0) return;
    addToCart(product);
    toast.success('Добавлено в корзину');
  };

  return (
    <div className="px-4 py-4">
      <div className="container-main mx-auto max-w-lg">
        <Link to={`/shop/${shopId}/catalog`} className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Назад
        </Link>

        {product.image && (
          <div className="aspect-video bg-secondary rounded-xl overflow-hidden mb-4">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>
        )}

        <h1 className="font-display text-2xl font-bold">{product.name}</h1>
        {product.subtitle && (
          <p className="text-muted-foreground mt-1">{product.subtitle}</p>
        )}

        <div className="flex items-center gap-3 mt-4">
          <span className="font-display text-2xl font-bold">${product.price}</span>
          {product.old_price && (
            <span className="text-lg text-muted-foreground line-through">${product.old_price}</span>
          )}
        </div>

        {product.stock > 0 ? (
          <div className="flex items-center gap-1.5 mt-2 text-sm text-primary">
            <Zap className="w-4 h-4" /> В наличии: {product.stock} шт
          </div>
        ) : (
          <div className="text-sm text-destructive mt-2">Нет в наличии</div>
        )}

        <Button
          className="w-full mt-6"
          size="lg"
          onClick={handleAdd}
          disabled={product.stock <= 0}
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          {product.stock > 0 ? 'Добавить в корзину' : 'Нет в наличии'}
        </Button>

        {product.description && (
          <div className="mt-6">
            <h2 className="font-display font-semibold mb-2">Описание</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {product.features.length > 0 && (
          <div className="mt-6">
            <h2 className="font-display font-semibold mb-2">Особенности</h2>
            <ul className="space-y-1.5">
              {product.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopProductDetails;
