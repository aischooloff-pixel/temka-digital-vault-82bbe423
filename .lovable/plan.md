

# Plan: Platform Admin Hardening & Operational Fixes

## 8 Tasks

---

### 1. Storefront: Deactivated/Deleted Shop Status Screen

**Problem**: `ShopContext.tsx` filters by `eq('status', 'active')`, making deactivated shops show generic "Магазин не найден" — same as deleted.

**Fix in `src/contexts/ShopContext.tsx`**:
- Remove `.eq('status', 'active')` from the query
- After fetching, check `data.status`:
  - If `status !== 'active'` → set a new state `shopStatus: 'paused'` (or similar)
  - If no data → keep "not found"
- Add `shopStatus` to `ShopData` interface

**Fix in `src/pages/ShopLayout.tsx`**:
- Before rendering `<Outlet>`, check `shop.status`:
  - If `paused` → show full-screen "⚠️ Магазин временно недоступен. Обратитесь в поддержку." with no navigation, no catalog, no cart access
  - If `shop` is null (deleted) → show "Магазин не найден или удалён"
- This gate covers ALL child routes since it's in the layout

### 2. Seller Bot: Inactive Shop Response

**Problem**: `seller-bot-webhook` line 1304 silently returns `ok` when shop is inactive — user gets no feedback.

**Fix in `supabase/functions/seller-bot-webhook/index.ts`**:
- When `shop.status !== 'active'`, decrypt bot token and send message: "⚠️ Магазин временно недоступен. Обратитесь в поддержку."
- Then return. This way the seller bot tells users the shop is paused instead of silently ignoring.

### 3. Platform Bot: Blocked User Guard

**Problem**: `is_blocked` in `user_profiles` is set by `/adm` but never enforced. Blocked users can still use /start, profile, my shops, create shop, all callbacks.

**Fix in `supabase/functions/platform-bot/index.ts`**:
- Add helper `isUserBlocked(telegramId)` → checks `user_profiles.is_blocked`
- Insert guard after subscription check at all entry points:
  - `/start` — after `enforceSubscription`
  - `👤 Профиль`, `🏪 Мои магазины` — same
  - `handleCallback` — at top, before processing `p:` callbacks (except `p:checksub`)
  - `handleText` — at top, before FSM processing
- When blocked → send: "🚫 Ваш аккаунт заблокирован. Обратитесь в поддержку."
- Do NOT block `/adm` for superadmins

### 4. Broadcast: Fix Owners Count

**Problem**: Line 1170 uses `count` on `shops` table, counting shops not unique owners.

**Fix in `supabase/functions/platform-bot/index.ts`** — `admBroadcastMenu`:
- Replace `db().from("shops").select("owner_id", { count: "exact", head: true })` with a query that gets distinct owners:
  ```
  const { data: shops } = await db().from("shops").select("owner_id");
  const uniqueOwners = new Set(shops?.map(s => s.owner_id) || []).size;
  ```
- Display `uniqueOwners` instead of `shopOwners`

### 5. Admin Comment on Deactivate/Delete + Owner Notification

**Problem**: `stoggle` and `sdelconfirm` in `/adm` happen silently — no comment, no notification to owner.

**Fix in `supabase/functions/platform-bot/index.ts`**:

**Deactivate (`stoggle`)**:
- Before toggling, enter FSM state `adm_deactivate_comment` with `{ shopId }` to ask for a reason
- Add new callback `adm:stoggle_nocomment:{shopId}` for quick toggle without comment (optional)
- After status change:
  - Log reason in `admin_logs` details
  - Look up shop owner's `telegram_id` via `platform_users`
  - Send TG message to owner: "⚠️ Ваш магазин «{name}» был {приостановлен/активирован} администратором. Причина: {comment}"

**Delete (`sdel`)**:
- Add FSM state `adm_delete_comment` with `{ shopId }` — ask for reason before confirmation
- After deletion:
  - Log with reason
  - Send notification to owner: "❌ Ваш магазин «{name}» был удалён администратором. Причина: {comment}"

### 6. Platform Statistics Dashboard

**Add new section to `/adm`**: `adm:stats` button in main menu.

**Function `admStats(tg, chatId, msgId)`** queries:
- `platform_users` count (total users)
- `shops` count by status (active/paused/total)
- Distinct `owner_id` count from `shops` (unique owners)
- `shops` where `bot_token_encrypted IS NOT NULL` (connected bots)
- `shops` where `webhook_status = 'active'` (active webhooks)
- `shops` where `is_subscription_required = true` (OP enabled)
- `shop_customers` total count
- `shop_orders` total count
- `shop_orders` where `payment_status = 'paid'` sum of `total_amount` (tenant revenue)
- `subscription_payments` count
- `processed_invoices` count
- `rate_limits` count
- `user_profiles` where `is_blocked = true` count
- Top 5 shops by revenue (aggregate `shop_orders`)

Display as a formatted card with all metrics. Add to main menu grid.

### 7. OP Settings in `/adm` Settings

**Enhance `admSettings`** to show OP platform status:
- Current `PLATFORM_CHANNEL_ID` value
- Whether channels are configured
- For each channel: display ID/link

**Add per-shop OP management in shop card** (`admShopCard`):
- Already shows OP status — add actions:
  - `adm:optoggle:{shopId}` — toggle `is_subscription_required`
  - `adm:opsetc:{shopId}` — FSM to set `required_channel_id` / `required_channel_link`
  - `adm:opclear:{shopId}` — clear channel settings
- All OP changes logged

### 8. Clean Up Mixed Entity Views in `/adm`

**Problem**: Reviews and orders in "all" mode show a noisy mixed feed without clear shop context.

**Fix**:
- In `admReviewsList` "all" mode: group by shop, show shop name badge prominently for each review
- In `admOrdersList` "all" mode: already shows shop name badge — verify it's always present
- For shop-specific promo/review/order lists (accessed via shop card): already scoped correctly — no change needed
- Ensure the default view for reviews starts with `shop` mode instead of `all` to prevent noise

---

## Implementation Order

All changes in parallel where possible:
1. ShopContext + ShopLayout (frontend: deactivated/deleted gate)
2. seller-bot-webhook (inactive shop message)
3. platform-bot: blocked user guard + broadcast fix + stats + OP settings + admin comments + mixed views cleanup

No database migrations needed — all existing tables are sufficient.

