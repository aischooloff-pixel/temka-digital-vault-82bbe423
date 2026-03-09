import { Link } from 'react-router-dom';
import { XCircle, ArrowRight, Headphones, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OrderFailed = () => {
  return (
    <div className="container-main mx-auto px-4 py-20 text-center max-w-xl">
      <div className="animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-destructive/20 text-destructive flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8" />
        </div>
        <h1 className="font-display text-3xl font-bold">Payment Failed</h1>
        <p className="text-muted-foreground mt-3">Your payment could not be processed. Please try again or use a different payment method.</p>

        <div className="bg-card border border-border/50 rounded-xl p-6 mt-8 text-left space-y-2 text-sm text-muted-foreground">
          <p>Common reasons for payment failure:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Insufficient funds</li>
            <li>Card declined by issuing bank</li>
            <li>Incorrect payment details</li>
            <li>Transaction flagged for security review</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link to="/checkout"><Button variant="hero"><RefreshCcw className="w-4 h-4 mr-1" /> Try Again</Button></Link>
          <Link to="/support"><Button variant="outline"><Headphones className="w-4 h-4 mr-1" /> Contact Support</Button></Link>
        </div>
      </div>
    </div>
  );
};

export default OrderFailed;
