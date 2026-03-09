export interface Product {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviewCount: number;
  stock: number;
  category: string;
  subcategory: string;
  deliveryType: 'instant' | 'manual';
  platform: string;
  region: string;
  tags: string[];
  image: string;
  specifications: Record<string, string>;
  guarantee: string;
  features: string[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
  subcategories: string[];
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  avatar: string;
  rating: number;
  date: string;
  text: string;
  verified: boolean;
}

export const categories: Category[] = [
  { id: 'social-media', name: 'Соцсети', icon: '📱', count: 142, subcategories: ['Instagram', 'TikTok', 'Twitter/X', 'Facebook', 'YouTube', 'Telegram'] },
  { id: 'gaming', name: 'Игровые аккаунты', icon: '🎮', count: 98, subcategories: ['Steam', 'Epic Games', 'PlayStation', 'Xbox', 'Riot Games', 'Blizzard'] },
  { id: 'streaming', name: 'Стриминг', icon: '🎬', count: 67, subcategories: ['Netflix', 'Spotify', 'Disney+', 'HBO Max', 'YouTube Premium', 'Apple Music'] },
  { id: 'software', name: 'Ключи ПО', icon: '🔑', count: 85, subcategories: ['Windows', 'Office 365', 'Adobe CC', 'Антивирусы', 'VPN', 'IDE лицензии'] },
  { id: 'services', name: 'Сервисные аккаунты', icon: '⚡', count: 53, subcategories: ['Облачное хранилище', 'Почтовые сервисы', 'Хостинг', 'Домены', 'CDN', 'Аналитика'] },
  { id: 'premium', name: 'Премиум-доступ', icon: '👑', count: 74, subcategories: ['ChatGPT Plus', 'Midjourney', 'Canva Pro', 'Grammarly', 'LinkedIn Premium', 'Notion'] },
  { id: 'automation', name: 'Автоматизация', icon: '🤖', count: 41, subcategories: ['Соц. боты', 'Парсинг', 'Email-автоматизация', 'Маркетинг', 'SEO-инструменты', 'Аналитика'] },
  { id: 'ai-tools', name: 'AI-инструменты', icon: '🧠', count: 56, subcategories: ['ChatGPT', 'Claude', 'Midjourney', 'Stable Diffusion', 'Jasper AI', 'Copy.ai'] },
];

export const products: Product[] = [
  {
    id: '1',
    title: 'Instagram аккаунт — 10K подписчиков',
    subtitle: 'Прокачанный аккаунт с органическим охватом',
    description: 'Премиум Instagram аккаунт с 10 000+ реальных подписчиков. Аккаунту 3+ года с постоянной историей активности. Идеально для запуска нового бренда или личной страницы с готовой аудиторией.',
    price: 89.99,
    oldPrice: 129.99,
    rating: 4.8,
    reviewCount: 234,
    stock: 12,
    category: 'social-media',
    subcategory: 'Instagram',
    deliveryType: 'instant',
    platform: 'Instagram',
    region: 'Глобальный',
    tags: ['hot', 'best-seller'],
    image: '/placeholder.svg',
    specifications: { 'Подписчики': '10 000+', 'Возраст аккаунта': '3+ года', 'Публикации': '50-100', 'Вовлечённость': '3-5%', 'Регион': 'Глобальный', 'Почта восстановления': 'Включена' },
    guarantee: 'Гарантия замены 48 часов',
    features: ['Оригинальная почта включена', 'Полная передача аккаунта', 'Инструкция по 2FA', 'Поддержка после покупки'],
  },
  {
    id: '2',
    title: 'Steam аккаунт — 150+ игр',
    subtitle: 'Огромная библиотека с редкими тайтлами',
    description: 'Загруженный Steam аккаунт с 150+ премиум играми включая AAA-тайтлы. Аккаунт включает GTA V, Cyberpunk 2077, Elden Ring и другие. Уровень 30+ с значками и коллекционными карточками.',
    price: 149.99,
    oldPrice: 199.99,
    rating: 4.9,
    reviewCount: 189,
    stock: 5,
    category: 'gaming',
    subcategory: 'Steam',
    deliveryType: 'instant',
    platform: 'Steam',
    region: 'Глобальный',
    tags: ['hot', 'sale'],
    image: '/placeholder.svg',
    specifications: { 'Игры': '150+', 'Уровень': '30+', 'VAC статус': 'Чистый', 'Часы в игре': '2000+', 'Регион': 'Глобальный', 'Друзья': '50+' },
    guarantee: 'Гарантия замены 72 часа',
    features: ['Полные данные для входа', 'Смена почты поддерживается', 'Без VAC банов', 'Включая DLC'],
  },
  {
    id: '3',
    title: 'Netflix Премиум — 12 месяцев',
    subtitle: 'Доступ к 4K UHD стримингу',
    description: 'Полный год Netflix Премиум плана с 4K Ultra HD стримингом и 4 одновременных экрана. Наслаждайтесь полной библиотекой Netflix в максимальном качестве.',
    price: 29.99,
    oldPrice: 49.99,
    rating: 4.7,
    reviewCount: 567,
    stock: 50,
    category: 'streaming',
    subcategory: 'Netflix',
    deliveryType: 'instant',
    platform: 'Netflix',
    region: 'Глобальный',
    tags: ['best-seller', 'instant'],
    image: '/placeholder.svg',
    specifications: { 'План': 'Премиум 4K', 'Срок': '12 месяцев', 'Экраны': '4 одновременно', 'Качество': '4K UHD + HDR', 'Загрузки': 'Да', 'Реклама': 'Нет' },
    guarantee: 'Гарантия замены 30 дней',
    features: ['4K Ultra HD', '4 экрана одновременно', 'Загрузка офлайн', 'Без рекламы'],
  },
  {
    id: '4',
    title: 'Windows 11 Pro — Вечный ключ',
    subtitle: 'Подлинная лицензия, мгновенная активация',
    description: 'Оригинальный лицензионный ключ Windows 11 Professional для постоянного использования. Поддерживает все функции включая BitLocker, Удалённый рабочий стол, Hyper-V и другие. Мгновенная доставка на email.',
    price: 24.99,
    oldPrice: 39.99,
    rating: 4.9,
    reviewCount: 1203,
    stock: 200,
    category: 'software',
    subcategory: 'Windows',
    deliveryType: 'instant',
    platform: 'Microsoft',
    region: 'Глобальный',
    tags: ['best-seller', 'instant'],
    image: '/placeholder.svg',
    specifications: { 'Версия': 'Windows 11 Pro', 'Тип лицензии': 'Вечная / Розничная', 'Активация': 'Онлайн / Телефон', 'Язык': 'Все языки', 'Обновления': 'Включены', 'Разрядность': '32/64-бит' },
    guarantee: 'Пожизненная гарантия активации',
    features: ['Мгновенная доставка на email', 'Все языки поддерживаются', 'Вечная лицензия', 'Бесплатная помощь в активации'],
  },
  {
    id: '5',
    title: 'ChatGPT Plus — 1 месяц доступа',
    subtitle: 'GPT-4 без ограничений с приоритетом',
    description: 'Один месяц подписки ChatGPT Plus с полным доступом к GPT-4, приоритетом в пиковое время и повышенной скоростью ответов. Идеально для профессионалов и опытных пользователей.',
    price: 14.99,
    oldPrice: 20.00,
    rating: 4.6,
    reviewCount: 892,
    stock: 30,
    category: 'premium',
    subcategory: 'ChatGPT Plus',
    deliveryType: 'instant',
    platform: 'OpenAI',
    region: 'Глобальный',
    tags: ['new', 'instant'],
    image: '/placeholder.svg',
    specifications: { 'Модель': 'GPT-4 / GPT-4o', 'Срок': '1 месяц', 'Доступ': 'Приоритетный', 'Скорость': 'Быстрая', 'Плагины': 'Да', 'DALL-E': 'Включён' },
    guarantee: 'Гарантия замены 7 дней',
    features: ['Доступ к GPT-4', 'Приоритет в пиковое время', 'Поддержка плагинов', 'Генерация изображений DALL-E'],
  },
  {
    id: '6',
    title: 'Spotify Премиум — 6 месяцев',
    subtitle: 'Музыка без рекламы',
    description: 'Шесть месяцев Spotify Premium с прослушиванием без рекламы, офлайн-загрузками и безлимитными пропусками. Наслаждайтесь музыкой в высоком качестве без перерывов.',
    price: 19.99,
    oldPrice: 29.99,
    rating: 4.8,
    reviewCount: 445,
    stock: 40,
    category: 'streaming',
    subcategory: 'Spotify',
    deliveryType: 'instant',
    platform: 'Spotify',
    region: 'Глобальный',
    tags: ['sale', 'instant'],
    image: '/placeholder.svg',
    specifications: { 'План': 'Индивидуальный Премиум', 'Срок': '6 месяцев', 'Качество': '320кбит/с', 'Офлайн': 'Да', 'Реклама': 'Нет', 'Устройства': 'Все' },
    guarantee: 'Гарантия замены 14 дней',
    features: ['Без рекламы', 'Офлайн-загрузки', 'Безлимитные пропуски', 'Высокое качество звука'],
  },
  {
    id: '7',
    title: 'TikTok аккаунт — 50K подписчиков',
    subtitle: 'Аккаунт готов к монетизации',
    description: 'Прокачанный TikTok аккаунт с 50K+ подписчиками и высокой вовлечённостью. Готов к Фонду создателей и партнёрским сотрудничествам. Подтверждённый органический рост.',
    price: 199.99,
    oldPrice: 299.99,
    rating: 4.5,
    reviewCount: 78,
    stock: 3,
    category: 'social-media',
    subcategory: 'TikTok',
    deliveryType: 'manual',
    platform: 'TikTok',
    region: 'США',
    tags: ['hot', 'new'],
    image: '/placeholder.svg',
    specifications: { 'Подписчики': '50 000+', 'Лайки': '500K+', 'Видео': '100+', 'Фонд создателей': 'Доступен', 'Регион': 'США', 'Возраст': '1+ год' },
    guarantee: 'Гарантия замены 48 часов',
    features: ['Доступ к Фонду создателей', 'Органическая база подписчиков', 'Полные данные для входа', 'Помощь при передаче'],
  },
  {
    id: '8',
    title: 'Adobe Creative Cloud — 1 год',
    subtitle: 'Полный доступ ко всем приложениям',
    description: 'Полная подписка Adobe Creative Cloud на один год. Доступ к Photoshop, Illustrator, Premiere Pro, After Effects и 20+ другим творческим приложениям.',
    price: 79.99,
    oldPrice: 119.99,
    rating: 4.7,
    reviewCount: 312,
    stock: 15,
    category: 'software',
    subcategory: 'Adobe CC',
    deliveryType: 'instant',
    platform: 'Adobe',
    region: 'Глобальный',
    tags: ['best-seller'],
    image: '/placeholder.svg',
    specifications: { 'Приложения': 'Все 20+ приложений', 'Срок': '12 месяцев', 'Хранилище': '100ГБ облако', 'Обновления': 'Включены', 'Устройства': '2 компьютера', 'Шрифты': 'Adobe Fonts' },
    guarantee: 'Гарантия замены 30 дней',
    features: ['Все приложения Creative Cloud', '100ГБ хранилища', 'Adobe Fonts включены', 'Регулярные обновления'],
  },
  {
    id: '9',
    title: 'NordVPN — план на 2 года',
    subtitle: 'Полная защита онлайн-приватности',
    description: 'Два года NordVPN премиум-защиты. Доступ к 5 500+ серверам в 60 странах с шифрованием военного уровня. Разблокировка гео-ограниченного контента по всему миру.',
    price: 34.99,
    oldPrice: 59.99,
    rating: 4.8,
    reviewCount: 678,
    stock: 100,
    category: 'software',
    subcategory: 'VPN',
    deliveryType: 'instant',
    platform: 'NordVPN',
    region: 'Глобальный',
    tags: ['sale', 'best-seller'],
    image: '/placeholder.svg',
    specifications: { 'Срок': '2 года', 'Серверы': '5 500+', 'Страны': '60+', 'Устройства': '6 одновременно', 'Протокол': 'NordLynx', 'Kill Switch': 'Да' },
    guarantee: 'Гарантия замены 30 дней',
    features: ['5 500+ серверов', '6 устройств одновременно', 'Политика без логов', 'Защита от угроз'],
  },
  {
    id: '10',
    title: 'Discord Nitro — 12 месяцев',
    subtitle: 'Премиум возможности Discord',
    description: 'Полный год Discord Nitro с лимитом загрузки 100МБ, HD стримингом, анимированными аватарами, кастомными эмодзи, 2 бустами сервера и другими премиум функциями.',
    price: 49.99,
    oldPrice: 69.99,
    rating: 4.6,
    reviewCount: 234,
    stock: 25,
    category: 'premium',
    subcategory: 'Notion',
    deliveryType: 'instant',
    platform: 'Discord',
    region: 'Глобальный',
    tags: ['new'],
    image: '/placeholder.svg',
    specifications: { 'План': 'Nitro Full', 'Срок': '12 месяцев', 'Загрузка': '100МБ', 'Стриминг': '1080p 60fps', 'Бусты': '2 включены', 'Эмодзи': 'Кастомные + анимированные' },
    guarantee: 'Гарантия замены 14 дней',
    features: ['HD видео-стриминг', 'Загрузки до 100МБ', '2 буста сервера', 'Кастомные профили'],
  },
  {
    id: '11',
    title: 'Canva Pro — Вечный доступ',
    subtitle: 'Безлимитные инструменты дизайна навсегда',
    description: 'Вечный доступ к Canva Pro с 100M+ шаблонами, набором бренда, удалением фона, планировщиком контента и командной работой.',
    price: 39.99,
    rating: 4.9,
    reviewCount: 445,
    stock: 20,
    category: 'premium',
    subcategory: 'Canva Pro',
    deliveryType: 'instant',
    platform: 'Canva',
    region: 'Глобальный',
    tags: ['best-seller', 'instant'],
    image: '/placeholder.svg',
    specifications: { 'План': 'Pro', 'Срок': 'Навсегда', 'Шаблоны': '100M+', 'Хранилище': '1ТБ', 'Набор бренда': 'Да', 'Удаление фона': 'Да' },
    guarantee: 'Гарантия замены 30 дней',
    features: ['100M+ шаблонов', '1ТБ хранилища', 'Удаление фона', 'Набор бренда'],
  },
  {
    id: '12',
    title: 'Midjourney — 1 месяц Standard',
    subtitle: 'Безлимитная AI-генерация изображений',
    description: 'Один месяц Midjourney Standard плана с безлимитной генерацией, быстрым GPU временем и правами на коммерческое использование. Создавайте потрясающие AI-арты и визуалы.',
    price: 22.99,
    oldPrice: 30.00,
    rating: 4.7,
    reviewCount: 167,
    stock: 18,
    category: 'ai-tools',
    subcategory: 'Midjourney',
    deliveryType: 'instant',
    platform: 'Midjourney',
    region: 'Глобальный',
    tags: ['hot', 'new'],
    image: '/placeholder.svg',
    specifications: { 'План': 'Standard', 'Срок': '1 месяц', 'Генерации': 'Безлимит (Relax)', 'Быстрый GPU': '15 ч/мес', 'Коммерческое': 'Да', 'Stealth': 'Нет' },
    guarantee: 'Гарантия замены 7 дней',
    features: ['Безлимитные генерации', '15ч быстрого GPU', 'Коммерческие права', 'Приватные сообщения'],
  },
];

export const reviews: Review[] = [
  { id: '1', productId: '1', author: 'Алексей М.', avatar: 'А', rating: 5, date: '2024-12-15', text: 'Аккаунт доставили за 2 минуты. Все данные работают отлично. Подписчики реальные, вовлечённость хорошая. Рекомендую!', verified: true },
  { id: '2', productId: '1', author: 'Светлана К.', avatar: 'С', rating: 5, date: '2024-12-10', text: 'Отличное качество аккаунта. Продавец дал понятные инструкции по защите аккаунта. Всё прошло гладко.', verified: true },
  { id: '3', productId: '2', author: 'Михаил Р.', avatar: 'М', rating: 5, date: '2024-12-12', text: 'Невероятная ценность! Столько премиум-игр за малую часть стоимости. Аккаунт чистый, без проблем.', verified: true },
  { id: '4', productId: '3', author: 'Дмитрий Л.', avatar: 'Д', rating: 4, date: '2024-12-08', text: 'Netflix работает отлично уже 3 месяца. 4K качество потрясающее. Мелкая заминка при настройке, но поддержка быстро помогла.', verified: true },
  { id: '5', productId: '4', author: 'Евгения В.', avatar: 'Е', rating: 5, date: '2024-12-14', text: 'Ключ активировался моментально. Windows 11 Pro работает идеально. Лучшая цена в интернете. Куплю Office следующим.', verified: true },
  { id: '6', productId: '5', author: 'Тимур Х.', avatar: 'Т', rating: 4, date: '2024-12-11', text: 'Доступ к ChatGPT Plus работает отлично. GPT-4 заметно лучше. Быстрая доставка и хорошая цена по сравнению с официальной подпиской.', verified: true },
  { id: '7', productId: '6', author: 'Лиза П.', avatar: 'Л', rating: 5, date: '2024-12-13', text: 'Spotify Premium работает безупречно. Без рекламы, безлимитные пропуски, офлайн-режим — всё как обещано. Отличная цена!', verified: true },
  { id: '8', productId: '8', author: 'Кирилл Б.', avatar: 'К', rating: 5, date: '2024-12-09', text: 'Все приложения Adobe работают идеально. Photoshop, Premiere — всё что нужно. Сэкономил сотни по сравнению с розничной ценой.', verified: true },
];

export const getProductsByCategory = (categoryId: string) => products.filter(p => p.category === categoryId);
export const getProductById = (id: string) => products.find(p => p.id === id);
export const getFeaturedProducts = () => products.filter(p => p.tags.includes('best-seller') || p.tags.includes('hot'));
export const getReviewsByProductId = (productId: string) => reviews.filter(r => r.productId === productId);
