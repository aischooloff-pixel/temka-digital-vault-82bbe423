

# Plan: Super-Admin Panel `/adm` — Complete Implementation

## Constraint

Everything must live in `supabase/functions/platform-bot/index.ts` (single edge function file, currently 1414 lines). The full `/adm` engine will add ~2500-3000 lines. All 14 sections from the requirements will be implemented.

## Database Changes

**New table: `platform_admins`**
```sql
CREATE TABLE platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin'
    CHECK (role IN ('owner','superadmin','support','finance','moderator')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access" ON platform_admins FOR ALL USING (false);
CREATE POLICY "Service role manages" ON platform_admins FOR ALL TO service_role USING (true) WITH CHECK (true);
```

No other DB changes needed — all existing tables are sufficient.

## Architecture

- **Callback namespace**: `adm:` prefix (separate from `p:` and `s:`)
- **FSM states**: `adm_` prefix in `platform_sessions`
- **Access guard**: `isSuperAdmin(telegramId)` checks `platform_admins` table, falls back to `ADMIN_TELEGRAM_IDS` env
- **Routing**: New `handleAdmCallback()` and `handleAdmText()` functions
- **Entry point**: `/adm` command in main serve handler
- **Logging**: All dangerous actions logged to `admin_logs` with `entity_type` and details

## Implementation — All 14 Sections

### 1. Infrastructure & Access Control
- `isSuperAdmin()` guard function (check `platform_admins` + `ADMIN_TELEGRAM_IDS` fallback)
- `/adm` command handler → verify access → show main menu
- All `adm:` callbacks gated by guard
- Unauthorized users get rejection message
- `handleAdmCallback()` router with `adm:` prefix
- `handleAdmText()` router for `adm_` FSM states
- `admLog()` helper — writes to `admin_logs`

### 2. Main Menu (`adm:home`)
12-button grid covering all sections:
- 👥 Пользователи → `adm:users`
- 🏪 Магазины → `adm:shops`
- 💳 Подписки/платежи → `adm:finance`
- 🧾 Заказы → `adm:orders`
- 🤖 Боты/webhook → `adm:bots`
- 🎟 Промокоды → `adm:promo`
- ⭐ Отзывы → `adm:reviews`
- 📢 Рассылки → `adm:broadcast`
- 🚨 Риски/блокировки → `adm:risks`
- 📋 Логи → `adm:logs`
- ⚙️ Настройки → `adm:settings`
- 👮 Администраторы → `adm:admins`

### 3. Platform Users (`adm:users`)
- List with pagination (5 per page) from `platform_users`
- Search by telegram_id / username / name → FSM state `adm_search_user`
- User card: TG info, registration date, premium, subscription status, shop count, order count, total spend
- Quick actions: view shops (`adm:ushops:{uid}`), block/unblock (`adm:ublock:{tgid}`), send message (`adm_msg_user` FSM), credit/debit balance (`adm_ubal` FSM)
- All block/unblock actions logged

### 4. Shops (`adm:shops`)
- List with pagination, status indicators
- Search by name / slug / owner TG ID / bot_username → FSM `adm_search_shop`
- Shop card: all fields (name, slug, owner, status, color, hero, support, bot_username, bot_id, webhook_status, bot_validated_at, cryptobot status, OP settings, dates)
- Stats: products count, orders count, revenue sum, customers count, reviews count
- Quick actions:
  - View owner → `adm:ucard:{owner_tg_id}`
  - View products/orders/customers/promos/reviews/logs for shop
  - Pause/activate → `adm:stoggle:{shopId}`
  - Delete shop → `adm:sdel:{shopId}` with confirmation
  - Open storefront link
- All status changes and deletes logged

### 5. Subscriptions & Payments (`adm:finance`)
- Toggle view: `subscription_payments` / `processed_invoices`
- List with pagination
- Filter by status/type (callback toggles)
- Payment card: user, shop, invoice_id, amount, currency, status, type, dates
- Cross-links to user card and shop card
- Internal note capability via FSM

