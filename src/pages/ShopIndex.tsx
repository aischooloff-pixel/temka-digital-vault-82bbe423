import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Shield, ChevronRight, ArrowRight, CheckCircle2, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useShop } from '@/contexts/ShopContext';
import ShopProductCard from '@/components/ShopProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } })
};

const ShopIndex = () => {
  const { shopId } = useParams();
  const { shop, products, productsLoading } = useShop();
  const base = `/shop/${shopId}`;

  if (!shop) return null;

  const inStock = products.filter(p => p.stock > 0).length;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-10 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="container-main mx-auto relative">
          <motion.div initial="hidden" animate="visible" className="max-w-lg mx-auto text-center">
            <motion.div variants={fadeIn} custom={0} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm mb-4">
              <Zap className="w-4 h-4" /> Мгновенная доставка
            </motion.div>
            <motion.h1 variants={fadeIn} custom={1} className="font-display text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
              <span className="gradient-text">{shop.hero_title || shop.name}</span>
            </motion.h1>
            <motion.p variants={fadeIn} custom={2} className="text-muted-foreground text-base mt-4 max-w-sm mx-auto">
              {shop.hero_description}
            </motion.p>
            <motion.div variants={fadeIn} custom={3} className="mt-6">
              <Link to={`${base}/catalog`}>
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

      {/* Stats — always visible */}
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

      {/* Products */}
      <section className="px-4 py-8">
        <div className="container-main mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-bold">Товары</h2>
            <Link to={`${base}/catalog`} className="text-sm text-primary flex items-center gap-0.5">
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
                  <ShopProductCard product={product} shopId={shopId!} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Товары скоро появятся</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ShopIndex;
