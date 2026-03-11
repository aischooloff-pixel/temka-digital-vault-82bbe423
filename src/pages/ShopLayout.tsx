import { Outlet } from 'react-router-dom';
import { ShopProvider, useShop } from '@/contexts/ShopContext';
import ShopHeader from '@/components/ShopHeader';
import ShopBottomNav from '@/components/ShopBottomNav';
import ShopFooter from '@/components/ShopFooter';
import { Loader2 } from 'lucide-react';

const ShopContent = () => {
  const { shop, loading, error } = useShop();

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
    <div className="min-h-screen flex flex-col">
      <ShopHeader />
      <main className="flex-1 pb-14">
        <Outlet />
      </main>
      <ShopFooter />
      <ShopBottomNav />
    </div>
  );
};

const ShopLayout = () => {
  return (
    <ShopProvider>
      <ShopContent />
    </ShopProvider>
  );
};

export default ShopLayout;
