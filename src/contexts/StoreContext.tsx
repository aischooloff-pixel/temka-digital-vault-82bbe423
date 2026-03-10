import React, { createContext, useContext, useState, useCallback } from 'react';
import type { DbProduct } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';

interface CartItem {
  product: DbProduct;
  quantity: number;
}

export interface PromoResult {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
}

interface StoreContextType {
  cart: CartItem[];
  addToCart: (product: DbProduct) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // Promo
  promoCode: string;
  setPromoCode: (code: string) => void;
  promoResult: PromoResult | null;
  promoError: string;
  promoLoading: boolean;
  applyPromo: (code: string, telegramId?: number) => Promise<void>;
  clearPromo: () => void;
  discount: number;
  totalAfterDiscount: number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);

  const addToCart = useCallback((product: DbProduct) => {
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
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setPromoResult(null);
    setPromoCode('');
    setPromoError('');
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const discount = promoResult
    ? promoResult.discountType === 'percent'
      ? cartTotal * (promoResult.discountValue / 100)
      : promoResult.discountValue
    : 0;
  const totalAfterDiscount = Math.max(0, cartTotal - discount);

  const applyPromo = useCallback(async (code: string, telegramId?: number) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const { data, error } = await supabase
        .from('promocodes')
        .select('*')
        .eq('code', trimmed)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      if (!data) { setPromoError('Промокод не найден'); setPromoResult(null); return; }
      const now = new Date().toISOString();
      if (data.valid_from && now < data.valid_from) { setPromoError('Промокод ещё не активен'); return; }
      if (data.valid_until && now > data.valid_until) { setPromoError('Промокод истёк'); return; }
      if (data.max_uses !== null && data.used_count >= data.max_uses) { setPromoError('Лимит использований исчерпан'); return; }
      // Check per-user limit
      if (telegramId && (data as any).max_uses_per_user) {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('telegram_id', telegramId)
          .eq('promo_code', trimmed);
        if (count !== null && count >= (data as any).max_uses_per_user) {
          setPromoError('Вы уже использовали этот промокод максимальное число раз');
          return;
        }
      }
      setPromoResult({
        id: data.id,
        code: trimmed,
        discountType: data.discount_type as 'percent' | 'fixed',
        discountValue: Number(data.discount_value),
      });
      setPromoError('');
    } catch {
      setPromoError('Ошибка проверки');
    } finally {
      setPromoLoading(false);
    }
  }, []);

  const clearPromo = useCallback(() => {
    setPromoResult(null);
    setPromoCode('');
    setPromoError('');
  }, []);

  return (
    <StoreContext.Provider value={{
      cart, addToCart, removeFromCart, updateQuantity, clearCart,
      cartTotal, cartCount, searchQuery, setSearchQuery,
      promoCode, setPromoCode, promoResult, promoError, promoLoading,
      applyPromo, clearPromo, discount, totalAfterDiscount,
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
