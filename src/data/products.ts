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
  { id: 'social-media', name: 'Social Media', icon: '📱', count: 142, subcategories: ['Instagram', 'TikTok', 'Twitter/X', 'Facebook', 'YouTube', 'Telegram'] },
  { id: 'gaming', name: 'Gaming Accounts', icon: '🎮', count: 98, subcategories: ['Steam', 'Epic Games', 'PlayStation', 'Xbox', 'Riot Games', 'Blizzard'] },
  { id: 'streaming', name: 'Streaming', icon: '🎬', count: 67, subcategories: ['Netflix', 'Spotify', 'Disney+', 'HBO Max', 'YouTube Premium', 'Apple Music'] },
  { id: 'software', name: 'Software Keys', icon: '🔑', count: 85, subcategories: ['Windows', 'Office 365', 'Adobe CC', 'Antivirus', 'VPN', 'IDE Licenses'] },
  { id: 'services', name: 'Service Accounts', icon: '⚡', count: 53, subcategories: ['Cloud Storage', 'Email Services', 'Hosting', 'Domain Names', 'CDN', 'Analytics'] },
  { id: 'premium', name: 'Premium Access', icon: '👑', count: 74, subcategories: ['ChatGPT Plus', 'Midjourney', 'Canva Pro', 'Grammarly', 'LinkedIn Premium', 'Notion'] },
  { id: 'automation', name: 'Automation Tools', icon: '🤖', count: 41, subcategories: ['Social Bots', 'Scraping Tools', 'Email Automation', 'Marketing Tools', 'SEO Tools', 'Analytics Bots'] },
  { id: 'ai-tools', name: 'AI Tools', icon: '🧠', count: 56, subcategories: ['ChatGPT', 'Claude', 'Midjourney', 'Stable Diffusion', 'Jasper AI', 'Copy.ai'] },
];