### 6. Orders Hub (`adm:orders`)
- Toggle: platform `orders` / tenant `shop_orders` / all
- List with pagination
- Search by order_number / invoice_id / telegram_id → FSM `adm_search_order`
- Order card: type badge (platform/shop), shop name, customer, items, amounts, discount, promo, balance_used, payment_status, status, dates
- Actions: view customer, view shop, change status (with confirmation + logging)

### 7. Bots & Webhooks (`adm:bots`)
- List all shops with bot connection status columns
- Per-shop: bot_username, webhook_status, bot_validated_at, OP status, required_channel
- Actions:
  - Revalidate token → decrypt + getMe
  - Reset webhook → decrypt + setWebhook
  - Remove webhook → decrypt + deleteWebhook
  - Test OP channel → decrypt + getChatMember
- Error display for each action result

### 8. Promocodes (`adm:promo`)
- Toggle: platform `promocodes` / shop `shop_promocodes`
- List with pagination
- Card: code, type, value, active, valid dates, usage stats, shop binding
- Actions: create (FSM `adm_promo_create`), edit, activate/deactivate, delete
- Shop promo shows which shop it belongs to

### 9. Reviews & Moderation (`adm:reviews`)
- Toggle: platform `reviews` / shop `shop_reviews` / all
- List with pagination, filter by moderation_status
- Card: author, rating, text, product, shop, status
- Actions: approve, reject, delete
- Cross-links to shop/product/user

### 10. Broadcasts (`adm:broadcast`)
- Target selection: all platform_users / shop owners / specific shop customers
- Segment filters: subscription status, has shops, blocked status
- FSM flow: select target → enter message text → preview → confirm
- Dry-run count before sending
- Confirmation step with recipient count
- Execution with progress tracking
- Results logged

### 11. Risks / Limits / Blocks (`adm:risks`)
- Rate limits list from `rate_limits` with cleanup action
- Blocked users list (from `user_profiles` where `is_blocked = true`)
- Shops with broken webhook/bot (`webhook_status != 'active'`)
- Quick actions: unblock user, freeze/activate shop, clear rate limit

### 12. Logs & Audit (`adm:logs`)
- Combined view of `admin_logs` + `shop_admin_logs`
- Pagination (10 per page)
- Filter by: admin TG ID, action, entity_type, date range (via FSM)
- Human-readable log entries
- Cross-links to entities from log entries

### 13. System Settings (`adm:settings`)
- Display current config: PLATFORM_NAME, WEBAPP_URL, SUPPORT_LINK, PLATFORM_CHANNEL_ID
- Edit `shop_settings` keys via FSM
- Feature toggle display (read-only for env vars)

### 14. Administrators (`adm:admins`)
- List from `platform_admins` table (+ ADMIN_TELEGRAM_IDS fallback)
- Add admin → FSM `adm_add_admin` (enter TG ID + select role)
- Remove admin (with confirmation)
- Change role
- View audit trail per admin (filter `admin_logs` by admin_telegram_id)
- Owner-only restriction on adding/removing superadmins

## Implementation Batches

Due to the massive scope (~3000 lines of new code), implementation will be split into 3 sequential batches within this session:

**Batch 1**: Infrastructure + Main Menu + Users + Shops + Orders (core operational control)

**Batch 2**: Finance + Bots + Promocodes + Reviews (data visibility & moderation)

**Batch 3**: Broadcasts + Risks + Logs + Settings + Admins (operational tools)

Each batch is functional on its own — the main menu only shows buttons for implemented sections.

## Security

- All callbacks gated by `isSuperAdmin()` — unauthorized clicks silently rejected
- Dangerous actions (delete, block, status change) require confirmation callback
- All mutations logged to `admin_logs` with admin TG ID, action, entity, details
- Owner-only restrictions on admin management
- No stale callback issues — session-based FSM validation

