

# План: доработка «Мои заказы» с историей пополнений и bottom sheets

## Что есть сейчас

- `Account.tsx` показывает плоский список заказов без пагинации и без деталей по клику
- `useOrders.ts` — хуки для orders, order_items, stats, profile
- `balance_history` — таблица с пополнениями (telegram_id, amount, type, balance_after, comment, created_at, admin_telegram_id)
- Drawer компонент (vaul) уже доступен в проекте
- `DbOrder` не содержит полей `discount_amount`, `promo_code`, `balance_used` в типах — нужно дополнить

## Задачи

### 1. Добавить хук `useBalanceHistory`

**Файл:** `src/hooks/useOrders.ts`
- Новый хук запрашивает `balance_history` по `telegram_id`, сортировка по `created_at desc`
- Интерфейс `DbBalanceHistory` добавить в `src/types/database.ts`

### 2. Обновить типы

**Файл:** `src/types/database.ts`
- Добавить `DbBalanceHistory` (id, telegram_id, amount, type, balance_after, comment, admin_telegram_id, created_at)
- Дополнить `DbOrder` полями `discount_amount`, `promo_code`, `balance_used` (уже есть в БД, но не в типах)

### 3. Переработать секцию «Мои заказы» в Account.tsx

**Файл:** `src/pages/Account.tsx`

- Объединить orders и balance_history в единый timeline, отсортированный по дате
- Показывать последние 5 записей, кнопка «Все» открывает полный список в Drawer
- Каждая карточка визуально различается:
  - **Заказ**: иконка Package, номер заказа, дата, сумма, статус (цветной)
  - **Пополнение**: иконка Wallet/ArrowDownCircle, «Пополнение», дата, сумма (+$X.XX зелёным), статус
- По клику на элемент — открывается Drawer (bottom sheet) с деталями

### 4. Drawer деталей заказа

**В том же файле или вынести в `src/components/OrderDetailSheet.tsx`**

Содержимое:
- Номер заказа, ID (мелким)
- Дата создания, дата обновления
- Статус заказа (badge), статус оплаты (badge)
- Список товаров (загружаются через `useOrderItems`): название, кол-во, цена за ед., итого по позиции
- Финансовый блок: подытог, скидка (если есть), промокод (если есть), списание с баланса (если > 0), оплата через CryptoBot (если > 0), итого
- Invoice ID (если есть)
- Заметки/комментарий системы (поле notes, если не пустое)

### 5. Drawer деталей пополнения

**`src/components/BalanceDetailSheet.tsx`**

Содержимое:
- ID операции (мелким)
- Дата и время
- Сумма (+$X.XX)
- Тип (credit/debit)
- Баланс после операции
- Комментарий (если есть)

### 6. Drawer «Все записи»

- Полный список всех заказов + пополнений в ScrollArea
- Тот же формат карточек, что и в превью
- По клику — открывается соответствующий детальный Drawer

## Файлы для изменения

| Файл | Что делаем |
|------|-----------|
| `src/types/database.ts` | Добавить DbBalanceHistory, дополнить DbOrder |
| `src/hooks/useOrders.ts` | Добавить useBalanceHistory |
| `src/pages/Account.tsx` | Объединённый timeline, кнопка «Все», клик → Drawer |
| Новый: `src/components/OrderDetailSheet.tsx` | Bottom sheet с деталями заказа |
| Новый: `src/components/BalanceDetailSheet.tsx` | Bottom sheet с деталями пополнения |

Без миграций БД — все нужные данные уже есть в таблицах. Нужно только обновить фронтенд-типы.