export const products: Product[] = [
  {
    id: '1',
    title: 'Instagram Account — 10K Followers',
    subtitle: 'Aged account with organic reach',
    description: 'Premium Instagram account with 10,000+ real followers. Account is 3+ years old with consistent engagement history. Perfect for launching a new brand or personal page with existing audience.',
    price: 89.99,
    oldPrice: 129.99,
    rating: 4.8,
    reviewCount: 234,
    stock: 12,
    category: 'social-media',
    subcategory: 'Instagram',
    deliveryType: 'instant',
    platform: 'Instagram',
    region: 'Global',
    tags: ['hot', 'best-seller'],
    image: '/placeholder.svg',
    specifications: { 'Followers': '10,000+', 'Account Age': '3+ years', 'Posts': '50-100', 'Engagement Rate': '3-5%', 'Region': 'Global', 'Recovery Email': 'Included' },
    guarantee: '48-hour replacement guarantee',
    features: ['Original email included', 'Full account transfer', '2FA setup guide', 'Post-purchase support'],
  },
  {
    id: '2',
    title: 'Steam Account — 150+ Games',
    subtitle: 'Massive game library with rare titles',
    description: 'Loaded Steam account with 150+ premium games including AAA titles. Account includes games like GTA V, Cyberpunk 2077, Elden Ring, and more. Level 30+ with badges and trading cards.',
    price: 149.99,
    oldPrice: 199.99,
    rating: 4.9,
    reviewCount: 189,
    stock: 5,
    category: 'gaming',
    subcategory: 'Steam',
    deliveryType: 'instant',
    platform: 'Steam',
    region: 'Global',
    tags: ['hot', 'sale'],
    image: '/placeholder.svg',
    specifications: { 'Games': '150+', 'Level': '30+', 'VAC Status': 'Clean', 'Hours Played': '2000+', 'Region': 'Global', 'Friends': '50+' },
    guarantee: '72-hour replacement guarantee',
    features: ['Full credentials provided', 'Email change supported', 'No VAC bans', 'Includes DLCs'],
  },
  {
    id: '3',
    title: 'Netflix Premium — 12 Months',
    subtitle: '4K UHD streaming access',
    description: 'Full year of Netflix Premium plan with 4K Ultra HD streaming and 4 simultaneous screens. Enjoy the complete Netflix library with the highest quality available.',
    price: 29.99,
    oldPrice: 49.99,
    rating: 4.7,
    reviewCount: 567,
    stock: 50,
    category: 'streaming',
    subcategory: 'Netflix',
    deliveryType: 'instant',
    platform: 'Netflix',
    region: 'Global',
    tags: ['best-seller', 'instant'],
    image: '/placeholder.svg',
    specifications: { 'Plan': 'Premium 4K', 'Duration': '12 Months', 'Screens': '4 Simultaneous', 'Quality': '4K UHD + HDR', 'Downloads': 'Yes', 'Ads': 'No' },
    guarantee: '30-day replacement guarantee',
    features: ['4K Ultra HD', '4 screens simultaneously', 'Downloads available', 'No ads'],
  },
  {
    id: '4',
    title: 'Windows 11 Pro — Lifetime Key',
    subtitle: 'Genuine license, instant activation',
    description: 'Authentic Windows 11 Professional license key for lifetime use. Supports all features including BitLocker, Remote Desktop, Hyper-V, and more. Instant delivery to your email.',
    price: 24.99,
    oldPrice: 39.99,
    rating: 4.9,
    reviewCount: 1203,
    stock: 200,
    category: 'software',
    subcategory: 'Windows',
    deliveryType: 'instant',
    platform: 'Microsoft',
    region: 'Global',
    tags: ['best-seller', 'instant'],
    image: '/placeholder.svg',
    specifications: { 'Version': 'Windows 11 Pro', 'License Type': 'Lifetime / Retail', 'Activation': 'Online / Phone', 'Language': 'All Languages', 'Updates': 'Included', 'Bit': '32/64-bit' },
    guarantee: 'Lifetime activation guarantee',
    features: ['Instant email delivery', 'All languages supported', 'Lifetime validity', 'Free activation support'],
  },
  {
    id: '5',
    title: 'ChatGPT Plus — 1 Month Access',
    subtitle: 'GPT-4 unlimited with priority access',
    description: 'One month of ChatGPT Plus subscription with full access to GPT-4, priority during peak times, and faster response speeds. Perfect for professionals and power users.',
    price: 14.99,
    oldPrice: 20.00,
    rating: 4.6,
    reviewCount: 892,
    stock: 30,
    category: 'premium',
    subcategory: 'ChatGPT Plus',
    deliveryType: 'instant',
    platform: 'OpenAI',
    region: 'Global',
    tags: ['new', 'instant'],
    image: '/placeholder.svg',
    specifications: { 'Model': 'GPT-4 / GPT-4o', 'Duration': '1 Month', 'Access': 'Priority', 'Speed': 'Fast', 'Plugins': 'Yes', 'DALL-E': 'Included' },
    guarantee: '7-day replacement guarantee',
    features: ['GPT-4 access', 'Priority during peak', 'Plugin support', 'DALL-E image generation'],
  },
  {
    id: '6',
    title: 'Spotify Premium — 6 Months',
    subtitle: 'Ad-free music streaming',
    description: 'Six months of Spotify Premium with ad-free listening, offline downloads, and unlimited skips. Enjoy music in high quality without interruptions.',
    price: 19.99,
    oldPrice: 29.99,
    rating: 4.8,
    reviewCount: 445,
    stock: 40,
    category: 'streaming',
    subcategory: 'Spotify',
    deliveryType: 'instant',
    platform: 'Spotify',
    region: 'Global',
    tags: ['sale', 'instant'],
    image: '/placeholder.svg',
    specifications: { 'Plan': 'Individual Premium', 'Duration': '6 Months', 'Quality': '320kbps', 'Offline': 'Yes', 'Ads': 'None', 'Devices': 'All' },
    guarantee: '14-day replacement guarantee',
    features: ['No advertisements', 'Offline downloads', 'Unlimited skips', 'High quality audio'],
  },
  {
    id: '7',
    title: 'TikTok Account — 50K Followers',
    subtitle: 'Monetization-ready creator account',
    description: 'Established TikTok account with 50K+ followers and strong engagement. Ready for the Creator Fund and brand partnerships. Verified organic growth history.',
    price: 199.99,
    oldPrice: 299.99,
    rating: 4.5,
    reviewCount: 78,
    stock: 3,
    category: 'social-media',
    subcategory: 'TikTok',
    deliveryType: 'manual',
    platform: 'TikTok',
    region: 'USA',
    tags: ['hot', 'new'],
    image: '/placeholder.svg',
    specifications: { 'Followers': '50,000+', 'Likes': '500K+', 'Videos': '100+', 'Creator Fund': 'Eligible', 'Region': 'USA', 'Age': '1+ year' },
    guarantee: '48-hour replacement guarantee',
    features: ['Creator Fund eligible', 'Organic follower base', 'Full credentials', 'Transfer assistance'],
  },
  {
    id: '8',
    title: 'Adobe Creative Cloud — 1 Year',
    subtitle: 'Full suite access — all apps',
    description: 'Complete Adobe Creative Cloud subscription for one year. Access Photoshop, Illustrator, Premiere Pro, After Effects, and 20+ more creative apps.',
    price: 79.99,
    oldPrice: 119.99,
    rating: 4.7,
    reviewCount: 312,
    stock: 15,
    category: 'software',
    subcategory: 'Adobe CC',
    deliveryType: 'instant',
    platform: 'Adobe',
    region: 'Global',
    tags: ['best-seller'],
    image: '/placeholder.svg',
    specifications: { 'Apps': 'All 20+ Apps', 'Duration': '12 Months', 'Storage': '100GB Cloud', 'Updates': 'Included', 'Devices': '2 Computers', 'Fonts': 'Adobe Fonts' },
    guarantee: '30-day replacement guarantee',
    features: ['All Creative Cloud apps', '100GB storage', 'Adobe Fonts included', 'Regular updates'],
  },
  {
    id: '9',
    title: 'NordVPN — 2 Year Plan',
    subtitle: 'Complete online privacy solution',
    description: 'Two years of NordVPN premium protection. Access 5,500+ servers in 60 countries with military-grade encryption. Unblock geo-restricted content worldwide.',
    price: 34.99,
    oldPrice: 59.99,
    rating: 4.8,
    reviewCount: 678,
    stock: 100,
    category: 'software',
    subcategory: 'VPN',
    deliveryType: 'instant',
    platform: 'NordVPN',
    region: 'Global',
    tags: ['sale', 'best-seller'],
    image: '/placeholder.svg',
    specifications: { 'Duration': '2 Years', 'Servers': '5,500+', 'Countries': '60+', 'Devices': '6 Simultaneous', 'Protocol': 'NordLynx', 'Kill Switch': 'Yes' },
    guarantee: '30-day replacement guarantee',
    features: ['5,500+ servers', '6 simultaneous devices', 'No-logs policy', 'Threat protection'],
  },
  {
    id: '10',
    title: 'Discord Nitro — 12 Months',
    subtitle: 'Premium Discord experience',
    description: 'Full year of Discord Nitro with 100MB upload limit, HD streaming, animated avatars, custom emojis, 2 server boosts, and more premium features.',
    price: 49.99,
    oldPrice: 69.99,
    rating: 4.6,
    reviewCount: 234,
    stock: 25,
    category: 'premium',
    subcategory: 'Notion',
    deliveryType: 'instant',
    platform: 'Discord',
    region: 'Global',
    tags: ['new'],
    image: '/placeholder.svg',
    specifications: { 'Plan': 'Nitro Full', 'Duration': '12 Months', 'Upload': '100MB', 'Streaming': '1080p 60fps', 'Boosts': '2 Included', 'Emoji': 'Custom + Animated' },
    guarantee: '14-day replacement guarantee',
    features: ['HD video streaming', '100MB uploads', '2 server boosts', 'Custom profiles'],
  },
  {
    id: '11',
    title: 'Canva Pro — Lifetime Access',
    subtitle: 'Unlimited design tools forever',
    description: 'Lifetime access to Canva Pro with 100M+ templates, brand kit, background remover, content planner, and team collaboration features.',
    price: 39.99,
    rating: 4.9,
    reviewCount: 445,
    stock: 20,
    category: 'premium',
    subcategory: 'Canva Pro',
    deliveryType: 'instant',
    platform: 'Canva',
    region: 'Global',
    tags: ['best-seller', 'instant'],
    image: '/placeholder.svg',
    specifications: { 'Plan': 'Pro', 'Duration': 'Lifetime', 'Templates': '100M+', 'Storage': '1TB', 'Brand Kit': 'Yes', 'Background Remover': 'Yes' },
    guarantee: '30-day replacement guarantee',
    features: ['100M+ templates', '1TB storage', 'Background remover', 'Brand kit'],
  },
  {
    id: '12',
    title: 'Midjourney — 1 Month Standard',
    subtitle: 'AI image generation unlimited',
    description: 'One month of Midjourney Standard plan with unlimited generations, fast GPU time, and commercial usage rights. Create stunning AI art and visuals.',
    price: 22.99,
    oldPrice: 30.00,
    rating: 4.7,
    reviewCount: 167,
    stock: 18,
    category: 'ai-tools',
    subcategory: 'Midjourney',
    deliveryType: 'instant',
    platform: 'Midjourney',
    region: 'Global',
    tags: ['hot', 'new'],
    image: '/placeholder.svg',
    specifications: { 'Plan': 'Standard', 'Duration': '1 Month', 'Generations': 'Unlimited (Relax)', 'Fast GPU': '15 hrs/month', 'Commercial': 'Yes', 'Stealth': 'No' },
    guarantee: '7-day replacement guarantee',
    features: ['Unlimited relaxed generations', '15h fast GPU', 'Commercial rights', 'Private DMs'],
  },
];

