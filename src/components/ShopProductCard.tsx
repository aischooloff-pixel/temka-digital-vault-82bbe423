import { Link } from 'react-router-dom';
import { ShoppingCart, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShop, ShopProduct } from '@/contexts/ShopContext';
import { toast } from 'sonner';

interface Props {
  product: ShopProduct;
  shopId: string;
}

const ShopProductCard = ({ product, shopId }: Props) => {
  const { addToCart } = useShop();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) return;
    addToCart(product);
    toast.success('Добавлено в корзину');
  };

  return (
    <Link
      to={`/shop/${shopId}/product/${product.id}`}
      className="block bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/30 transition-all"
    >
      {product.image && (
        <div className="aspect-[16/10] bg-secondary overflow-hidden">
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3">
        <h3 className="font-display font-semibold text-sm leading-tight line-clamp-2">{product.name}</h3>
        {product.subtitle && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{product.subtitle}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-base">${product.price}</span>
            {product.old_price && (
              <span className="text-xs text-muted-foreground line-through">${product.old_price}</span>
            )}
          </div>
          <Button
            size="sm"
            variant={product.stock > 0 ? 'default' : 'outline'}
            className="h-8 px-3 text-xs"
            onClick={handleAdd}
            disabled={product.stock <= 0}
          >
            {product.stock > 0 ? (
              <><ShoppingCart className="w-3 h-3 mr-1" /> В корзину</>
            ) : (
              'Нет в наличии'
            )}
          </Button>
        </div>
        {product.stock > 0 && (
          <div className="flex items-center gap-1 mt-2 text-[10px] text-primary">
            <Zap className="w-3 h-3" /> В наличии: {product.stock} шт
          </div>
        )}
      </div>
    </Link>
  );
};

export default ShopProductCard;
