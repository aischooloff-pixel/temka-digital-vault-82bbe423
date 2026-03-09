import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Package, Headphones, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OrderSuccess = () => {
  const orderId = `TK-${Date.now().toString(36).toUpperCase()}`;

  return (
    <div className="container-main mx-auto px-4 py-20 text-center max-w-xl">
      <div className="animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="font-display text-3xl font-bold">Order Successful!</h1>
        <p className="text-muted-foreground mt-3">Thank you for your purchase. Your order is being processed.</p>

        <div className="bg-card border border-border/50 rounded-xl p-6 mt-8 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-mono font-medium">{orderId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="text-primary font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Processing</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Expected Delivery</span>
            <span className="font-medium">Within minutes</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          You will receive your product details via email shortly. Check your inbox (and spam folder).
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link to="/account"><Button variant="outline"><Package className="w-4 h-4 mr-1" /> Order History</Button></Link>
          <Link to="/support"><Button variant="outline"><Headphones className="w-4 h-4 mr-1" /> Contact Support</Button></Link>
          <Link to="/catalog"><Button variant="hero"><ShoppingCart className="w-4 h-4 mr-1" /> Continue Shopping</Button></Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
