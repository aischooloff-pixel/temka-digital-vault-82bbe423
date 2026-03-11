import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ShopProductCard from '@/components/ShopProductCard';
import { useShop } from '@/contexts/ShopContext';

const ShopCatalog = () => {
  const { shopId } = useParams();
  const { products, productsLoading, searchQuery, setSearchQuery } = useShop();
  const [localSearch, setLocalSearch] = useState('');

  const q = localSearch || searchQuery;
  const filtered = useMemo(() => {
    if (!q.trim()) return products;
    const lower = q.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.subtitle.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower)
    );
  }, [products, q]);

  return (
    <div className="px-4 py-6">
      <div className="container-main mx-auto">
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск товаров..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((product) => (
              <ShopProductCard key={product.id} product={product} shopId={shopId!} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">
            {q ? 'Ничего не найдено' : 'Товары скоро появятся'}
          </p>
        )}
      </div>
    </div>
  );
};

export default ShopCatalog;
