import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import { products, categories } from '@/data/products';

const sortOptions = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'newest', label: 'Newest' },
];

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('search') || '';

  const [search, setSearch] = useState(searchParam);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [sortBy, setSortBy] = useState('popular');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [deliveryType, setDeliveryType] = useState<string>('');
  const [minRating, setMinRating] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = [...products];
    if (search) result = result.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.subtitle.toLowerCase().includes(search.toLowerCase()));
    if (selectedCategory) result = result.filter(p => p.category === selectedCategory);
    if (deliveryType) result = result.filter(p => p.deliveryType === deliveryType);
    if (minRating) result = result.filter(p => p.rating >= minRating);
    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    switch (sortBy) {
      case 'price-asc': result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'newest': result.reverse(); break;
      default: result.sort((a, b) => b.reviewCount - a.reviewCount);
    }
    return result;
  }, [search, selectedCategory, sortBy, priceRange, deliveryType, minRating]);

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSortBy('popular');
    setPriceRange([0, 500]);
    setDeliveryType('');
    setMinRating(0);
    setSearchParams({});
  };

  const activeCat = categories.find(c => c.id === selectedCategory);

  return (
    <div className="container-main mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold">
          {activeCat ? activeCat.name : 'All Products'}
        </h1>
        <p className="text-muted-foreground text-sm mt-2">
          {activeCat ? `Browse ${activeCat.count} products in ${activeCat.name}` : `${products.length} digital products available`}
        </p>
      </div>

      {/* Search & Sort bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="h-10 px-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Button variant="outline" className="lg:hidden" onClick={() => setFiltersOpen(!filtersOpen)}>
            <SlidersHorizontal className="w-4 h-4 mr-1" /> Filters
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <aside className={`${filtersOpen ? 'fixed inset-0 z-50 bg-background/95 p-6 overflow-y-auto' : 'hidden'} lg:block lg:relative lg:bg-transparent lg:p-0 w-full lg:w-64 shrink-0`}>
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <h3 className="font-display font-bold text-lg">Filters</h3>
            <Button variant="ghost" size="icon" onClick={() => setFiltersOpen(false)}><X className="w-5 h-5" /></Button>
          </div>

          <div className="space-y-6">
            {/* Categories */}
            <div>
              <h4 className="font-display font-semibold text-sm mb-3">Category</h4>
              <div className="space-y-1">
                <button
                  onClick={() => { setSelectedCategory(''); setSearchParams({}); }}
                  className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${!selectedCategory ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                >
                  All Categories
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); setSearchParams({ category: cat.id }); }}
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedCategory === cat.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                  >
                    {cat.icon} {cat.name} <span className="text-xs opacity-60">({cat.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <h4 className="font-display font-semibold text-sm mb-3">Price Range</h4>
              <div className="flex items-center gap-2">
                <input type="number" value={priceRange[0]} onChange={e => setPriceRange([Number(e.target.value), priceRange[1]])}
                  className="w-20 h-8 px-2 bg-secondary border border-border rounded text-sm text-foreground" placeholder="Min" />
                <span className="text-muted-foreground text-sm">—</span>
                <input type="number" value={priceRange[1]} onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
                  className="w-20 h-8 px-2 bg-secondary border border-border rounded text-sm text-foreground" placeholder="Max" />
              </div>
            </div>

            {/* Delivery Type */}
            <div>
              <h4 className="font-display font-semibold text-sm mb-3">Delivery</h4>
              <div className="space-y-1">
                {['', 'instant', 'manual'].map(type => (
                  <button key={type} onClick={() => setDeliveryType(type)}
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${deliveryType === type ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                    {type === '' ? 'All' : type === 'instant' ? '⚡ Instant' : '🕐 Manual'}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <h4 className="font-display font-semibold text-sm mb-3">Min Rating</h4>
              <div className="space-y-1">
                {[0, 4, 4.5, 4.8].map(r => (
                  <button key={r} onClick={() => setMinRating(r)}
                    className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${minRating === r ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
                    {r === 0 ? 'All' : `${r}+ ⭐`}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">Clear Filters</Button>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="font-display font-semibold text-lg">No products found</h3>
              <p className="text-muted-foreground text-sm mt-2">Try adjusting your filters or search query</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">{filtered.length} products found</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Catalog;
