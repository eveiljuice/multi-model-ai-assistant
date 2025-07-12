export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  mode: 'payment' | 'subscription';
  credits?: number;
  features?: string[];
  popular?: boolean;
}

export const STRIPE_PRODUCTS: StripeProduct[] = [
  {
    id: 'prod_SdmXQUfirQZKGf',
    priceId: 'price_1RiUyPAK7V4m73alBCuO8sYC',
    name: '1500 Credits Top-up',
    description: 'Large credit pack for heavy users',
    price: 49.99,
    mode: 'payment',
    credits: 1500,
    features: [
      '1500 credits instantly',
      'Best value per credit',
      'Credits never expire',
      'Use with any agent'
    ]
  },
  {
    id: 'prod_SdmWCbIxv9eioK',
    priceId: 'price_1RiUxdAK7V4m73alz8Oad0YH',
    name: '500 Credits Top-up',
    description: 'Medium credit pack for regular users',
    price: 19.99,
    mode: 'payment',
    credits: 500,
    features: [
      '500 credits instantly',
      'Great value',
      'Credits never expire',
      'Use with any agent'
    ]
  },
  {
    id: 'prod_SdmU9mybV0ZUhw',
    priceId: 'price_1RiUvhAK7V4m73alSPDpllg2',
    name: '100 Credits Top-up',
    description: 'Small credit pack for light users',
    price: 4.99,
    mode: 'payment',
    credits: 100,
    features: [
      '100 credits instantly',
      'Perfect for trying out',
      'Credits never expire',
      'Use with any agent'
    ]
  },
  {
    id: 'prod_SdmRKnaMEM7FE7',
    priceId: 'price_1RiUt0AK7V4m73aluYckgD6P',
    name: 'Donein5 Credits',
    description: 'Monthly subscription with recurring credits',
    price: 9.99,
    mode: 'subscription',
    credits: 250,
    popular: true,
    features: [
      '250 credits every month',
      '30% credit rollover',
      'Priority support',
      'Cancel anytime'
    ]
  }
];

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return STRIPE_PRODUCTS.find(product => product.priceId === priceId);
};

export const getProductById = (id: string): StripeProduct | undefined => {
  return STRIPE_PRODUCTS.find(product => product.id === id);
};

export const getTopUpProducts = (): StripeProduct[] => {
  return STRIPE_PRODUCTS.filter(product => product.mode === 'payment');
};

export const getSubscriptionProducts = (): StripeProduct[] => {
  return STRIPE_PRODUCTS.filter(product => product.mode === 'subscription');
};