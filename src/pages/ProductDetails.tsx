import { useParams, Link } from 'react-router-dom';
import { Zap, Clock, Shield, ShoppingCart, CheckCircle2, ChevronRight, ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import { getProductById, getReviewsByProductId, products, reviews } from '@/data/products';
import { useStore } from '@/contexts/StoreContext';
import { useState } from 'react';

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const product = getProductById(id || '');
  const productReviews = getReviewsByProductId(id || '');
  const { addToCart } = useStore();
  const [activeTab, setActiveTab] = useState('description');

  if (!product) {
    return (
      <div className="container-main mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="font-display text-2xl font-bold">Товар не найден</h2>
        <p className="text-muted-foreground mt-2">Товар, который вы ищете, не существует.</p>
        <Link to="/catalog"><Button variant="outline" className="mt-4"><ArrowLeft className="w-4 h-4 mr-1" /> Назад в каталог</Button></Link>
      </div>
    );
  }

  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const similar = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  const allReviews = productReviews.length > 0 ? productReviews : reviews.slice(0, 3);

  return (
    <div className="container-main mx-auto px-4 py-6 sm:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 overflow-x-auto whitespace-nowrap">
        <Link to="/" className="hover:text-foreground shrink-0">Главная</Link>
        <ChevronRight className="w-3 h-3 shrink-0" />
        <Link to="/catalog" className="hover:text-foreground shrink-0">Каталог</Link>
        <ChevronRight className="w-3 h-3 shrink-0" />
        <Link to={`/catalog?category=${product.category}`} className="hover:text-foreground capitalize shrink-0">{product.category.replace('-', ' ')}</Link>
        <ChevronRight className="w-3 h-3 shrink-0" />
        <span className="text-foreground truncate">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Left: Image */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8 flex items-center justify-center min-h-[250px] sm:min-h-[300px] lg:min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl sm:text-8xl mb-4">{
              product.category === 'social-media' ? '📱' :
              product.category === 'gaming' ? '🎮' :
              product.category === 'streaming' ? '🎬' :
              product.category === 'software' ? '🔑' :
              product.category === 'premium' ? '👑' :
              product.category === 'automation' ? '🤖' :
              product.category === 'ai-tools' ? '🧠' : '⚡'
            }</div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{product.platform}</span>
          </div>
        </div>

        {/* Right: Info */}
        <div>
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {product.tags.map(tag => (
              <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5 text-primary uppercase">
                {tag === 'hot' ? 'ХИТ' : tag === 'new' ? 'НОВИНКА' : tag === 'sale' ? 'СКИДКА' : tag === 'best-seller' ? 'БЕСТСЕЛЛЕР' : tag.replace('-', ' ')}
              </span>
            ))}
            {product.deliveryType === 'instant' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary flex items-center gap-1">
                <Zap className="w-3 h-3" /> МГНОВЕННАЯ ДОСТАВКА
              </span>
            )}
          </div>

          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold">{product.title}</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-2">{product.subtitle}</p>

          {/* Rating */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-gold text-gold' : 'text-muted'}`} />
              ))}
            </div>
            <span className="text-sm font-medium">{product.rating}</span>
            <span className="text-xs sm:text-sm text-muted-foreground">({product.reviewCount} отзывов)</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mt-4">
            <span className="font-display text-2xl sm:text-3xl font-bold">${product.price}</span>
            {product.oldPrice && (
              <>
                <span className="text-base sm:text-lg text-muted-foreground line-through">${product.oldPrice}</span>
                <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">-{discount}%</span>
              </>
            )}
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-primary" /> {product.guarantee}</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Проверенный товар</span>
            {product.stock < 10 && <span className="flex items-center gap-1 text-warning">⚠️ Осталось {product.stock}</span>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <Button variant="hero" size="xl" className="flex-1" onClick={() => addToCart(product)}>
              <ShoppingCart className="w-4 h-4 mr-1" /> В корзину
            </Button>


          </div>

          {/* Quick features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6">
            {product.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" /> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 sm:mt-12 border-b border-border/30 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {[
            { id: 'description', label: 'Описание' },
            { id: 'specifications', label: 'Характеристики' },
            { id: 'reviews', label: `Отзывы (${product.reviewCount})` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 sm:mt-8">
        {activeTab === 'description' && (
          <div className="max-w-3xl space-y-4">
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{product.description}</p>
            <div className="p-4 bg-card border border-border/50 rounded-xl">
              <h4 className="font-display font-semibold text-sm mb-2">Информация о доставке</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {product.deliveryType === 'instant'
                  ? 'Этот товар доставляется мгновенно после подтверждения оплаты. Вы получите данные на email в течение нескольких минут.'
                  : 'Этот товар требует ручной обработки. Доставка обычно занимает от 1 до 24 часов после подтверждения оплаты.'}
              </p>
            </div>
            <div className="p-4 bg-card border border-border/50 rounded-xl">
              <h4 className="font-display font-semibold text-sm mb-2">Гарантия и замена</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">{product.guarantee}. Если товар не соответствует описанию или перестаёт работать в течение гарантийного периода, мы предоставим бесплатную замену или полный возврат.</p>
            </div>
          </div>
        )}

        {activeTab === 'specifications' && (
          <div className="max-w-2xl">
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
              {Object.entries(product.specifications).map(([key, value], i) => (
                <div key={key} className={`flex items-center justify-between px-4 py-3 text-xs sm:text-sm ${i % 2 === 0 ? 'bg-secondary/30' : ''}`}>
                  <span className="text-muted-foreground">{key}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="max-w-3xl space-y-4">
            {allReviews.map(review => (
              <div key={review.id} className="p-4 bg-card border border-border/50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">{review.avatar}</div>
                    <div>
                      <span className="text-sm font-medium">{review.author}</span>
                      {review.verified && <span className="text-[10px] text-primary ml-2">✓ Проверен</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{review.date}</span>
                </div>
                <div className="flex gap-0.5 mb-2">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <Star key={j} className="w-3 h-3 fill-gold text-gold" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">{review.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Similar Products */}
      {similar.length > 0 && (
        <section className="mt-12 sm:mt-16">
          <h2 className="font-display text-lg sm:text-xl font-bold mb-4 sm:mb-6">Похожие товары</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {similar.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Support CTA */}
      <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-card border border-border/50 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <MessageCircle className="w-8 h-8 text-primary shrink-0 hidden sm:block" />
          <div>
            <h4 className="font-display font-semibold text-sm sm:text-base">Есть вопросы по этому товару?</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">Наша поддержка поможет вам 24/7</p>
          </div>
        </div>
        <a href="https://t.me/paveldurov" target="_blank" rel="noopener noreferrer"><Button variant="outline">Связаться с поддержкой</Button></a>
      </div>
    </div>
  );
};

export default ProductDetails;
