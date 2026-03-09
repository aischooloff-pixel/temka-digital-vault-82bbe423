import { Link } from 'react-router-dom';
import { categories } from '@/data/products';

const Footer = () => {
  return (
    <footer className="border-t border-border/30 bg-card/30">
      <div className="container-main mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm font-display">T</span>
              </div>
              <span className="font-display font-bold text-lg tracking-tight">TEMKA<span className="text-primary">.STORE</span></span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Premium digital marketplace. Instant delivery, verified products, and buyer protection on every order.</p>
            <div className="flex gap-3 text-muted-foreground">
              <span className="text-lg cursor-pointer hover:text-foreground transition-colors">💬</span>
              <span className="text-lg cursor-pointer hover:text-foreground transition-colors">📨</span>
              <span className="text-lg cursor-pointer hover:text-foreground transition-colors">🐦</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-display font-semibold mb-4">Categories</h4>
            <ul className="space-y-2">
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
            <h4 className="font-display font-semibold mb-4">Information</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/delivery" className="text-sm text-muted-foreground hover:text-primary transition-colors">How Delivery Works</Link></li>
              <li><Link to="/guarantees" className="text-sm text-muted-foreground hover:text-primary transition-colors">Guarantees</Link></li>
              <li><Link to="/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors">Support</Link></li>
              <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/refund" className="text-sm text-muted-foreground hover:text-primary transition-colors">Refund Policy</Link></li>
            </ul>
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>🔒</span> SSL Secured
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>🛡️</span> Buyer Protection
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>⚡</span> Instant Delivery
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© 2024 TEMKA.STORE — All rights reserved.</p>
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
