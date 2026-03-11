import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export interface ShopData {
  id: string;
  name: string;
  slug: string;
  color: string;
  hero_title: string;
  hero_description: string;
  welcome_message: string;
  support_link: string;
  status: string;
}

export interface ShopProduct {
  id: string;
  shop_id: string;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  old_price: number | null;
  stock: number;
  image: string | null;
  features: string[];
  type: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ShopCategory {
  id: string;
  shop_id: string;
  name: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ShopReview {
  id: string;
  shop_id: string;
  product_id: string | null;
  author: string;
  avatar: string;
  rating: number;
  text: string;
  verified: boolean;
  moderation_status: string;
  created_at: string;
}

interface ShopCartItem {
  product: ShopProduct;
  quantity: number;
}

interface ShopContextType {
  shop: ShopData | null;
  loading: boolean;
  error: string | null;
  products: ShopProduct[];
  productsLoading: boolean;
  categories: ShopCategory[];
  categoriesLoading: boolean;
  reviews: ShopReview[];
  reviewsLoading: boolean;
  cart: ShopCartItem[];
  addToCart: (product: ShopProduct) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

function hexToHSL(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { shopId } = useParams<{ shopId: string }>();
  const [shop, setShop] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [reviews, setReviews] = useState<ShopReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [cart, setCart] = useState<ShopCartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load cart from localStorage scoped to shop
  useEffect(() => {
    if (!shopId) return;
    try {
      const raw = localStorage.getItem(`shop-cart-${shopId}`);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, [shopId]);

  // Persist cart
  useEffect(() => {
    if (!shopId) return;
    localStorage.setItem(`shop-cart-${shopId}`, JSON.stringify(cart));
  }, [cart, shopId]);

  // Load shop data
  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    setError(null);

    const fetchShop = async () => {
      let query = supabase
        .from('shops')
        .select('id, name, slug, color, hero_title, hero_description, welcome_message, support_link, status')
        .eq('status', 'active');

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shopId);
      if (isUuid) {
        query = query.eq('id', shopId);
      } else {
        query = query.eq('slug', shopId);
      }

      const { data, error: err } = await query.maybeSingle();
      if (err) { setError('Ошибка загрузки магазина'); setLoading(false); return; }
      if (!data) { setError('Магазин не найден'); setLoading(false); return; }

      setShop(data as ShopData);
      setLoading(false);

      // Apply color theme
      const hsl = hexToHSL(data.color || '#2B7FFF');
      document.documentElement.style.setProperty('--primary', hsl);
      document.documentElement.style.setProperty('--ring', hsl);
      document.documentElement.style.setProperty('--accent', hsl);

      // Load products
      setProductsLoading(true);
      const { data: prods } = await supabase
        .from('shop_products')
        .select('*')
        .eq('shop_id', data.id)
        .eq('is_active', true)
        .order('sort_order');
      setProducts((prods || []) as unknown as ShopProduct[]);
      setProductsLoading(false);

      // Load categories
      setCategoriesLoading(true);
      const { data: cats } = await supabase
        .from('shop_categories')
        .select('*')
        .eq('shop_id', data.id)
        .eq('is_active', true)
        .order('sort_order');
      setCategories((cats || []) as unknown as ShopCategory[]);
      setCategoriesLoading(false);

      // Load reviews (approved only)
      setReviewsLoading(true);
      const { data: revs } = await supabase
        .from('public_shop_reviews' as any)
        .select('*')
        .eq('shop_id', data.id)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false });
      setReviews((revs || []) as unknown as ShopReview[]);
      setReviewsLoading(false);
    };

    fetchShop();

    return () => {
      document.documentElement.style.setProperty('--primary', '160 84% 50%');
      document.documentElement.style.setProperty('--ring', '160 84% 50%');
      document.documentElement.style.setProperty('--accent', '160 60% 40%');
    };
  }, [shopId]);

  const addToCart = useCallback((product: ShopProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    setCart(prev => prev.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    ));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <ShopContext.Provider value={{
      shop, loading, error,
      products, productsLoading,
      categories, categoriesLoading,
      reviews, reviewsLoading,
      cart, addToCart, removeFromCart, updateQuantity, clearCart,
      cartTotal, cartCount,
      searchQuery, setSearchQuery,
    }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
};
