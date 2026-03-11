

# План: Исправление архитектуры мультитенантной витрины ShopBot Platform

## Краткое описание проблемы

Магазин продавца (`/shop/:slug`) расходится с эталонной витриной (`/`) по 5 направлениям: отсутствует секция категорий, хардкод "TEMKA.STORE" в 6+ файлах, сломанная маршрутизация (ссылки ведут в root вместо `/shop/:slug/*`), бот-токен только сохраняется без валидации/webhook, дублирование layout-компонентов.

---

## Блок 0. Миграция БД

**Новая таблица `shop_categories`** для категорий tenant-магазинов:
- `id`, `shop_id` (FK → shops), `name`, `icon`, `sort_order`, `is_active`, `created_at`
- RLS: публичное чтение активных категорий активных магазинов, service_role — полный доступ

**Новые колонки в `shops`:**
- `bot_username text`
- `bot_id bigint`
- `webhook_status text DEFAULT 'none'`
- `bot_validated_at timestamptz`

---

## Блок 1. Категории на главной tenant-магазина

**Проблема:** `ShopIndex.tsx` показывает "Товары" вместо "Категории" как в `Index.tsx`.

**Решение:**
- Добавить загрузку `shop_categories` в `ShopContext.tsx`
- Переписать `ShopIndex.tsx` — после Hero+Stats добавить секцию "Категории" (grid 4 cols, ссылки на `/catalog?category=X`), затем "Популярные товары" (карусель), затем "Отзывы" (упрощённо, без формы), затем FAQ
- Пустое состояние категорий: "Категории не найдены" внутри того же layout (не менять структуру страницы)

**Файлы:** `ShopContext.tsx`, `ShopIndex.tsx`

---

## Блок 2. Убрать хардкод TEMKA.STORE

**Найденные хардкоды:**

| Файл | Хардкод | Замена |
|------|---------|--------|
| `App.tsx` строка 31 | `shopName="TEMKA.STORE"` | Оставить — это root storefront |
| `FAQ.tsx` строки 10-11, 73 | "TEMKA.STORE" в вопросах и подзаголовке | Динамически из `useStorefront().shopName` |
| `FAQ.tsx` строка 122 | `t.me/temka_support` | Динамически из `useStorefront().supportLink` |
| `About.tsx` строки 14, 38 | "О TEMKA.STORE", "Откройте TEMKA.STORE" | Динамически из `shopName` |
| `About.tsx` строка 101 | `Link to="/catalog"` | `buildPath('/catalog')` |
| `Footer.tsx` строка 8 | fallback `TEMKA.STORE` | Уже динамический — ОК |

**Решение:** Расширить `StorefrontContext` — добавить `supportLink?: string`. Все shared-страницы импортируют `useStorefront()` и `useStorefrontPath()` для замены хардкода.

**Файлы:** `StorefrontContext.tsx`, `FAQ.tsx`, `About.tsx`, `ShopLayout.tsx` (передать supportLink), `App.tsx` (передать supportLink платформы)

---

## Блок 3. Полный аудит маршрутизации

**Сломанные ссылки (ведут в root вместо tenant basePath):**

| Файл | Строка | Текущее | Нужное |
|------|--------|---------|--------|
| `Legal.tsx` | 8 | `Link to="/"` | `buildPath('/')` |
| `InfoPages.tsx` | 34, 62 | `Link to="/catalog"` | `buildPath('/catalog')` |
| `About.tsx` | 101 | `Link to="/catalog"` | `buildPath('/catalog')` |
| `Account.tsx` | 292 | `Link to="/catalog"` | `buildPath('/catalog')` |
| `Index.tsx` | 150, 203, 216, 235, 266, 423 | `Link to="/catalog"`, `Link to="/faq"` | `buildPath(...)` |
| `NotFound.tsx` | 19-20 | `Link to="/"`, `Link to="/catalog"` | `buildPath(...)` |
| `ProductDetails.tsx` | 46, 59, 61, 63 | `Link to="/"`, `Link to="/catalog"` | `buildPath(...)` |
| `Checkout.tsx` | 34, 110 | `Link to="/catalog"`, `Link to="/cart"` | `buildPath(...)` |
| `OrderSuccess.tsx` | 174-179 | `Link to="/catalog"`, `Link to="/account"` | `buildPath(...)` |
| `OrderFailed.tsx` | 27 | `Link to="/checkout"` | `buildPath(...)` |

