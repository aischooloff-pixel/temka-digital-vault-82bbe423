import { Link } from 'react-router-dom';
import { useStorefront, useStorefrontPath } from '@/contexts/StorefrontContext';
import cryptobotLogo from '@/assets/cryptobot-logo.jpeg';

const Footer = () => {
  const { shopName } = useStorefront();
  const buildPath = useStorefrontPath();
  const displayName = shopName || 'TEMKA.STORE';

  return (
    <footer className="border-t border-border/30 bg-card/30 pb-20">
      <div className="container-main mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <h4 className="font-display font-semibold text-xs mb-2">Информация</h4>
            <ul className="space-y-1">
              <li><Link to={buildPath('/about')} className="text-xs text-muted-foreground hover:text-primary transition-colors">О нас</Link></li>
              <li><Link to={buildPath('/faq')} className="text-xs text-muted-foreground hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to={buildPath('/delivery')} className="text-xs text-muted-foreground hover:text-primary transition-colors">Доставка</Link></li>
              <li><Link to={buildPath('/guarantees')} className="text-xs text-muted-foreground hover:text-primary transition-colors">Гарантии</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-xs mb-2">Документы</h4>
            <ul className="space-y-1">
              <li><Link to={buildPath('/terms')} className="text-xs text-muted-foreground hover:text-primary transition-colors">Условия и отказ</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/30 text-center">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            {displayName} · Оплата через <img src={cryptobotLogo} alt="CryptoBot" className="w-3.5 h-3.5 rounded-sm inline-block" /> CryptoBot
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
