

# План: системная доработка магазина — 11 задач

## 1. Убрать комментарий из Checkout

**Файл:** `src/pages/Checkout.tsx`
- Удалить state `notes`, `setNotes` (строка 14)
- Удалить весь блок textarea (строки 123-127)
- Убрать `notes` из body запроса к `create-invoice` (строка 51)
- В `create-invoice/index.ts` поле `notes` уже nullable — совместимость не нарушится

## 2. Увеличить элементы на лендинге

**Файл:** `src/pages/Index.tsx`
- Hero: увеличить заголовок `text-3xl sm:text-4xl`, подзаголовок `text-base`, badge `text-sm`, CTA `size="xl"`
- Trust badges: `text-sm` вместо `text-xs`
- Stats секция: `py-6`, числа `text-lg sm:text-xl`, подписи `text-xs`
- Категории: заголовок `text-xl`, ячейки `p-3`, emoji `text-2xl`, название `text-xs`
- Карточки в горизонтальных секциях: `min-w-[260px] sm:min-w-[300px]`
- FAQ: карточки `p-4`, вопрос `text-sm`, ответ `text-sm`
- Секции: `py-8` вместо `py-6`

**Файл:** `src/components/ProductCard.tsx`
- Увеличить image area: `h-40 sm:h-48`
- Название: `text-sm sm:text-base`
- Цена: `text-lg sm:text-xl`
- Кнопка: `h-8 sm:h-9 text-sm`

## 3. Отображение username и баланса в профиле

**Файл:** `src/pages/Account.tsx`
- Добавить запрос к `user_profiles` для получения `balance`, `role` по `telegram_id`
- Показать username (уже есть из TG), но добавить TG ID
- Добавить карточку баланса: `$X.XX` — реальное значение из БД
- Добавить loading/error state для баланса
- Добавить хук `useUserProfile` в `useOrders.ts`

**Файл:** `src/hooks/useOrders.ts`
- Добавить `useUserProfile` — запрос `user_profiles` по `telegram_id` → возвращает `balance`, `role`

## 4-5. Переработать раздел «О нас» с динамическими данными

**Файл:** `src/pages/About.tsx`
- Убрать хардкодные числа (50K+, 12K+, 99.8%, 24/7)
- Добавить хук `useShopStats` — запрос реальных агрегатов из БД:
  - `user_profiles` → count → «Пользователей»
  - `orders` (status in paid/completed/delivered) → count → «Заказов выполнено»
  - `products` (is_active) → count → «Товаров в каталоге»
  - `reviews` (verified) → count → «Отзывов» (если > 0)
- Показывать loading скелетоны
- Переработать визуал: крупнее карточки, современнее тексты
- Убрать фейковые маркетинговые числа

**Файл:** `src/hooks/useProducts.ts`
- Добавить `useShopStats` — реальные агрегаты для «О нас»

## 6. Доработать промокоды в Checkout

**Проблема:** промокод применяется в Cart, но в Checkout он не передаётся — checkout использует `cartTotal` без скидки и не знает о промокоде.

**Решение:** перенести промокод-логику в `StoreContext`, чтобы она была доступна в обоих компонентах.

**Файл:** `src/contexts/StoreContext.tsx`
- Добавить state: `promoCode`, `promoResult` (discountType, discountValue, promoId), `promoError`
- Добавить `applyPromo(code)`, `clearPromo()`
- Добавить computed: `discount`, `totalAfterDiscount`

**Файл:** `src/pages/Cart.tsx`
- Использовать `useStore()` для промокода вместо локального state
- Убрать локальные promoCode/promoApplied/promoError/promoLoading

**Файл:** `src/pages/Checkout.tsx`
- Получить `discount`, `totalAfterDiscount`, `promoResult` из `useStore()`
- Показать скидку и итог после скидки
- Передать `promoCode`, `discountAmount` в body запроса к `create-invoice`
- Кнопка оплаты показывает `totalAfterDiscount`

**Файл:** `supabase/functions/create-invoice/index.ts`
- Принять `promoCode`, `discountAmount`, `balanceUsed` из body
- Сохранить в order (поля `notes` можно использовать или добавить новые колонки)
- Создать invoice на `amount - discountAmount - balanceUsed`

**Миграция:** добавить поля в `orders`:
- `discount_amount numeric DEFAULT 0`
- `promo_code text`
- `balance_used numeric DEFAULT 0`

**Лимит на пользователя:** в таблице `promocodes` нет поля `max_uses_per_user`. Нужна миграция для добавления. Проверка — считать кол-во orders с данным promo_code для данного telegram_id.

**Миграция:** `ALTER TABLE promocodes ADD COLUMN IF NOT EXISTS max_uses_per_user integer DEFAULT NULL;`

## 7. HTML-форматирование и preview в рассылке

