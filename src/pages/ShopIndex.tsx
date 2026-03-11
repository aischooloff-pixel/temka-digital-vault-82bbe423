import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Shield, ChevronRight, ArrowRight, CheckCircle2, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useShop } from '@/contexts/ShopContext';
import { useStorefrontPath } from '@/contexts/StorefrontContext';
import ShopProductCard from '@/components/ShopProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } })
};

const ShopIndex = () => {
  const { shop, products, productsLoading } = useShop();
  const buildPath = useStorefrontPath();

  if (!shop) return null;

  const inStock = products.filter(p => p.stock > 0).length;

  return (
    <div>
      {/* Hero — identical structure to platform Index */}
      <section className="relative overflow-hidden px-4 pt-10 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="container-main mx-auto relative">
          <motion.div initial="hidden" animate="visible" className="max-w-lg mx-auto text-center">
            <motion.div variants={fadeIn} custom={0} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm mb-4">
              <Zap className="w-4 h-4" /> Мгновенная доставка
            </motion.div>
            <motion.h1 variants={fadeIn} custom={1} className="font-display text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
              {shop.hero_title || shop.name}
            </motion.h1>
            <motion.p variants={fadeIn} custom={2} className="text-muted-foreground text-base mt-4 max-w-sm mx-auto">
              {shop.hero_description}
            </motion.p>
            <motion.div variants={fadeIn} custom={3} className="mt-6">
              <Link to={buildPath('/catalog')}>
                <Button variant="hero" size="xl" className="w-full sm:w-auto text-base px-8 py-3">
                  Перейти в каталог <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
            </motion.div>
            <motion.div variants={fadeIn} custom={4} className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> Защита</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Мгновенно</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Проверено</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats — identical structure to platform Index */}
      <section className="border-y border-border/30 bg-card/30">
        <div className="container-main mx-auto px-4 py-6 grid grid-cols-3 gap-2">
          {productsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center space-y-1">
                <Skeleton className="w-5 h-5 mx-auto rounded-full" />
                <Skeleton className="h-6 w-12 mx-auto" />
                <Skeleton className="h-4 w-14 mx-auto" />
              </div>
            ))
          ) : (
            <>
              <div className="text-center">
                <Package className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <div className="font-display text-lg sm:text-xl font-bold">{products.length}</div>
                <div className="text-xs text-muted-foreground">Товаров</div>
              </div>
              <div className="text-center">
                <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <div className="font-display text-lg sm:text-xl font-bold">{inStock}</div>
                <div className="text-xs text-muted-foreground">В наличии</div>
              </div>
              <div className="text-center">
                <Clock className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <div className="font-display text-lg sm:text-xl font-bold">&lt;2с</div>
                <div className="text-xs text-muted-foreground">Доставка</div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Products — identical carousel structure to platform Index */}
      <section className="px-4 py-8">
        <div className="container-main mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-bold">Товары</h2>
            <Link to={buildPath('/catalog')} className="text-sm text-primary flex items-center gap-0.5">
              Все <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {productsLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="min-w-[260px] sm:min-w-[300px] snap-start shrink-0">
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {products.slice(0, 8).map((product) => (
                <div key={product.id} className="min-w-[260px] sm:min-w-[300px] snap-start shrink-0">
                  <ShopProductCard product={product} shopId={shop.id} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">Товары скоро появятся</p>
              <p className="text-xs text-muted-foreground mt-1">Магазин готовится к запуску</p>
            </div>
          )}
        </div>
      </section>

      {/* FAQ — identical structure to platform Index */}
      <section className="px-4 py-8">
        <div className="container-main mx-auto max-w-lg">
          <h2 className="font-display text-xl font-bold mb-4">Частые вопросы</h2>
          <div className="space-y-2">
            {[
              { q: 'Как быстро доставка?', a: 'Большинство товаров доставляется мгновенно после оплаты.' },
              { q: 'Как проходит оплата?', a: 'Оплата через CryptoBot прямо в Telegram.' },
              { q: 'Что делать, если проблема?', a: 'Напишите в поддержку — мы заменим или вернём деньги.' },
            ].map((faq, i) => (
              <div key={i} className="p-4 bg-card border border-border/50 rounded-xl">
                <h4 className="font-display font-semibold text-sm">{faq.q}</h4>
                <p className="text-sm text-muted-foreground mt-1">{faq.a}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-5">
            <Link to={buildPath('/faq')}>
              <Button variant="outline" size="sm">Все вопросы <ChevronRight className="w-3.5 h-3.5 ml-0.5" /></Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ShopIndex;
