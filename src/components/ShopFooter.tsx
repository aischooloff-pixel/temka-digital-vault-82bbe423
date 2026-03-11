import { useParams } from 'react-router-dom';
import { useShop } from '@/contexts/ShopContext';
import cryptobotLogo from '@/assets/cryptobot-logo.jpeg';

const ShopFooter = () => {
  const { shop } = useShop();

  return (
    <footer className="border-t border-border/30 bg-card/30 pb-20">
      <div className="container-main mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            {shop?.name || 'Магазин'} · Оплата через <img src={cryptobotLogo} alt="CryptoBot" className="w-3.5 h-3.5 rounded-sm inline-block" /> CryptoBot
          </p>
        </div>
      </div>
    </footer>
  );
};

export default ShopFooter;
