import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Shield, Clock, Star, ChevronRight, MessageCircle, ArrowRight, CheckCircle2, Users, Package, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import { products, categories, reviews } from '@/data/products';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } })
};

const Index = () => {
  const featuredProducts = products.filter((p) => p.tags.includes('best-seller') || p.tags.includes('hot')).slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden section-padding pt-20 md:pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(160,84%,50%,0.08),transparent_60%)]" />
        <div className="container-main mx-auto relative">
          <motion.div initial="hidden" animate="visible" className="max-w-3xl mx-auto text-center">
            <motion.div variants={fadeIn} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm mb-6">
              <Zap className="w-4 h-4" /> Instant Digital Delivery
            </motion.div>
            <motion.h1 variants={fadeIn} custom={1} className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
              Premium Digital<br />
              <span className="gradient-text">Marketplace</span>
            </motion.h1>
            <motion.p variants={fadeIn} custom={2} className="text-muted-foreground text-lg md:text-xl mt-6 max-w-xl mx-auto">
              Verified accounts, software keys, and premium subscriptions. Instant delivery with buyer protection on every order.
            </motion.p>
            <motion.div variants={fadeIn} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Link to="/catalog">
                <Button variant="hero" size="xl">
                  Browse Catalog <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="hero-outline" size="xl">
                  How It Works
                </Button>
              </Link>
            </motion.div>
            <motion.div variants={fadeIn} custom={4} className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> Buyer Protection</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Instant Delivery</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Verified Products</span>
              <span className="flex items-center gap-1.5"><Headphones className="w-4 h-4 text-primary" /> 24/7 Support</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/30 bg-card/30">
        <div className="container-main mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
          { value: '50K+', label: 'Happy Customers', icon: Users },
          { value: '12K+', label: 'Products Sold', icon: Package },
          { value: '99.8%', label: 'Positive Reviews', icon: Star },
          { value: '<2min', label: 'Avg. Delivery', icon: Clock }].
          map((stat, i) =>
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
          className="text-center">
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="font-display text-2xl md:text-3xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="section-padding">
        <div className="container-main mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold">Browse Categories</h2>
              <p className="text-muted-foreground text-sm mt-1">Find exactly what you need</p>
            </div>
            <Link to="/catalog" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((cat, i) =>
            <motion.div key={cat.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <Link to={`/catalog?category=${cat.id}`}
              className="block p-4 bg-card border border-border/50 rounded-xl hover:border-primary/30 hover-lift transition-all group">
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <h3 className="font-display font-semibold text-sm group-hover:text-primary transition-colors">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{cat.count} products</p>
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section-padding bg-card/20">
        <div className="container-main mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold">Top Products</h2>
              <p className="text-muted-foreground text-sm mt-1">Most popular digital goods</p>
            </div>
            <Link to="/catalog" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredProducts.map((product) =>
            <ProductCard key={product.id} product={product} />
            )}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding">
        <div className="container-main mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold">Why Choose TEMKA.STORE</h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-lg mx-auto">We deliver premium digital products with unmatched reliability</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
            { icon: Zap, title: 'Instant Delivery', desc: 'Get your digital products within minutes after payment confirmation. Most orders are delivered automatically.' },
            { icon: Shield, title: 'Buyer Protection', desc: 'Every purchase is protected with our guarantee. If something goes wrong, we replace or refund — no questions asked.' },
            { icon: CheckCircle2, title: 'Verified Products', desc: 'All products are tested and verified before listing. We ensure quality and authenticity on every item.' },
            { icon: Headphones, title: '24/7 Support', desc: 'Our support team is available around the clock via Telegram, Discord, and email to help with any issues.' },
            { icon: Star, title: 'Trusted by 50K+', desc: 'Join thousands of satisfied customers who trust us for their digital product needs. 99.8% positive feedback.' },
            { icon: Clock, title: 'Fast Resolution', desc: 'Any issues are resolved within hours, not days. We value your time and satisfaction above everything.' }].
            map((item, i) =>
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="p-6 bg-card border border-border/50 rounded-xl hover:border-primary/20 transition-all">
                <item.icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-display font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="section-padding bg-card/20">
        <div className="container-main mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-bold">Customer Reviews</h2>
            <p className="text-muted-foreground text-sm mt-2">What our customers say about us</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reviews.slice(0, 4).map((review, i) =>
            <motion.div key={review.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="p-5 bg-card border border-border/50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">{review.avatar}</div>
                  <div>
                    <div className="text-sm font-medium">{review.author}</div>
                    {review.verified && <div className="text-[10px] text-primary flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Verified</div>}
                  </div>
                </div>
                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: review.rating }).map((_, j) =>
                <Star key={j} className="w-3 h-3 fill-gold text-gold" />
                )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{review.text}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="section-padding">
        <div className="container-main mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-bold">Common Questions</h2>
          </div>
          <div className="space-y-3">
            {[
            { q: 'How fast is delivery?', a: 'Most products are delivered instantly after payment. Manual delivery items are processed within 1-24 hours.' },
            { q: 'Are the products safe to use?', a: 'All products are verified and tested. We provide detailed usage guides and post-purchase support.' },
            { q: 'What if something goes wrong?', a: 'We offer replacement or refund guarantees on all products. Our support team is available 24/7.' }].
            map((faq, i) =>
            <div key={i} className="p-4 bg-card border border-border/50 rounded-xl">
                <h4 className="font-display font-semibold text-sm">{faq.q}</h4>
                <p className="text-sm text-muted-foreground mt-2">{faq.a}</p>
              </div>
            )}
          </div>
          <div className="text-center mt-6">
            <Link to="/faq"><Button variant="outline">View All FAQ <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding">
        <div className="container-main mx-auto">
          <div className="relative p-8 md:p-12 rounded-2xl border border-primary/20 bg-primary/5 text-center overflow-hidden px-[3px]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(160,84%,50%,0.1),transparent_70%)]" />
            <div className="relative">
              <MessageCircle className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="font-display text-2xl md:text-3xl font-bold">Need Help?</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">Our support team is available 24/7. Reach out via Telegram, Discord, or email.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                <Link to="/support"><Button variant="hero" size="lg">Contact Support</Button></Link>
                <Link to="/faq"><Button variant="outline" size="lg">Browse FAQ</Button></Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>);

};

export default Index;