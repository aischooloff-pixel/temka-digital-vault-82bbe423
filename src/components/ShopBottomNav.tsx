import { Link, useLocation, useParams } from 'react-router-dom';
import { Home, Search, ShoppingCart, MessageCircle } from 'lucide-react';
import { useShop } from '@/contexts/ShopContext';

const ShopBottomNav = () => {
  const { shopId } = useParams();
  const location = useLocation();
  const { cartCount, shop } = useShop();
  const base = `/shop/${shopId}`;

  const navItems = [
    { path: base, icon: Home, label: 'Главная', exact: true },
    { path: `${base}/catalog`, icon: Search, label: 'Каталог' },
    { path: `${base}/cart`, icon: ShoppingCart, label: 'Корзина' },
  ];

  // Add support link if available
  const supportLink = shop?.support_link;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/30 safe-area-bottom">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.path === `${base}/cart` && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        {supportLink && (
          <a
            href={supportLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors text-muted-foreground"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[10px] font-medium">Поддержка</span>
          </a>
        )}
      </div>
    </nav>
  );
};

export default ShopBottomNav;
