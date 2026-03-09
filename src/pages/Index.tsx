import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Shield, Clock, Star, ChevronRight, MessageCircle, ArrowRight, CheckCircle2, Users, Package, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import { products, categories, reviews } from '@/data/products';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const Index = () => {
  const featuredProducts = products.filter(p => p.tags.includes('best-seller') || p.tags.includes('hot')).slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden section-padding pt-16 sm:pt-20 md:pt-32 pb-16 sm:pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(160,84%,50%,0.08),transparent_60%)]" />
        <div className="container-main mx-auto relative">
          <motion.div initial="hidden" animate="visible" className="max-w-3xl mx-auto text-center">
            <motion.div variants={fadeIn} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs sm:text-sm mb-4 sm:mb-6">
              <Zap className="w-4 h-4" /> Мгновенная цифровая доставка
            </motion.div>
            <motion.h1 variants={fadeIn} custom={1} className="font-display text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
              Премиум цифровой<br />
              <span className="gradient-text">маркетплейс</span>
            </motion.h1>
            <motion.p variants={fadeIn} custom={2} className="text-muted-foreground text-base sm:text-lg md:text-xl mt-4 sm:mt-6 max-w-xl mx-auto px-4">
              Проверенные аккаунты, ключи ПО и премиум-подписки. Мгновенная доставка с защитой покупателя на каждый заказ.
            </motion.p>
            <motion.div variants={fadeIn} custom={3} className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 sm:mt-8 px-4">
              <Link to="/catalog" className="w-full sm:w-auto">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
                  Перейти в каталог <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link to="/about" className="w-full sm:w-auto">
                <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                  Как это работает
                </Button>
              </Link>
            </motion.div>
            <motion.div variants={fadeIn} custom={4} className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-8 sm:mt-10 text-xs sm:text-sm text-muted-foreground px-4">
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> Защита покупателя</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> Мгновенная доставка</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-primary" /> Проверенные товары</span>
              <span className="flex items-center gap-1.5"><Headphones className="w-4 h-4 text-primary" /> Поддержка 24/7</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/30 bg-card/30">
        <div className="container-main mx-auto px-4 py-6 sm:py-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[
            { value: '50K+', label: 'Довольных клиентов', icon: Users },
            { value: '12K+', label: 'Товаров продано', icon: Package },
            { value: '99.8%', label: 'Положительных отзывов', icon: Star },
            { value: '<2мин', label: 'Среднее время доставки', icon: Clock },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="text-center">
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="font-display text-xl sm:text-2xl md:text-3xl font-bold">{stat.value}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="section-padding">
        <div className="container-main mx-auto">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold">Категории</h2>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">Найдите именно то, что вам нужно</p>
            </div>
            <Link to="/catalog" className="text-xs sm:text-sm text-primary hover:underline flex items-center gap-1">
              Все <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {categories.map((cat, i) => (
              <motion.div key={cat.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <Link to={`/catalog?category=${cat.id}`}
                  className="block p-3 sm:p-4 bg-card border border-border/50 rounded-xl hover:border-primary/30 hover-lift transition-all group">
                  <div className="text-2xl sm:text-3xl mb-2">{cat.icon}</div>
                  <h3 className="font-display font-semibold text-xs sm:text-sm group-hover:text-primary transition-colors">{cat.name}</h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{cat.count} товаров</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section-padding bg-card/20">
        <div className="container-main mx-auto">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold">Популярные товары</h2>
              <p className="text-muted-foreground text-xs sm:text-sm mt-1">Самые востребованные цифровые товары</p>
            </div>
            <Link to="/catalog" className="text-xs sm:text-sm text-primary hover:underline flex items-center gap-1">
              Все <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {featuredProducts.map(product => (
              <div key={product.id} className="min-w-[260px] sm:min-w-[280px] lg:min-w-[300px] snap-start shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding">
        <div className="container-main mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold">Почему выбирают TEMKA.STORE</h2>
            <p className="text-muted-foreground text-xs sm:text-sm mt-2 max-w-lg mx-auto">Мы поставляем премиум цифровые товары с непревзойдённой надёжностью</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Zap, title: 'Мгновенная доставка', desc: 'Получите ваши цифровые товары в течение нескольких минут после подтверждения оплаты. Большинство заказов доставляется автоматически.' },
              { icon: Shield, title: 'Защита покупателя', desc: 'Каждая покупка защищена нашей гарантией. Если что-то пошло не так, мы заменим или вернём деньги — без лишних вопросов.' },
              { icon: CheckCircle2, title: 'Проверенные товары', desc: 'Все товары тестируются и проверяются перед размещением. Мы гарантируем качество и подлинность каждого товара.' },
              { icon: Headphones, title: 'Поддержка 24/7', desc: 'Наша команда поддержки доступна круглосуточно через Telegram, Discord и email для помощи с любыми вопросами.' },
              { icon: Star, title: '50K+ доверяют нам', desc: 'Присоединяйтесь к тысячам довольных клиентов, которые доверяют нам свои потребности в цифровых товарах. 99.8% положительных отзывов.' },
              { icon: Clock, title: 'Быстрое решение проблем', desc: 'Любые проблемы решаются в течение нескольких часов, а не дней. Мы ценим ваше время и удовлетворение превыше всего.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-5 sm:p-6 bg-card border border-border/50 rounded-xl hover:border-primary/20 transition-all">
                <item.icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary mb-3" />
                <h3 className="font-display font-semibold text-sm sm:text-base mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="section-padding bg-card/20">
        <div className="container-main mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold">Отзывы клиентов</h2>
            <p className="text-muted-foreground text-xs sm:text-sm mt-2">Что говорят наши клиенты о нас</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {reviews.slice(0, 4).map((review, i) => (
              <motion.div key={review.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-4 sm:p-5 bg-card border border-border/50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">{review.avatar}</div>
                  <div>
                    <div className="text-sm font-medium">{review.author}</div>
                    {review.verified && <div className="text-[10px] text-primary flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Проверен</div>}
                  </div>
                </div>
                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="w-3 h-3 fill-gold text-gold" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{review.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="section-padding">
        <div className="container-main mx-auto max-w-3xl">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold">Частые вопросы</h2>
          </div>
          <div className="space-y-3">
            {[
              { q: 'Как быстро доставка?', a: 'Большинство товаров доставляется мгновенно после оплаты. Товары с ручной доставкой обрабатываются в течение 1-24 часов.' },
              { q: 'Безопасно ли использовать товары?', a: 'Все товары проверены и протестированы. Мы предоставляем подробные инструкции по использованию и поддержку после покупки.' },
              { q: 'Что делать, если что-то пошло не так?', a: 'Мы предоставляем гарантию замены или возврата на все товары. Наша поддержка доступна 24/7.' },
            ].map((faq, i) => (
              <div key={i} className="p-4 bg-card border border-border/50 rounded-xl">
                <h4 className="font-display font-semibold text-sm">{faq.q}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">{faq.a}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link to="/faq"><Button variant="outline">Все вопросы <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding">
        <div className="container-main mx-auto">
          <div className="relative p-6 sm:p-8 md:p-12 rounded-2xl border border-primary/20 bg-primary/5 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(160,84%,50%,0.1),transparent_70%)]" />
            <div className="relative">
              <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 text-primary mx-auto mb-4" />
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold">Нужна помощь?</h2>
              <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">Наша команда поддержки доступна 24/7. Свяжитесь через Telegram, Discord или email.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
                <a href="https://t.me/paveldurov" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto"><Button variant="hero" size="lg" className="w-full sm:w-auto">Связаться с поддержкой</Button></a>
                <Link to="/faq" className="w-full sm:w-auto"><Button variant="outline" size="lg" className="w-full sm:w-auto">Читать FAQ</Button></Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
