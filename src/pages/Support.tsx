import { useState } from 'react';
import { Headphones, Send, MessageCircle, Mail, Clock, AlertTriangle, CreditCard, Package, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const issueTypes = [
  { id: 'order', label: 'Order Issue', icon: Package, desc: 'Problems with your order or delivery' },
  { id: 'payment', label: 'Payment Problem', icon: CreditCard, desc: 'Payment failed or charged incorrectly' },
  { id: 'product', label: 'Product Issue', icon: AlertTriangle, desc: 'Product not working as expected' },
  { id: 'refund', label: 'Refund Request', icon: HelpCircle, desc: 'Request a refund or replacement' },
];

const Support = () => {
  const [selectedIssue, setSelectedIssue] = useState('');
  const [email, setEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="container-main mx-auto px-4 py-20 text-center max-w-xl">
        <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-6">
          <Headphones className="w-8 h-8" />
        </div>
        <h2 className="font-display text-2xl font-bold">Ticket Submitted!</h2>
        <p className="text-muted-foreground mt-3">We've received your request and will respond within 1-2 hours. Check your email for updates.</p>
        <div className="flex gap-3 justify-center mt-6">
          <Link to="/"><Button variant="outline">Back to Home</Button></Link>
          <Link to="/faq"><Button variant="outline">Browse FAQ</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-main mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold">Support Center</h1>
        <p className="text-muted-foreground mt-2">We're here to help. Get in touch and we'll respond ASAP.</p>
      </div>

      {/* Contact channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
        {[
          { icon: MessageCircle, label: 'Telegram', value: '@temka_support', desc: 'Fastest response' },
          { icon: MessageCircle, label: 'Discord', value: 'TEMKA.STORE', desc: 'Community & support' },
          { icon: Mail, label: 'Email', value: 'support@temka.store', desc: 'For detailed issues' },
        ].map((ch, i) => (
          <div key={i} className="bg-card border border-border/50 rounded-xl p-5 text-center">
            <ch.icon className="w-6 h-6 text-primary mx-auto mb-2" />
            <h4 className="font-display font-semibold text-sm">{ch.label}</h4>
            <p className="text-primary text-sm mt-1">{ch.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{ch.desc}</p>
          </div>
        ))}
      </div>

      {/* Issue types */}
      <div className="max-w-3xl mx-auto mb-8">
        <h3 className="font-display font-semibold text-lg mb-4">What can we help you with?</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {issueTypes.map(type => (
            <button key={type.id} onClick={() => setSelectedIssue(type.id)}
              className={`p-4 rounded-xl border text-left transition-all ${selectedIssue === type.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'}`}>
              <type.icon className={`w-5 h-5 mb-2 ${selectedIssue === type.id ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="text-sm font-medium">{type.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{type.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com"
            className="w-full h-10 px-4 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">Order ID (optional)</label>
          <input type="text" value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="TK-XXXXXX"
            className="w-full h-10 px-4 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">Describe your issue</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={5} placeholder="Tell us what happened..."
            className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
        </div>
        <Button type="submit" variant="hero" size="lg" className="w-full">
          <Send className="w-4 h-4 mr-1" /> Submit Ticket
        </Button>
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Clock className="w-3 h-3" /> Average response time: 1-2 hours
        </p>
      </form>
    </div>
  );
};

export default Support;
