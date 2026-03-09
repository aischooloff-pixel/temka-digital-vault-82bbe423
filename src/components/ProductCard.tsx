import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product } from '@/data/products';
import { useStore } from '@/contexts/StoreContext';

const tagLabels: Record<string, string> = {
  'hot': 'ХИТ',
  'new': 'НОВИНКА',
  'sale': 'СКИДКА',
  'best-seller': 'БЕСТСЕЛЛЕР',
  'instant': 'МГНОВЕННО',
};

const tagColors: Record<string, string> = {
  'hot': 'bg-destructive/20 text-destructive border-destructive/30',
  'new': 'bg-primary/20 text-primary border-primary/30',
  'sale': 'bg-warning/20 text-warning border-warning/30',
  'best-seller': 'bg-gold/20 text-gold border-gold/30',
  'instant': 'bg-primary/20 text-primary border-primary/30',
};

const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useStore();
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

  return (
    <div className="group relative bg-card border border-border/50 rounded-xl overflow-hidden hover-lift hover:border-primary/30 transition-all duration-300">
      {/* Image area */}
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative h-36 sm:h-44 bg-secondary/50 flex items-center justify-center overflow-hidden">
          <div className="text-4xl sm:text-5xl">{
            product.category === 'social-media' ? '📱' :
            product.category === 'gaming' ? '🎮' :
            product.category === 'streaming' ? '🎬' :
            product.category === 'software' ? '🔑' :
            product.category === 'premium' ? '👑' :
            product.category === 'automation' ? '🤖' :
            product.category === 'ai-tools' ? '🧠' : '⚡'
          }</div>
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Tags */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {product.tags.map(tag => (
              <span key={tag} className={`text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full border ${tagColors[tag] || 'bg-secondary text-secondary-foreground border-border'}`}>
                {tagLabels[tag] || tag.replace('-', ' ').toUpperCase()}
              </span>
            ))}
          </div>

          {/* Discount badge */}
          {discount > 0 && (
            <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-3 sm:p-4">
        {/* Category */}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{product.platform}</span>

        <Link to={`/product/${product.id}`}>
          <h3 className="font-display font-semibold text-xs sm:text-sm mt-1 line-clamp-1 group-hover:text-primary transition-colors">{product.title}</h3>
        </Link>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-1">{product.subtitle}</p>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-2">
          <Star className="w-3 h-3 fill-gold text-gold" />
          <span className="text-xs font-medium">{product.rating}</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground">({product.reviewCount})</span>
        </div>

        {/* Delivery badge */}
        <div className="flex items-center gap-1 mt-2">
          {product.deliveryType === 'instant' ? (
            <span className="flex items-center gap-1 text-[10px] text-primary font-medium">
              <Zap className="w-3 h-3" /> Мгновенная доставка
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
              <Clock className="w-3 h-3" /> Ручная доставка
            </span>
          )}
          {product.stock < 10 && (
            <span className="text-[10px] text-warning font-medium ml-auto">Осталось {product.stock}</span>
          )}
        </div>

        {/* Price & Actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <div>
            <span className="font-display font-bold text-base sm:text-lg">${product.price}</span>
            {product.oldPrice && (
              <span className="text-[10px] sm:text-xs text-muted-foreground line-through ml-1.5 sm:ml-2">${product.oldPrice}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8"
              onClick={() => toggleFavorite(product.id)}
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorite(product.id) ? 'fill-destructive text-destructive' : ''}`} />
            </Button>
            <Button
              size="sm"
              className="h-7 sm:h-8 text-xs"
              onClick={() => addToCart(product)}
            >
              <ShoppingCart className="w-3 h-3 mr-1" />
              В корзину
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
