export interface DbProduct {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  price: number;
  old_price: number | null;
  stock: number;
  category_id: string | null;
  subcategory: string;
  delivery_type: 'instant' | 'manual';
  platform: string;
  region: string;
  tags: string[];
  image: string | null;
  specifications: Record<string, string>;
  guarantee: string;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface DbOrder {
  id: string;
  order_number: string;
  telegram_id: number;
  status: 'pending' | 'awaiting_payment' | 'paid' | 'processing' | 'delivered' | 'completed' | 'cancelled' | 'error';
  payment_status: 'unpaid' | 'awaiting' | 'paid' | 'failed' | 'refunded';
  total_amount: number;
  currency: string;
  invoice_id: string | null;
  pay_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_title: string;
  product_price: number;
  quantity: number;
  created_at: string;
}

export interface DbReview {
  id: string;
  product_id: string;
  telegram_id: number | null;
  author: string;
  avatar: string;
  rating: number;
  text: string;
  verified: boolean;
  created_at: string;
}

export interface DbUserProfile {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  photo_url: string | null;
  is_premium: boolean;
  language_code: string | null;
  created_at: string;
  updated_at: string;
}

export const ORDER_STATUS_LABELS: Record<DbOrder['status'], string> = {
  pending: 'Создан',
  awaiting_payment: 'Ожидает оплаты',
  paid: 'Оплачен',
  processing: 'В обработке',
  delivered: 'Выдан',
  completed: 'Завершён',
  cancelled: 'Отменён',
  error: 'Ошибка',
};

export const PAYMENT_STATUS_LABELS: Record<DbOrder['payment_status'], string> = {
  unpaid: 'Не оплачен',
  awaiting: 'Ожидает оплаты',
  paid: 'Оплачен',
  failed: 'Ошибка оплаты',
  refunded: 'Возврат',
};
