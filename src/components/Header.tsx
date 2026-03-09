import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Search, Menu, X, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/contexts/StoreContext';
import { useState } from 'react';
import { categories } from '@/data/products';

const Header = () => {
  const { cartCount, searchQuery, setSearchQuery } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/catalog?search=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <header className="sticky top-0 z-50 glass-strong">
      {/* Top bar */}
      <div className="border-b border-border/30">
        <div className="container-main mx-auto flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3 sm:gap-4">
            <span>⚡ Мгновенная доставка</span>
            <span className="hidden sm:inline">🔒 Безопасные платежи</span>
            <span className="hidden md:inline">🛡️ Защита покупателя</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/support" className="hover:text-foreground transition-colors">Поддержка</Link>
            <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container-main mx-auto flex items-center justify-between gap-2 sm:gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm font-display">T</span>
          </div>
          <span className="font-display font-bold text-base sm:text-lg tracking-tight">TEMKA<span className="text-primary">.STORE</span></span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          <Link to="/catalog" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary">
            Каталог
          </Link>
          <div className="relative group">
            <button className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary flex items-center gap-1">
              Категории <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute top-full left-0 mt-1 w-56 glass-strong rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="p-2">
                {categories.map(cat => (
                  <Link key={cat.id} to={`/catalog?category=${cat.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors">
                    <span>{cat.icon}</span> {cat.name}
                    <span className="ml-auto text-xs text-muted-foreground">{cat.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <Link to="/about" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary">
            О нас
          </Link>
          <Link to="/contact" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary">
            Контакты
          </Link>
        </nav>

        {/* Search bar desktop */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => setSearchOpen(!searchOpen)}>
            <Search className="w-5 h-5" />
          </Button>
          <Link to="/favorites">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Heart className="w-5 h-5" />
            </Button>
          </Link>
          <Link to="/cart" className="relative">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>
          <Link to="/account">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <User className="w-5 h-5" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile search */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск товаров..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
            </div>
          </form>
        </div>
      )}

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border/30 bg-card/95 backdrop-blur-xl max-h-[70vh] overflow-y-auto">
          <nav className="container-main mx-auto px-4 py-4 space-y-1">
            <Link to="/catalog" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm text-foreground hover:bg-secondary rounded-md">Каталог</Link>
            {categories.map(cat => (
              <Link key={cat.id} to={`/catalog?category=${cat.id}`} onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md pl-6">
                {cat.icon} {cat.name}
              </Link>
            ))}
            <div className="border-t border-border/30 my-2" />
            <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm text-foreground hover:bg-secondary rounded-md">О нас</Link>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm text-foreground hover:bg-secondary rounded-md">Контакты</Link>
            <Link to="/support" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm text-foreground hover:bg-secondary rounded-md">Поддержка</Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
