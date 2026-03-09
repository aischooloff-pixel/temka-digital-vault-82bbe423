import { Zap, Shield, CheckCircle2, Clock, RefreshCcw, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const Delivery = () => (
  <div className="container-main mx-auto px-4 py-8 max-w-3xl">
    <div className="text-center mb-10">
      <h1 className="font-display text-3xl md:text-4xl font-bold">How Delivery Works</h1>
      <p className="text-muted-foreground mt-2">Fast, secure, and straightforward</p>
    </div>
    <div className="space-y-6">
      {[
        { icon: '1️⃣', title: 'Place Your Order', desc: 'Browse our catalog, add products to cart, and complete checkout with your preferred payment method.' },
        { icon: '2️⃣', title: 'Payment Confirmation', desc: 'Once payment is confirmed, your order is automatically queued for delivery.' },
        { icon: '3️⃣', title: 'Instant Delivery', desc: 'For instant delivery products, credentials and details are sent to your email within minutes. Manual delivery products are processed within 1-24 hours.' },
        { icon: '4️⃣', title: 'Access Your Product', desc: 'Follow the provided instructions to access and secure your product. Setup guides are included with every purchase.' },
      ].map((step, i) => (
        <div key={i} className="flex gap-4 p-5 bg-card border border-border/50 rounded-xl">
          <span className="text-2xl">{step.icon}</span>
          <div>
            <h3 className="font-display font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
    <div className="text-center mt-8">
      <Link to="/catalog"><Button variant="hero" size="lg">Start Shopping</Button></Link>
    </div>
  </div>
);

export const Guarantees = () => (
  <div className="container-main mx-auto px-4 py-8 max-w-3xl">
    <div className="text-center mb-10">
      <h1 className="font-display text-3xl md:text-4xl font-bold">Our Guarantees</h1>
      <p className="text-muted-foreground mt-2">Your satisfaction is our priority</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[
        { icon: Shield, title: 'Buyer Protection', desc: 'Every purchase is protected. If the product does not match the description, we provide a replacement or full refund.' },
        { icon: CheckCircle2, title: 'Verified Products', desc: 'All products are tested and verified before listing. We ensure authenticity and quality.' },
        { icon: RefreshCcw, title: 'Free Replacements', desc: 'If a product stops working within the guarantee period, we replace it at no extra cost.' },
        { icon: Headphones, title: '24/7 Support', desc: 'Our support team is always available to help with any issues or questions.' },
        { icon: Clock, title: 'Fast Resolution', desc: 'Issues are typically resolved within 1-2 hours. We value your time.' },
        { icon: Zap, title: 'Instant Delivery', desc: 'Most products are delivered within minutes. No waiting, no delays.' },
      ].map((g, i) => (
        <div key={i} className="p-5 bg-card border border-border/50 rounded-xl">
          <g.icon className="w-6 h-6 text-primary mb-2" />
          <h3 className="font-display font-semibold text-sm">{g.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{g.desc}</p>
        </div>
      ))}
    </div>
    <div className="text-center mt-8">
      <Link to="/catalog"><Button variant="hero" size="lg">Shop with Confidence</Button></Link>
    </div>
  </div>
);
