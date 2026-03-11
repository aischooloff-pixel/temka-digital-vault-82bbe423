import { Outlet } from 'react-router-dom';
import { ShopProvider, useShop } from '@/contexts/ShopContext';
import { StorefrontProvider } from '@/contexts/StorefrontContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import { Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';

const ShopContent = () => {
  const { shopId } = useParams();
  const { shop, loading, error, cartCount, searchQuery, setSearchQuery } = useShop();
  const basePath = `/shop/${shopId}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-2xl font-bold mb-2">😔</h1>
        <p className="text-muted-foreground">{error || 'Магазин не найден'}</p>
      </div>
    );
  }

  return (
    <StorefrontProvider basePath={basePath} cartCount={cartCount} shopName={shop.name} supportLink={shop.support_link}>
      <div className="min-h-screen flex flex-col">
        <Header
          name={shop.name}
          nameInitial={shop.name?.[0]?.toUpperCase() || 'S'}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        <main className="flex-1 pb-14">
          <Outlet />
        </main>
        <Footer />
        <BottomNav />
      </div>
    </StorefrontProvider>
  );
};

const ShopLayout = () => (
  <ShopProvider>
    <ShopContent />
  </ShopProvider>
);

export default ShopLayout;
