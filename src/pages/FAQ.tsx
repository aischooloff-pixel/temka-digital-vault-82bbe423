import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const faqData = [
  {
    category: 'General',
    items: [
      { q: 'What is TEMKA.STORE?', a: 'TEMKA.STORE is a premium digital marketplace where you can purchase verified digital products including software keys, streaming subscriptions, social media accounts, and more.' },
      { q: 'Is it safe to buy from TEMKA.STORE?', a: 'Yes. All products are verified before listing. We use secure payment processing and offer buyer protection with replacement or refund guarantees on all purchases.' },
      { q: 'How do I create an account?', a: 'Click the user icon in the header and follow the registration process. You can sign up with email or connect via Telegram.' },
    ],
  },
  {
    category: 'Orders & Delivery',
    items: [
      { q: 'How fast is delivery?', a: 'Instant delivery products are sent within minutes after payment confirmation. Manual delivery products are processed within 1-24 hours.' },
      { q: 'How do I receive my product?', a: 'Product details, credentials, or license keys are sent to your registered email address. You can also view them in your account dashboard.' },
      { q: 'Can I track my order?', a: 'Yes, all orders can be tracked in your Account > Order History section. You will also receive email updates on your order status.' },
    ],
  },
  {
    category: 'Payments',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept credit/debit cards (Visa, Mastercard), cryptocurrency (BTC, ETH, USDT), PayPal, and other regional payment methods.' },
      { q: 'Is my payment information secure?', a: 'Yes, all payments are processed through secure, encrypted channels. We never store your full payment details on our servers.' },
      { q: 'What if my payment fails?', a: "If your payment fails, try a different payment method or contact your bank. If the amount was charged but the order wasn't created, contact our support team." },
    ],
  },
  {
    category: 'Refunds & Replacements',
    items: [
      { q: 'Can I get a refund?', a: "We offer refunds within the guarantee period if the product doesn't match the description or stops working. Each product has a specific guarantee period listed on its page." },
      { q: 'How do replacements work?', a: 'If a product is defective, contact support with your order ID. We will verify the issue and provide a replacement at no additional cost within the guarantee period.' },
      { q: 'What is not covered by the guarantee?', a: 'Guarantee does not cover products banned or disabled due to user actions, violations of terms of service of the platform, or usage outside the intended purpose.' },
    ],
  },
  {
    category: 'Account & Security',
    items: [
      { q: 'How do I secure my purchased accounts?', a: 'After receiving your account, immediately change the password, enable two-factor authentication, and update the recovery email/phone. We provide detailed setup guides with each purchase.' },
      { q: 'Can I resell purchased products?', a: 'Reselling is not recommended and voids your guarantee. Products are intended for personal use only.' },
    ],
  },
];

const FAQ = () => {
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggle = (key: string) => {
    setOpenItems(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const filtered = faqData.map(cat => ({
    ...cat,
    items: cat.items.filter(i => !search || i.q.toLowerCase().includes(search.toLowerCase()) || i.a.toLowerCase().includes(search.toLowerCase())),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="container-main mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mt-2">Find answers to common questions about our platform</p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto mb-10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
      </div>

      {/* FAQ List */}
      <div className="max-w-3xl mx-auto space-y-8">
        {filtered.map(cat => (
          <div key={cat.category}>
            <h3 className="font-display font-semibold text-lg mb-3">{cat.category}</h3>
            <div className="space-y-2">
              {cat.items.map((item, i) => {
                const key = `${cat.category}-${i}`;
                const isOpen = openItems.includes(key);
                return (
                  <div key={key} className="bg-card border border-border/50 rounded-xl overflow-hidden">
                    <button onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium hover:bg-secondary/30 transition-colors">
                      {item.q}
                      {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border/30 pt-3">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="font-display font-semibold">No questions found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="text-center mt-12">
        <p className="text-muted-foreground">Didn't find your answer?</p>
        <Link to="/support"><Button variant="hero" className="mt-3"><Headphones className="w-4 h-4 mr-1" /> Contact Support</Button></Link>
      </div>
    </div>
  );
};

export default FAQ;
