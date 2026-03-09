import { Link } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import { useStore } from '@/contexts/StoreContext';
import { products } from '@/data/products';

const Favorites = () => {
  const { favorites } = useStore();
  const favoriteProducts = products.filter(p => favorites.includes(p.id));

  if (favoriteProducts.length === 0) {
    return (
      <div className="container-main mx-auto px-4 py-16 sm:py-20 text-center">
        <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-display text-xl sm:text-2xl font-bold">Пока ничего нет</h2>
        <p className="text-muted-foreground text-sm mt-2">Сохраняйте понравившиеся товары, и они появятся здесь</p>
        <Link to="/catalog"><Button variant="hero" className="mt-6">Перейти в каталог <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
      </div>
    );
  }

  return (
    <div className="container-main mx-auto px-4 py-6 sm:py-8">
      <h1 className="font-display text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Избранное</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {favoriteProducts.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
};

export default Favorites;
