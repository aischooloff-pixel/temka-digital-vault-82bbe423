import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider, useStore } from "@/contexts/StoreContext";
import { TelegramProvider } from "@/contexts/TelegramContext";
import { StorefrontProvider } from "@/contexts/StorefrontContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import Index from "./pages/Index";
import Catalog from "./pages/Catalog";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import OrderFailed from "./pages/OrderFailed";
import Account from "./pages/Account";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import Legal from "./pages/Legal";
import { Delivery, Guarantees } from "./pages/InfoPages";
import PlatformTerms from "./pages/PlatformTerms";
import PlatformPrivacy from "./pages/PlatformPrivacy";
import PlatformDisclaimer from "./pages/PlatformDisclaimer";
import NotFound from "./pages/NotFound";
import { Outlet } from "react-router-dom";

const MainLayoutInner = () => {
  const { cartCount, searchQuery, setSearchQuery } = useStore();

  return (
    <StorefrontProvider basePath="" cartCount={cartCount} shopName="TEMKA.STORE" supportLink="https://t.me/temka_support">
      <div className="min-h-screen flex flex-col">
        <Header
          name="TEMKA"
          nameInitial="T"
          nameHighlight=".STORE"
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

const MainLayout = () => <MainLayoutInner />;

// Shop (seller storefront)
import ShopLayout from "./pages/ShopLayout";
import ShopIndex from "./pages/ShopIndex";
import ShopCatalog from "./pages/ShopCatalog";
import ShopProductDetails from "./pages/ShopProductDetails";
import ShopCart from "./pages/ShopCart";
import ShopCheckout from "./pages/ShopCheckout";
import ShopOrderSuccess from "./pages/ShopOrderSuccess";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TelegramProvider>
        <StoreProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Seller shop storefront */}
              <Route path="/shop/:shopId" element={<ShopLayout />}>
                <Route index element={<ShopIndex />} />
                <Route path="catalog" element={<ShopCatalog />} />
                <Route path="product/:productId" element={<ShopProductDetails />} />
                <Route path="cart" element={<ShopCart />} />
                <Route path="checkout" element={<ShopCheckout />} />
                <Route path="order-success" element={<ShopOrderSuccess />} />
                <Route path="account" element={<Account />} />
                <Route path="faq" element={<FAQ />} />
                <Route path="about" element={<About />} />
                <Route path="terms" element={<Legal />} />
                <Route path="delivery" element={<Delivery />} />
                <Route path="guarantees" element={<Guarantees />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Main platform */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/order-failed" element={<OrderFailed />} />
                <Route path="/account" element={<Account />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/about" element={<About />} />
                <Route path="/terms" element={<Legal />} />
                <Route path="/privacy" element={<Legal />} />
                <Route path="/refund" element={<Legal />} />
              <Route path="/disclaimer" element={<Legal />} />
              <Route path="/delivery" element={<Delivery />} />
                <Route path="/guarantees" element={<Guarantees />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </StoreProvider>
      </TelegramProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
