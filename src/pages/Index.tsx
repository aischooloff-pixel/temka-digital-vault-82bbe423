import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Shield, Star, ChevronRight, ArrowRight, CheckCircle2, Users, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import { products, categories, reviews } from '@/data/products';

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const Index = () => {
  const featuredProducts = products.filter(p => p.tags.includes('best-seller') || p.tags.includes('hot')).slice(0, 6);

  return (
    <div>
      {/* Hero — compact for Telegram */}
      <section className="relative overflow-hidden px-4 pt-8 pb-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(160,84%,50%,0.08),transparent_60%)]" />
        <div className="container-main mx-auto relative">
          <motion.div initial="hidden" animate="visible" className="max-w-lg mx-auto text-center">
            <motion.div variants={fadeIn} custom={0} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs mb-3">
              <Zap className="w-3.5 h-3.5" /> Мгновенная доставка
            </motion.div>
            <motion.h1 variants={fadeIn} custom={1} className="font-display text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
              Премиум цифровой<br />
              <span className="gradient-text">маркетплейс</span>
            </motion.h1>
            <motion.p variants={fadeIn} custom={2} className="text-muted-foreground text-sm mt-3 max-w-sm mx-auto">
              Аккаунты, ключи ПО и подписки. Оплата через CryptoBot.
            </motion.p>
            <motion.div variants={fadeIn} custom={3} className="mt-4">
              <Link to="/catalog">
                <Button variant="hero" size="lg" className="w-full sm:w-auto">
                  Перейти в каталог <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </motion.div>
            <motion.div variants={fadeIn} custom={4} className="flex flex-wrap items-center justify-center gap-3 mt-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-primary" /> Защита</span>
              <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-primary" /> Мгновенно</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Проверено</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/30 bg-card/30">
        <div className="container-main mx-auto px-4 py-4 grid grid-cols-4 gap-2">
          {[
            { value: '50K+', label: 'Клиентов', icon: Users },
            { value: '12K+', label: 'Продано', icon: Package },
            { value: '99.8%', label: 'Отзывов', icon: Star },
            { value: '<2м', label: 'Доставка', icon: Clock },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <stat.icon className="w-4 h-4 text-primary mx-auto mb-1" />
              <div className="font-display text-base sm:text-lg font-bold">{stat.value}</div>
              <div className="text-[9px] text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 py-6">
        <div className="container-main mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold">Категории</h2>
            <Link to="/catalog" className="text-xs text-primary flex items-center gap-0.5">
              Все <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {categories.slice(0, 8).map((cat) => (
              <Link key={cat.id} to={`/catalog?category=${cat.id}`}
                className="p-2.5 bg-card border border-border/50 rounded-xl text-center hover:border-primary/30 transition-all">
                <div className="text-xl mb-1">{cat.icon}</div>
                <h3 className="font-display font-medium text-[10px] leading-tight">{cat.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="px-4 pb-6">
        <div className="container-main mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold">Популярные</h2>
            <Link to="/catalog" className="text-xs text-primary flex items-center gap-0.5">
              Все <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {featuredProducts.map(product => (
              <div key={product.id} className="min-w-[220px] sm:min-w-[260px] snap-start shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="px-4 pb-6 bg-card/20">
        <div className="container-main mx-auto pt-6">
          <h2 className="font-display text-lg font-bold mb-4">Отзывы</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x scrollbar-hide">
            {reviews.slice(0, 4).map((review) => (
              <div key={review.id} className="min-w-[240px] p-3 bg-card border border-border/50 rounded-xl snap-start shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">{review.avatar}</div>
                  <div>
                    <div className="text-xs font-medium">{review.author}</div>
                    {review.verified && <div className="text-[9px] text-primary flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Проверен</div>}
                  </div>
                </div>
                <div className="flex gap-0.5 mb-1.5">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="w-3 h-3 fill-gold text-gold" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{review.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="px-4 py-6">
        <div className="container-main mx-auto max-w-lg">
          <h2 className="font-display text-lg font-bold mb-3">Частые вопросы</h2>
          <div className="space-y-2">
            {[
              { q: 'Как быстро доставка?', a: 'Большинство товаров доставляется мгновенно после оплаты.' },
              { q: 'Как проходит оплата?', a: 'Оплата через CryptoBot прямо в Telegram.' },
              { q: 'Что делать, если проблема?', a: 'Напишите в поддержку — мы заменим или вернём деньги.' },
            ].map((faq, i) => (
              <div key={i} className="p-3 bg-card border border-border/50 rounded-xl">
                <h4 className="font-display font-semibold text-xs">{faq.q}</h4>
                <p className="text-xs text-muted-foreground mt-1">{faq.a}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <Link to="/faq"><Button variant="outline" size="sm">Все вопросы <ChevronRight className="w-3.5 h-3.5 ml-0.5" /></Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
