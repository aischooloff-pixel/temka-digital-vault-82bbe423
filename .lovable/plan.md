

# План: полная доработка админ-панели и фронтенда

## Аудит: что уже реализовано

### В боте (telegram-bot/index.ts, 740 строк):
- ✅ /admin с проверкой прав (env + admin_users)
- ✅ Товары: список, карточка, создание (title+price), редактирование (title/price/stock/description/old_price/tags), toggle (active/featured/popular/new), удаление с подтверждением
- ✅ Категории: список, карточка, создание (name+icon), редактирование (name/icon/description/sort_order), toggle active, удаление
- ✅ Заказы: список, карточка, смена статуса
- ✅ Пользователи: список, карточка (имя, TG ID, заказы, потрачено), отправка сообщения
- ✅ Статистика: реальная из БД
- ✅ Настройки: список + редактирование значений
- ✅ Логи: список действий
- ✅ Склад: обзор остатков, inventory по товару, добавление единиц, синхронизация
- ✅ Рассылка: текст всем пользователям
- ✅ FSM-сессии, логирование, пагинация

### На фронтенде:
- ✅ Каталог, карточки, корзина, чекаут
- ✅ Профиль через Telegram identity
- ✅ Скелетоны, пустые состояния

### В webhook (cryptobot-webhook):
- ✅ Верификация подписи, обновление статуса заказа, уменьшение stock, уведомление в TG

---

## Что НЕ реализовано

### Критичное — фронтенд:
1. **Отзывы/Характеристики** — табы есть в ProductDetails, секция отзывов на Index
2. **Featured фильтрация** — Index.tsx строка 22 фильтрует по tags вместо is_featured/is_popular/is_new
3. **Изображения товаров** — нет storage bucket, нет загрузки в боте, нет отображения
4. **Промокоды в корзине** — фейковая логика (hardcoded 10%)
5. **Фильтрация неактивных категорий** — useCategories не фильтрует по is_active

### Критичное — бот:
6. **Медиа в рассылке** — только текст, нет поддержки фото
7. **Фото товара** — нет FSM-стейта для загрузки изображения
8. **Промокоды CRUD** — нет раздела в админке (таблица есть)
9. **Выбор категории товара** — нет кнопки/обработчика
10. **Автодоставка** — webhook не выдает inventory_items пользователю

### Управление пользователями — НЕ реализовано:
11. **Поиск пользователей** — по TG ID, username, имени
12. **Роли пользователей** — нет поля role в user_profiles
13. **Блокировка** — нет поля is_blocked
14. **Баланс** — нет поля balance, нет таблицы balance_history
15. **Заметки** — нет поля internal_note
16. **Заказы пользователя** — нет кнопки в карточке
17. **Фильтрация пользователей** — по роли, статусу
18. **Выдача промокода** — конкретному пользователю
19. **Логи по пользователю** — нет выборки

### Настройки:
20. **Дефолтные настройки** — shop_settings пуста

---

## План реализации

### Задача 1: Миграция БД

Одна миграция:
- Добавить в `user_profiles`: `role` (text, default 'user'), `is_blocked` (boolean, default false), `balance` (numeric, default 0), `internal_note` (text, nullable)
- Создать таблицу `balance_history` (id, telegram_id, amount, balance_after, type, comment, admin_telegram_id, created_at) с RLS `USING (false)`
- Создать storage bucket `product-images` (public)
- Вставить дефолтные shop_settings: shop_name, support_username, currency

### Задача 2: Фронтенд — убрать отзывы/характеристики, исправить фильтрацию, добавить изображения

**ProductDetails.tsx:**
- Удалить табы, useState activeTab, useReviews, Star import
- Оставить только блок описания (без табов)
- Показывать `product.image` вместо emoji если задано

**Index.tsx:**
- Строка 22: заменить `tags.includes(...)` на `p.is_featured || p.is_popular`
- Удалить секцию «Отзывы» (строки 152-186)
- Удалить import useReviews

**ProductCard.tsx:**
- Показывать `<img src={product.image}>` вместо emoji если `product.image` задано

**Cart.tsx:**
- Заменить фейковый промокод на реальный запрос к `promocodes` через Supabase
- Проверять is_active, valid_from, valid_until, max_uses > used_count
- Применять discount_type/discount_value

**useProducts.ts:**
- Добавить `.eq('is_active', true)` в useCategories

### Задача 3: Бот — медиа, промокоды, категории, пользователи

Полная перезапись `telegram-bot/index.ts` с добавлением:

**Фото товара:**
- Кнопка «🖼 Фото» в productView (callback `a:pe:PID:img`)
- FSM-стейт `ep:img:PID` — принимает `message.photo`
- Скачивание через `getFile`, загрузка в storage bucket, обновление `products.image`
- В основном обработчике: проверять `message.photo` помимо text

**Медиа в рассылке:**
- FSM-стейт `bc:t`: проверять `message.photo`
- Если фото — `sendPhoto` с caption
- Если текст — `sendMessage` как сейчас

**Промокоды CRUD:**
- Кнопка «🎟 Промокоды» в главном меню
- Список промокодов с пагинацией
- Создание: FSM (код → тип → значение)
- Toggle active, удаление

**Выбор категории товара:**
- Кнопка «📁 Категория» в productView
- Callback `a:pc:PID` — список категорий inline-кнопками
- Callback `a:ps:PID:CAT_ID` — установить category_id

**Расширенное управление пользователями:**
- Кнопка «🔍 Поиск» → FSM-стейт `us:q`, поиск по TG ID/username/имени
- Фильтры в списке: Все / VIP / Заблокированные
- Расширенная карточка: роль, статус, баланс, заметка
- Кнопки: 🛒 Заказы, 💰 Баланс, 🏷 Роль, 🚫 Блок, 📝 Заметка, 🎟 Промокод, 📋 Логи
- Заказы пользователя: `a:uo:TG_ID:PAGE` — список с пагинацией
- Баланс: подменю с ➕ Начислить, ➖ Списать, 🎯 Установить — FSM с вводом суммы+комментария, запись в balance_history
- Роль: inline-кнопки user/vip/blocked
- Блокировка: toggle is_blocked с подтверждением
- Заметка: FSM-стейт ввода текста
- Логи: выборка admin_logs по entity_id = telegram_id

### Задача 4: Автодоставка в cryptobot-webhook

После обновления заказа на `paid`:
- Для каждого order_item: выбрать доступные inventory_items (status=available)
- Отметить как sold, привязать order_id, поставить sold_at
- Отправить содержимое пользователю через `sendMessage`
- Обновить статус заказа на `delivered`
- Обновить stock в products

---

## Файлы для изменения

| Файл | Что |
|------|-----|
| Миграция SQL | user_profiles поля, balance_history, storage bucket, shop_settings |
| `src/pages/ProductDetails.tsx` | Убрать табы/отзывы/характеристики, добавить image |
| `src/pages/Index.tsx` | Фильтр по is_featured, убрать секцию отзывов |
| `src/components/ProductCard.tsx` | Показ image |
| `src/pages/Cart.tsx` | Реальная валидация промокодов |
| `src/hooks/useProducts.ts` | Фильтр активных категорий |
| `supabase/functions/telegram-bot/index.ts` | Фото, промокоды, категории, пользователи расширенные |
| `supabase/functions/cryptobot-webhook/index.ts` | Автодоставка inventory_items |

