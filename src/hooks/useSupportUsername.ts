import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSupportUsername = () => {
  return useQuery({
    queryKey: ['support-username'],
    queryFn: async () => {
      const { data } = await supabase
        .from('shop_settings')
        .select('value')
        .eq('key', 'support_username')
        .maybeSingle();
      return data?.value || 'TeleStoreHelp';
    },
    staleTime: 5 * 60 * 1000,
  });
};