**Решение:** В каждом файле добавить `const buildPath = useStorefrontPath()` и заменить все абсолютные пути.

**Файлы:** `Legal.tsx`, `InfoPages.tsx`, `About.tsx`, `Account.tsx`, `Index.tsx`, `NotFound.tsx`, `ProductDetails.tsx`, `Checkout.tsx`, `OrderSuccess.tsx`, `OrderFailed.tsx`

---

## Блок 4. Подключение бота продавца — валидация + webhook

**Текущее состояние:** Токен шифруется и сохраняется в `bot_token_encrypted`. Нет вызова `getMe`, нет `setWebhook`, нет статуса.

**Решение — обновить `platform-bot/index.ts`:**

1. При сохранении токена (onboarding шаг 7 + настройки):
   - Вызвать `getMe` с введённым токеном
   - Если невалиден → вернуть ошибку "❌ Токен невалиден. Проверьте и попробуйте снова"
   - Если валиден → сохранить `bot_username`, `bot_id` в таблицу `shops`
   - Вызвать `setWebhook` → URL: `{SUPABASE_URL}/functions/v1/seller-bot-webhook?shop_id={shopId}`
   - Обновить `webhook_status` = `'active'` или `'failed'`
   - Обновить `bot_validated_at`

2. В UI настроек (`p:settings`) показывать реальный статус:
   - "✅ Бот подключён (@username)" — если validated + webhook active
   - "⚠️ Webhook не установлен" — если token valid но webhook failed
   - "❌ Не подключён" — если нет токена

**Новый Edge Function `seller-bot-webhook/index.ts`:**
- Принимает updates от Telegram для ботов продавцов
- Извлекает `shop_id` из query params
- Дешифрует токен магазина
- Обрабатывает команды покупателей (пока базовый /start с ссылкой на витрину)

**Файлы:** `platform-bot/index.ts`, `seller-bot-webhook/index.ts` (новый)

---

## Блок 5. Расширение StorefrontContext

Добавить поля:
```typescript
interface StorefrontContextType {
  basePath: string;
  cartCount: number;
  shopName?: string;
  supportLink?: string;  // NEW
}
```

Обновить провайдеры:
- `ShopLayout.tsx`: передавать `supportLink={shop.support_link}`
- `App.tsx` MainLayout: передавать `supportLink="https://t.me/temka_support"`

---

## Порядок реализации

1. **Миграция БД** — `shop_categories` + новые колонки в `shops`
2. **StorefrontContext** — добавить `supportLink`
3. **Shared pages** — убрать хардкод, добавить `buildPath` (FAQ, About, Legal, InfoPages, Account, Index, NotFound, ProductDetails, Checkout, OrderSuccess, OrderFailed)
4. **ShopContext** — загружать `shop_categories`
5. **ShopIndex** — зеркало Index с категориями
6. **ShopLayout + App.tsx** — передавать `supportLink`
7. **platform-bot** — валидация getMe + setWebhook
8. **seller-bot-webhook** — новый Edge Function

---

## Acceptance Criteria

| # | Критерий | Блок |
|---|----------|------|
| 1-2 | Шаблон и tenant 1-в-1, различия только в данных | 1, 2, 5 |
| 3 | Данные из БД реально отображаются | 2 |
| 4 | Категории на главной tenant | 1 |
| 5 | Empty state внутри общего layout | 1 |
| 6-7 | Нет TEMKA.STORE в tenant | 2 |
| 8-11 | Все ссылки внутри `/shop/:slug/*` | 3 |
| 12-15 | Бот валидируется, webhook ставится, статус реальный | 4 |
| 16 | Визуально 1-в-1 | 1, 2, 3, 5 |

