import { Link } from 'react-router-dom';
import { categories } from '@/data/products';

const Footer = () => {
  return (
    <footer className="border-t border-border/30 bg-card/30">
      <div className="container-main mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm font-display">T</span>
              </div>
              <span className="font-display font-bold text-lg tracking-tight">TEMKA<span className="text-primary">.STORE</span></span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Премиум цифровой маркетплейс. Мгновенная доставка, проверенные товары и защита покупателя на каждый заказ.</p>
            <div className="flex gap-3 text-muted-foreground">
              <span className="text-lg cursor-pointer hover:text-foreground transition-colors">💬</span>
              <span className="text-lg cursor-pointer hover:text-foreground transition-colors">📨</span>
              <span className="text-lg cursor-pointer hover:text-foreground transition-colors">🐦</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-display font-semibold mb-3 md:mb-4 text-sm md:text-base">Категории</h4>
            <ul className="space-y-1.5 md:space-y-2">
              {categories.slice(0, 6).map(cat => (
                <li key={cat.id}>
                  <Link to={`/catalog?category=${cat.id}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Information */}
          <div>
            <h4 className="font-display font-semibold mb-3 md:mb-4 text-sm md:text-base">Информация</h4>
            <ul className="space-y-1.5 md:space-y-2">
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">О нас</Link></li>
              <li><Link to="/delivery" className="text-sm text-muted-foreground hover:text-primary transition-colors">Как работает доставка</Link></li>
              <li><Link to="/guarantees" className="text-sm text-muted-foreground hover:text-primary transition-colors">Гарантии</Link></li>
              <li><Link to="/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors">Поддержка</Link></li>
              <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Контакты</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold mb-3 md:mb-4 text-sm md:text-base">Документы</h4>
            <ul className="space-y-1.5 md:space-y-2">
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Условия использования</Link></li>
              <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Политика конфиденциальности</Link></li>
              <li><Link to="/refund" className="text-sm text-muted-foreground hover:text-primary transition-colors">Политика возврата</Link></li>
            </ul>
            <div className="mt-4 md:mt-6 space-y-1.5 md:space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>🔒</span> SSL защита
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>🛡️</span> Защита покупателя
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>⚡</span> Мгновенная доставка
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 md:mt-12 pt-6 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© 2024 TEMKA.STORE — Все права защищены.</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Visa</span>
            <span>Mastercard</span>
            <span>Crypto</span>
            <span>PayPal</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