**Файл:** `supabase/functions/telegram-bot/index.ts`
- Изменить flow рассылки:
  1. `a:bs` → FSM `bc:t` (ввод текста/фото)
  2. После ввода — НЕ отправлять сразу, а сохранить в сессию и показать preview
  3. FSM `bc:t` → сохранить текст/фото в `sData`, перейти в `bc:preview`
  4. Показать preview: `tg.send(cid, text, ikb([Отправить, Редактировать, Отмена]))` — с parse_mode HTML
  5. Callback `a:bcsend` → выполнить рассылку
  6. Callback `a:bcedit` → вернуть в `bc:t`
  7. Callback `a:bccancel` → очистить сессию

## 8. Оплата через баланс

**Файл:** `src/pages/Checkout.tsx`
- Добавить запрос баланса пользователя из `user_profiles`
- Показать доступный баланс
- Вычислить: `totalAfterPromo = cartTotal - discount`; `balanceUsed = min(balance, totalAfterPromo)`; `toPay = totalAfterPromo - balanceUsed`
- Если `toPay === 0` → оплата полностью через баланс: вызвать новую edge function `pay-with-balance`
- Если `toPay > 0` → создать CryptoBot invoice на `toPay`, передать `balanceUsed`
- UI: показать строки «Списание с баланса: -$X.XX» и «К оплате через CryptoBot: $Y.YY»

**Новая edge function:** `supabase/functions/pay-with-balance/index.ts`
- Принять: `telegramUserId`, `orderNumber`, `items`, `discountAmount`, `promoCode`, `balanceUsed`
- Создать order (status=paid, payment_status=paid)
- Списать баланс у пользователя
- Записать в `balance_history`
- Выполнить auto-delivery (аналогично webhook логике)

**Файл:** `supabase/functions/create-invoice/index.ts`
- Принять `balanceUsed`; сохранить в order; создать invoice на `amount - balanceUsed`

**Файл:** `supabase/functions/cryptobot-webhook/index.ts`
- После оплаты: проверить `balance_used` в order → списать баланс + записать в `balance_history`

## 9. Отзывы: кнопка + модерация

**Миграция:** добавить в `reviews`:
- `moderation_status text DEFAULT 'pending'` (pending/approved/rejected)

**Файл:** `src/pages/Index.tsx`
- Добавить секцию «Отзывы» обратно, но только `approved` отзывы
- Кнопка «Оставить отзыв» → открывает inline форму (rating stars + textarea + submit)
- Submit → insert в `reviews` с `moderation_status='pending'`
- При submit использовать edge function или напрямую (reviews имеет INSERT policy для service_role)
- Нужна edge function `submit-review` чтобы обойти RLS

**Новая edge function:** `supabase/functions/submit-review/index.ts`
- Принять: `telegramId`, `rating`, `text`
- Insert review с `moderation_status='pending'`, `verified=false`

**Файл:** `src/hooks/useProducts.ts`
- `useReviews` → добавить фильтр `.eq('verified', true)` для публичного показа (поле `verified` уже есть, будем использовать как proxy approved)

**Файл:** `supabase/functions/telegram-bot/index.ts`
- Добавить раздел «⭐ Отзывы» в админ-меню
- Список отзывов на модерации (`moderation_status = 'pending'`)
- Кнопки: одобрить (set verified=true, moderation_status='approved'), отклонить (moderation_status='rejected'), удалить

## Миграции БД (одна миграция)

```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS balance_used numeric NOT NULL DEFAULT 0;

ALTER TABLE public.promocodes
  ADD COLUMN IF NOT EXISTS max_uses_per_user integer;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending';
```

## Файлы для изменения

| Файл | Изменения |
|------|-----------|
| Миграция SQL | Новые поля в orders, promocodes, reviews |
| `src/pages/Checkout.tsx` | Убрать комментарий, добавить баланс + промокод + комбинированную оплату |
| `src/pages/Index.tsx` | Увеличить элементы, добавить секцию отзывов с кнопкой |
| `src/pages/Account.tsx` | Показать username, баланс, TG ID |
| `src/pages/About.tsx` | Динамические данные, переработанный визуал |
| `src/pages/Cart.tsx` | Промокод из StoreContext |
| `src/components/ProductCard.tsx` | Увеличить элементы |
| `src/contexts/StoreContext.tsx` | Промокод state + computed |
| `src/hooks/useProducts.ts` | useShopStats, обновить useReviews |
| `src/hooks/useOrders.ts` | useUserProfile |
| `supabase/functions/create-invoice/index.ts` | Принять discount/balance/promo |
| `supabase/functions/cryptobot-webhook/index.ts` | Списать баланс после оплаты |
| `supabase/functions/telegram-bot/index.ts` | Preview рассылки, модерация отзывов |
| Новый: `supabase/functions/pay-with-balance/index.ts` | Оплата полностью через баланс |
| Новый: `supabase/functions/submit-review/index.ts` | Отправка отзыва |

