import { Shield, Zap, Users, CheckCircle2, Star, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const About = () => (
  <div className="container-main mx-auto px-4 py-8">
    <div className="text-center mb-12">
      <h1 className="font-display text-3xl md:text-4xl font-bold">About TEMKA.STORE</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
        We are a premium digital marketplace dedicated to providing verified, high-quality digital products with instant delivery and buyer protection.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
      {[
        { icon: Shield, title: 'Trusted Platform', desc: 'Over 50,000 satisfied customers trust us for their digital product needs. Every transaction is protected.' },
        { icon: Zap, title: 'Instant Delivery', desc: 'Most products are delivered instantly after payment. No waiting, no hassle — just immediate access.' },
        { icon: Star, title: 'Quality Guaranteed', desc: 'Every product is verified and tested before listing. We maintain the highest standards in the industry.' },
      ].map((item, i) => (
        <div key={i} className="bg-card border border-border/50 rounded-xl p-6 text-center">
          <item.icon className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="font-display font-semibold mb-2">{item.title}</h3>
          <p className="text-sm text-muted-foreground">{item.desc}</p>
        </div>
      ))}
    </div>

    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="font-display text-2xl font-bold">Our Mission</h2>
      <p className="text-muted-foreground leading-relaxed">
        TEMKA.STORE was founded with a simple mission: make premium digital products accessible to everyone. We believe that high-quality software, subscriptions, and digital services should be available at fair prices with reliable delivery.
      </p>
      <p className="text-muted-foreground leading-relaxed">
        Our team works around the clock to source, verify, and deliver digital products from trusted suppliers worldwide. We invest heavily in quality control, buyer protection, and customer support to ensure every purchase meets our high standards.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
        {[
          { value: '50K+', label: 'Customers' },
          { value: '12K+', label: 'Products Sold' },
          { value: '99.8%', label: 'Satisfaction' },
          { value: '24/7', label: 'Support' },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <div className="font-display text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="text-center pt-8">
        <Link to="/catalog"><Button variant="hero" size="lg">Browse Our Catalog</Button></Link>
      </div>
    </div>
  </div>
);

export default About;
