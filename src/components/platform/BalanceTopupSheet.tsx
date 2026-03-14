import { useState, useEffect, useRef } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Wallet, ArrowRight, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTelegram } from '@/contexts/TelegramContext';

const PRESETS = [1, 5, 10, 25];
const POLL_INTERVAL = 5000;
const MAX_POLLS = 60; // 5 minutes

interface Props {
  balance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBalanceUpdated: () => void;
}

type TopupState = 'idle' | 'creating' | 'polling' | 'success' | 'expired' | 'error';

const BalanceTopupSheet = ({ balance, open, onOpenChange, onBalanceUpdated }: Props) => {
  const { initData, openTelegramLink } = useTelegram();
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [state, setState] = useState<TopupState>('idle');
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const pollCountRef = useRef(0);

  const handlePresetClick = (amount: number) => {
    setSelectedPreset(amount);
    setCustomAmount('');
  };

  const handleCustomChange = (val: string) => {
    setCustomAmount(val);
    setSelectedPreset(null);
  };

  const finalAmount = selectedPreset || (customAmount ? parseFloat(customAmount) : 0);
  const isValid = finalAmount >= 0.1 && finalAmount <= 1000;

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollCountRef.current = 0;
  };

  const startPolling = (invoiceId: string) => {
    stopPolling();
    setState('polling');
    setPendingInvoiceId(invoiceId);
    pollCountRef.current = 0;

    pollRef.current = window.setInterval(async () => {
      pollCountRef.current++;
      if (pollCountRef.current >= MAX_POLLS) {
        stopPolling();
        setState('expired');
        return;
      }
      try {
        const { data: res, error } = await supabase.functions.invoke('check-payment', {
          body: { invoiceId, initData, platform: true },
        });
        if (error) return;
        if (res?.paymentStatus === 'paid' || res?.topupStatus === 'paid') {
          stopPolling();
          setState('success');
          toast.success('Баланс пополнен!');
          onBalanceUpdated();
        } else if (res?.paymentStatus === 'expired' || res?.topupStatus === 'expired') {
          stopPolling();
          setState('expired');
          toast.error('Инвойс истёк');
        }
      } catch {}
    }, POLL_INTERVAL);
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (!open) {
      // Reset on close after a delay
      const t = setTimeout(() => {
        if (state === 'success' || state === 'expired' || state === 'error') {
          setState('idle');
          setPendingInvoiceId(null);
          setCustomAmount('');
          setSelectedPreset(null);
        }
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open, state]);

  const handleSubmit = async () => {
    if (!isValid || !initData) {
      toast.error('Сумма должна быть от $0.10 до $1000');
      return;
    }
    setState('creating');
    try {
      const { data: res, error } = await supabase.functions.invoke('create-topup-invoice', {
        body: { initData, amount: finalAmount, platform: true },
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      if (res?.payUrl) {
        openTelegramLink(res.payUrl);
        startPolling(res.invoiceId);
      }
    } catch (e: any) {
      setState('error');
      toast.error(e.message || 'Ошибка создания инвойса');
    }
  };

  const isProcessing = state === 'creating' || state === 'polling';

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!isProcessing) onOpenChange(v); }}>
      <DrawerContent>
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <Wallet className="w-4 h-4 text-blue-500" />
            Пополнение баланса
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4">
          {/* Current balance */}
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Текущий баланс</p>
            <p className="text-2xl font-bold text-gray-900">${balance.toFixed(2)}</p>
          </div>

          {state === 'success' ? (
            <div className="text-center py-4 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-sm font-medium text-gray-900">Баланс пополнен!</p>
              <p className="text-xs text-gray-400">Средства зачислены на ваш счёт</p>
            </div>
          ) : state === 'expired' ? (
            <div className="text-center py-4 space-y-2">
              <XCircle className="w-12 h-12 text-red-400 mx-auto" />
              <p className="text-sm font-medium text-gray-900">Инвойс истёк</p>
              <p className="text-xs text-gray-400">Попробуйте ещё раз</p>
            </div>
          ) : state === 'polling' ? (
            <div className="text-center py-4 space-y-2">
              <Loader2 className="w-8 h-8 text-blue-500 mx-auto animate-spin" />
              <p className="text-sm font-medium text-gray-900">Ожидание оплаты...</p>
              <p className="text-xs text-gray-400">Оплатите счёт в CryptoBot и вернитесь сюда</p>
            </div>
          ) : (
            <>
              <Separator />

              {/* Presets */}
              <div>
                <p className="text-xs text-gray-400 font-medium mb-2">Выберите сумму</p>
                <div className="grid grid-cols-4 gap-2">
                  {PRESETS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handlePresetClick(amount)}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        selectedPreset === amount
                          ? 'bg-[#2B7FFF] text-white shadow-md'
                          : 'bg-gray-50 text-gray-700 hover:bg-blue-50'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div>
                <p className="text-xs text-gray-400 font-medium mb-2">Или введите свою сумму</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <Input
                    type="number"
                    min="0.1"
                    max="1000"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 pt-2 space-y-2">
          {state === 'idle' || state === 'error' || state === 'creating' ? (
            <Button
              onClick={handleSubmit}
              disabled={!isValid || state === 'creating'}
              className="w-full bg-[#2B7FFF] hover:bg-[#2070EE] text-white"
            >
              {state === 'creating' ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Создание...</>
              ) : (
                <>
                  Пополнить ${finalAmount > 0 ? finalAmount.toFixed(2) : '0.00'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          ) : null}
          {state === 'success' || state === 'expired' ? (
            <Button
              onClick={() => { setState('idle'); setPendingInvoiceId(null); }}
              className="w-full bg-[#2B7FFF] hover:bg-[#2070EE] text-white"
            >
              {state === 'success' ? 'Готово' : 'Попробовать снова'}
            </Button>
          ) : null}
          {state !== 'creating' && state !== 'polling' && (
            <DrawerClose asChild>
              <Button variant="outline" size="sm" className="w-full">Отмена</Button>
            </DrawerClose>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default BalanceTopupSheet;
