export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  priceId: string;
  productId: string;
  credits: number;
  mode: 'subscription' | 'payment';
  currency: string;
  amount: number;
  interval?: 'month' | 'year';
  features: string[];
  popular?: boolean;
  badge?: string;
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'monthly-subscription',
    name: 'Monthly Subscription',
    description: 'Unlimited AI assistance with monthly billing',
    priceId: 'price_1RiUt0AK7V4m73aluYckgD6P',
    productId: 'prod_SdmRKnaMEM7FE7',
    credits: 250,
    mode: 'subscription',
    currency: 'usd',
    amount: 1900,
    interval: 'month',
    features: [
      '250 credits per month',
      'Access to all AI models',
      'Priority support',
      'Monthly rollover of unused credits'
    ],
    popular: true,
    badge: 'Most Popular'
  },
  {
    id: 'small-topup',
    name: 'Small Credits',
    description: 'Perfect for light usage',
    priceId: 'price_1RiUvhAK7V4m73alSPDpllg2',
    productId: 'prod_SdmU9mybV0ZUhw',
    credits: 100,
    mode: 'payment',
    currency: 'usd',
    amount: 990,
    features: [
      '100 credits one-time',
      'No expiration',
      'Perfect for trying out'
    ]
  },
  {
    id: 'medium-topup',
    name: 'Medium Credits',
    description: 'Great value for regular users',
    priceId: 'price_1RiUxdAK7V4m73alz8Oad0YH',
    productId: 'prod_SdmWCbIxv9eioK',
    credits: 500,
    mode: 'payment',
    currency: 'usd',
    amount: 3990,
    features: [
      '500 credits one-time',
      'No expiration',
      'Best value per credit'
    ]
  },
  {
    id: 'xxl-topup',
    name: 'XXL Credits',
    description: 'Maximum credits for power users',
    priceId: 'price_1RiUyPAK7V4m73alBCuO8sYC',
    productId: 'prod_SdmXQUfirQZKGf',
    credits: 1500,
    mode: 'payment',
    currency: 'usd',
    amount: 9990,
    features: [
      '1500 credits one-time',
      'No expiration',
      'Maximum value'
    ]
  }
];

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return STRIPE_PRODUCTS.find(product => product.priceId === priceId);
}

export function getProductById(id: string): StripeProduct | undefined {
  return STRIPE_PRODUCTS.find(product => product.id === id);
}

export function getSubscriptionProducts(): StripeProduct[] {
  return STRIPE_PRODUCTS.filter(product => product.mode === 'subscription');
}

export function getTopupProducts(): StripeProduct[] {
  return STRIPE_PRODUCTS.filter(product => product.mode === 'payment');
} 