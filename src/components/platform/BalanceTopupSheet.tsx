import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Wallet, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const PRESETS = [1, 5, 10, 25];

interface Props {
  balance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTopup: (amount: number) => void;
  loading?: boolean;
}

const BalanceTopupSheet = ({ balance, open, onOpenChange, onTopup, loading }: Props) => {
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

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

  const handleSubmit = () => {
    if (!isValid) {
      toast.error('Сумма должна быть от $0.10 до $1000');
      return;
    }
    onTopup(finalAmount);
  };

  return (
    <Drawer open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setCustomAmount(''); setSelectedPreset(null); } }}>
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
        </div>

        <div className="p-4 pt-2 space-y-2">
          <Button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="w-full bg-[#2B7FFF] hover:bg-[#2070EE] text-white"
          >
            {loading ? 'Создание...' : (
              <>
                Пополнить ${finalAmount > 0 ? finalAmount.toFixed(2) : '0.00'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" size="sm" className="w-full">Отмена</Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default BalanceTopupSheet;
