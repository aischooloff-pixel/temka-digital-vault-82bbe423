import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const legalPages: Record<string, { title: string; content: string[] }> = {
  terms: {
    title: 'Terms of Service',
    content: [
      'Welcome to TEMKA.STORE. By accessing or using our platform, you agree to be bound by these Terms of Service.',
      '1. Account Registration — You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials.',
      '2. Products & Services — All digital products are sold as-is. Product descriptions are provided for informational purposes. We verify all products before listing but cannot guarantee compatibility with all use cases.',
      '3. Payments — All prices are in USD. Payment is required before product delivery. We accept credit cards, cryptocurrency, PayPal, and other methods as displayed at checkout.',
      '4. Delivery — Instant delivery products are delivered automatically after payment confirmation. Manual delivery products are processed within 1-24 hours.',
      '5. Prohibited Use — You may not use our products for illegal activities, spam, harassment, or any activity that violates the terms of service of the respective platforms.',
      '6. Intellectual Property — All content on TEMKA.STORE, including logos, text, and design, is our intellectual property and may not be reproduced without permission.',
      '7. Limitation of Liability — TEMKA.STORE is not liable for any indirect, incidental, or consequential damages arising from the use of our products or services.',
      '8. Changes to Terms — We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of updated terms.',
      'Last updated: December 2024',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    content: [
      'TEMKA.STORE is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information.',
      '1. Information We Collect — We collect information you provide directly, such as email address, payment details, and contact information. We also collect usage data and analytics.',
      '2. How We Use Information — Your information is used to process orders, provide customer support, improve our services, and send relevant communications.',
      '3. Data Security — We implement industry-standard security measures including SSL encryption, secure payment processing, and access controls to protect your data.',
      '4. Third-Party Services — We use trusted third-party services for payment processing and analytics. These services have their own privacy policies.',
      '5. Cookies — We use cookies to improve your browsing experience and analyze site traffic. You can control cookie settings in your browser.',
      '6. Your Rights — You have the right to access, correct, or delete your personal data. Contact us at support@temka.store to exercise these rights.',
      '7. Data Retention — We retain your data for as long as your account is active or as needed to provide services and comply with legal obligations.',
      'Last updated: December 2024',
    ],
  },
  refund: {
    title: 'Refund Policy',
    content: [
      'At TEMKA.STORE, we stand behind the quality of our products. This policy outlines our refund and replacement procedures.',
      '1. Guarantee Period — Each product has a specific guarantee period listed on its product page. This period starts from the moment of delivery.',
      '2. Eligible Refunds — Refunds are available when: the product does not match the description, the product is non-functional at delivery, or credentials are invalid.',
      '3. Replacement Priority — We prioritize replacements over refunds. If a replacement is available, it will be offered first.',
      '4. Non-Refundable Cases — Refunds are not available for: products banned due to user actions, products used beyond their intended purpose, or requests made after the guarantee period.',
      '5. Refund Process — To request a refund, contact support with your order ID and a description of the issue. Refunds are processed within 24-48 hours after approval.',
      '6. Partial Refunds — In some cases, partial refunds may be offered if the product was partially delivered or partially functional.',
      'For any questions about refunds, contact support@temka.store.',
      'Last updated: December 2024',
    ],
  },
};

const LegalPage = ({ type }: { type: 'terms' | 'privacy' | 'refund' }) => {
  const page = legalPages[type];

  return (
    <div className="container-main mx-auto px-4 py-8 max-w-3xl">
      <h1 className="font-display text-3xl font-bold mb-8">{page.title}</h1>
      <div className="space-y-4">
        {page.content.map((p, i) => (
          <p key={i} className="text-muted-foreground leading-relaxed text-sm">{p}</p>
        ))}
      </div>
      <div className="mt-8 pt-6 border-t border-border/30 text-center">
        <p className="text-sm text-muted-foreground">Questions? <Link to="/support" className="text-primary hover:underline">Contact Support</Link></p>
      </div>
    </div>
  );
};

export const Terms = () => <LegalPage type="terms" />;
export const Privacy = () => <LegalPage type="privacy" />;
export const Refund = () => <LegalPage type="refund" />;
