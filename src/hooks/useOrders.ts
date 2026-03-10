import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTelegram } from '@/contexts/TelegramContext';
import type { DbOrder, DbOrderItem, DbBalanceHistory } from '@/types/database';

export const useOrders = () => {
  const { user } = useTelegram();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('telegram_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as DbOrder[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `telegram_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  return query;
};

export const useOrderItems = (orderId: string) => {
  return useQuery({
    queryKey: ['order-items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      if (error) throw error;
      return data as unknown as DbOrderItem[];
    },
    enabled: !!orderId,
  });
};

export const useUserStats = () => {
  const { user } = useTelegram();

  return useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { orderCount: 0, totalSpent: 0 };
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, status')
        .eq('telegram_id', user.id);
      if (error) throw error;
      const orders = data as unknown as Pick<DbOrder, 'total_amount' | 'status'>[];
      const paid = orders.filter(o => ['paid', 'processing', 'delivered', 'completed'].includes(o.status));
      return {
        orderCount: orders.length,
        totalSpent: paid.reduce((s, o) => s + Number(o.total_amount), 0),
      };
    },
    enabled: !!user?.id,
  });
};

export const useUserProfile = () => {
  const { user } = useTelegram();

  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('balance, role, is_blocked, internal_note')
        .eq('telegram_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as { balance: number; role: string; is_blocked: boolean; internal_note: string | null } | null;
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