export const reviews: Review[] = [
  { id: '1', productId: '1', author: 'Alex M.', avatar: 'A', rating: 5, date: '2024-12-15', text: 'Account delivered in 2 minutes. All credentials worked perfectly. Followers are real and engagement is great. Highly recommend!', verified: true },
  { id: '2', productId: '1', author: 'Sarah K.', avatar: 'S', rating: 5, date: '2024-12-10', text: 'Excellent quality account. The seller provided clear instructions for securing the account. Very smooth transaction.', verified: true },
  { id: '3', productId: '2', author: 'Mike R.', avatar: 'M', rating: 5, date: '2024-12-12', text: 'Insane value! Got so many premium games for a fraction of the price. Account was clean with no issues at all.', verified: true },
  { id: '4', productId: '3', author: 'David L.', avatar: 'D', rating: 4, date: '2024-12-08', text: 'Netflix has been working great for 3 months now. 4K quality is amazing. Only minor hiccup during setup but support helped quickly.', verified: true },
  { id: '5', productId: '4', author: 'Jenny W.', avatar: 'J', rating: 5, date: '2024-12-14', text: 'Key activated instantly. Windows 11 Pro running perfectly. Best deal I have found online. Will buy Office next.', verified: true },
  { id: '6', productId: '5', author: 'Tom H.', avatar: 'T', rating: 4, date: '2024-12-11', text: 'ChatGPT Plus access works great. GPT-4 is noticeably better. Quick delivery and good price compared to the official sub.', verified: true },
  { id: '7', productId: '6', author: 'Lisa P.', avatar: 'L', rating: 5, date: '2024-12-13', text: 'Spotify Premium working flawlessly. No ads, unlimited skips, offline mode — everything as promised. Great value!', verified: true },
  { id: '8', productId: '8', author: 'Chris B.', avatar: 'C', rating: 5, date: '2024-12-09', text: 'All Adobe apps working perfectly. Photoshop, Premiere, everything I needed. Saved hundreds compared to retail.', verified: true },
];

export const getProductsByCategory = (categoryId: string) => products.filter(p => p.category === categoryId);
export const getProductById = (id: string) => products.find(p => p.id === id);
export const getFeaturedProducts = () => products.filter(p => p.tags.includes('best-seller') || p.tags.includes('hot'));
export const getReviewsByProductId = (productId: string) => reviews.filter(r => r.productId === productId);
