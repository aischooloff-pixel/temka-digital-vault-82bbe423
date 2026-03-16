import { Link } from 'react-router-dom';
import { useStorefront, useStorefrontPath } from '@/contexts/StorefrontContext';
import cryptobotLogo from '@/assets/cryptobot-logo.jpeg';
import { Flag } from 'lucide-react';

const Footer = () => {
  const { shopName, basePath, botUsername } = useStorefront();
  const buildPath = useStorefrontPath();
  const displayName = shopName || 'TEMKA.STORE';

  const isShopStorefront = basePath.startsWith('/shop/');

  const shopIdentifier = botUsername
    ? `@${botUsername}`
    : `${window.location.origin}${basePath}`;

  const reportText = encodeURIComponent(
    `Здравствуйте. Магазин «${displayName}» (${shopIdentifier}) нарушает правила платформы.\nПрошу проверить.\nВ следующем сообщении опишу причину нарушения.`
  );

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

        {isShopStorefront && (
          <div className="mt-3 pt-3 border-t border-border/20 flex flex-col items-center gap-1.5">
            <p className="text-[10px] text-muted-foreground/60">
              Магазин создан через{' '}
              <a
                href="https://t.me/sazcawd2bot?start=platform"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary/70 hover:text-primary transition-colors underline underline-offset-2"
              >
                ShopBot Platform
              </a>
            </p>
            <a
              href={`https://t.me/sfnanstnsgmsg?text=${reportText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-destructive/70 transition-colors"
            >
              <Flag className="w-2.5 h-2.5" />
              Пожаловаться на магазин
            </a>
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;
