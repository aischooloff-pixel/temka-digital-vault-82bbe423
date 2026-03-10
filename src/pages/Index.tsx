import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, ChevronRight, ArrowRight, CheckCircle2, Package, Clock, Star, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/ProductCardSkeleton';
import { useProducts, useCategories, useProductStats, useReviews } from '@/hooks/useProducts';
import { useTelegram } from '@/contexts/TelegramContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const Index = () => {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: stats } = useProductStats();
  const { data: reviews, isLoading: reviewsLoading } = useReviews();
  const { user } = useTelegram();

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const featuredProducts = products?.filter(p => p.is_featured || p.is_popular).slice(0, 6) || [];
  const newProducts = products?.filter(p => p.is_new).slice(0, 6) || [];

  const handleSubmitReview = async () => {
    if (!reviewText.trim() || !user?.id) return;
    setReviewSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('submit-review', {
        body: {
          telegramId: user.id,
          rating: reviewRating,
          text: reviewText.trim(),
          author: `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`,
        },
      });
      if (error) throw error;
      setReviewSuccess(true);
      setReviewText('');
      setShowReviewForm(false);
      setTimeout(() => setReviewSuccess(false), 5000);
    } catch (e) {
      console.error('Review submit error:', e);
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-10 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(160,84%,50%,0.08),transparent_60%)]" />
        <div className="container-main mx-auto relative">
          <motion.div initial="hidden" animate="visible" className="max-w-lg mx-auto text-center">
            <motion.div variants={fadeIn} custom={0} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm mb-4">
              <Zap className="w-4 h-4" /> Мгновенная доставка
            </motion.div>
            <motion.h1 variants={fadeIn} custom={1} className="font-display text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
              Премиум цифровой<br />
              <span className="gradient-text">маркетплейс</span>
            </motion.h1>
            <motion.p variants={fadeIn} custom={2} className="text-muted-foreground text-base mt-4 max-w-sm mx-auto">
              Аккаунты, ключи ПО и подписки. Оплата через CryptoBot.
            </motion.p>
            <motion.div variants={fadeIn} custom={3} className="mt-6">
              <Link to="/catalog">
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

      {/* Stats — real data */}
      <section className="border-y border-border/30 bg-card/30">
        <div className="container-main mx-auto px-4 py-6 grid grid-cols-3 gap-2">
          {stats ? (
            <>
              <div className="text-center">
                <Package className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <div className="font-display text-lg sm:text-xl font-bold">{stats.totalProducts}</div>
                <div className="text-xs text-muted-foreground">Товаров</div>
              </div>
              <div className="text-center">
                <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <div className="font-display text-lg sm:text-xl font-bold">{stats.inStock}</div>
                <div className="text-xs text-muted-foreground">В наличии</div>
              </div>
              <div className="text-center">
                <Clock className="w-5 h-5 text-primary mx-auto mb-1.5" />
                <div className="font-display text-lg sm:text-xl font-bold">&lt;2м</div>
                <div className="text-xs text-muted-foreground">Доставка</div>
              </div>
            </>
          ) : (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center space-y-1">
                <Skeleton className="w-5 h-5 mx-auto rounded-full" />
                <Skeleton className="h-6 w-12 mx-auto" />
                <Skeleton className="h-4 w-14 mx-auto" />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 py-8">
        <div className="container-main mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-bold">Категории</h2>
            <Link to="/catalog" className="text-sm text-primary flex items-center gap-0.5">
              Все <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {categoriesLoading ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : categories && categories.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => (
                <Link key={cat.id} to={`/catalog?category=${cat.id}`}
                  className="p-3 bg-card border border-border/50 rounded-xl text-center hover:border-primary/30 transition-all">
                  <div className="text-2xl mb-1.5">{cat.icon}</div>
                  <h3 className="font-display font-medium text-xs leading-tight">{cat.name}</h3>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Категории не найдены</p>
          )}
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="px-4 pb-8">
          <div className="container-main mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-bold">Популярные</h2>
              <Link to="/catalog" className="text-sm text-primary flex items-center gap-0.5">
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
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
                {featuredProducts.map(product => (
                  <div key={product.id} className="min-w-[260px] sm:min-w-[300px] snap-start shrink-0">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* New Products */}
      {newProducts.length > 0 && (
        <section className="px-4 pb-8">
          <div className="container-main mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-bold">Новинки</h2>
              <Link to="/catalog" className="text-sm text-primary flex items-center gap-0.5">
                Все <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {newProducts.map(product => (
                <div key={product.id} className="min-w-[260px] sm:min-w-[300px] snap-start shrink-0">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="px-4 py-8">
        <div className="container-main mx-auto max-w-lg">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-bold">Отзывы</h2>
            {user && (
              <Button variant="outline" size="sm" onClick={() => setShowReviewForm(!showReviewForm)}>
                ✍️ Оставить отзыв
              </Button>
            )}
          </div>

          {reviewSuccess && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-xl text-sm text-primary">
              ✅ Спасибо! Ваш отзыв отправлен на модерацию.
            </div>
          )}

          {showReviewForm && (
            <div className="mb-4 bg-card border border-border/50 rounded-xl p-4 space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Оценка</div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setReviewRating(n)} className="p-0.5">
                      <Star className={`w-6 h-6 ${n <= reviewRating ? 'text-gold fill-gold' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                placeholder="Напишите ваш отзыв..."
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                className="w-full h-20 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
              <Button size="sm" onClick={handleSubmitReview} disabled={reviewSubmitting || !reviewText.trim()}>
                <Send className="w-3 h-3 mr-1" /> {reviewSubmitting ? 'Отправка...' : 'Отправить'}
              </Button>
            </div>
          )}

          {reviewsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : reviews && reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.slice(0, 5).map(review => (
                <div key={review.id} className="bg-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                      {review.author?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{review.author}</div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-gold fill-gold' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  {review.text && <p className="text-sm text-muted-foreground">{review.text}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">Отзывов пока нет</p>
              {user && !showReviewForm && (
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowReviewForm(true)}>
                  Будьте первым!
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Preview */}
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
            <Link to="/faq"><Button variant="outline" size="sm">Все вопросы <ChevronRight className="w-3.5 h-3.5 ml-0.5" /></Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
