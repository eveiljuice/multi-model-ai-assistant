# Новая Stripe интеграция с Supabase Secrets

## Обзор

Эта новая архитектура полностью переработана для использования Supabase Vault для безопасного хранения всех Stripe ключей и идентификаторов. Все конфиденциальные данные хранятся в Supabase и недоступны в клиентском коде.

## Архитектура

### 1. Конфигурация продуктов

- **Файл**: `src/config/stripe-products.ts`
- **Содержит**: Публичную конфигурацию продуктов (без секретных ключей)
- **Продукты**:
  - Monthly Subscription (prod_SdmRKnaMEM7FE7, price_1RiUt0AK7V4m73aluYckgD6P)
  - Small 100 Credits (prod_SdmU9mybV0ZUhw, price_1RiUvhAK7V4m73alSPDpllg2)
  - Medium 500 Credits (prod_SdmWCbIxv9eioK, price_1RiUxdAK7V4m73alz8Oad0YH)
  - XXL 1500 Credits (prod_SdmXQUfirQZKGf, price_1RiUyPAK7V4m73alBCuO8sYC)

### 2. Новый сервис

- **Файл**: `src/services/stripe.service.ts`
- **Функционал**: Вся логика работы со Stripe через Edge Functions
- **Безопасность**: Все ключи получаются из Supabase secrets

### 3. Edge Functions

- **stripe-checkout-v2**: Создание checkout сессий
- **stripe-webhook-v2**: Обработка webhook событий
- **stripe-public-key**: Получение публичного ключа
- **stripe-subscription-data**: Получение данных подписки
- **stripe-user-orders**: Получение истории заказов

## Настройка

### Шаг 1: Добавление секретов в Supabase

Добавьте следующие секреты в Supabase Vault:

```bash
# Через Supabase CLI
supabase secrets set stripe_public_key="pk_live_..."
supabase secrets set stripe_secret_key="sk_live_..."
supabase secrets set stripe_webhook_secret="whsec_..."

# Или через Supabase Dashboard
# Settings > Vault > Add secret
```

### Шаг 2: Применение миграций

Примените новую миграцию:

```bash
supabase db push
```

Это создаст:

- Таблицу `stripe_events` для идемпотентности webhook'ов
- Обновит существующие таблицы Stripe
- Создаст новые RLS политики
- Создаст представления для пользователей

### Шаг 3: Деплой Edge Functions

Разверните новые Edge Functions:

```bash
supabase functions deploy stripe-checkout-v2
supabase functions deploy stripe-webhook-v2
supabase functions deploy stripe-public-key
supabase functions deploy stripe-subscription-data
supabase functions deploy stripe-user-orders
```

### Шаг 4: Настройка Stripe Dashboard

1. **Webhook endpoint**: Создайте новый webhook endpoint в Stripe Dashboard

   - URL: `https://your-project.supabase.co/functions/v1/stripe-webhook-v2`
   - События: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`

2. **Продукты**: Убедитесь, что все продукты существуют в Stripe с правильными ID

## Структура данных

### Таблицы

#### stripe_customers

```sql
CREATE TABLE stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  customer_id TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### stripe_subscriptions

```sql
CREATE TABLE stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  price_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### stripe_orders

```sql
CREATE TABLE stripe_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id TEXT NOT NULL,
  payment_intent_id TEXT,
  customer_id TEXT NOT NULL,
  amount_subtotal INTEGER,
  amount_total INTEGER,
  currency TEXT,
  payment_status TEXT,
  status TEXT DEFAULT 'pending',
  credits_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### stripe_events

```sql
CREATE TABLE stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Использование в коде

### Получение продуктов

```typescript
import {
  STRIPE_PRODUCTS,
  getSubscriptionProducts,
  getTopupProducts,
} from "../config/stripe-products";

// Получить все продукты
const allProducts = STRIPE_PRODUCTS;

// Получить только подписки
const subscriptions = getSubscriptionProducts();

// Получить только разовые покупки
const topups = getTopupProducts();
```

### Создание checkout сессии

```typescript
import { stripeService } from "../services/stripe.service";

// Создать сессию
const response = await stripeService.createCheckoutSession(
  "price_1RiUt0AK7V4m73aluYckgD6P",
  "subscription"
);

// Перенаправить на checkout
await stripeService.redirectToCheckout(
  "price_1RiUt0AK7V4m73aluYckgD6P",
  "subscription"
);
```

### Получение данных пользователя

```typescript
// Получить данные подписки
const subscription = await stripeService.getSubscriptionData();

// Получить историю заказов
const orders = await stripeService.getUserOrders();
```

## Безопасность

### Что хранится в Supabase secrets:

- `stripe_public_key` - Публичный ключ Stripe
- `stripe_secret_key` - Секретный ключ Stripe
- `stripe_webhook_secret` - Секрет для валидации webhook'ов

### Что НЕ хранится в клиентском коде:

- Секретные ключи
- Webhook secrets
- Конфиденциальные данные пользователей

### RLS (Row Level Security):

- Пользователи могут видеть только свои данные
- Service role имеет полный доступ для обработки webhook'ов
- Все таблицы защищены RLS политиками

## Мониторинг и отладка

### Логи Edge Functions

```bash
# Просмотр логов
supabase functions logs stripe-checkout-v2
supabase functions logs stripe-webhook-v2
```

### Проверка webhook'ов

```bash
# Тест webhook'а
curl -X POST https://your-project.supabase.co/functions/v1/stripe-webhook-v2 \
  -H "stripe-signature: your-signature" \
  -d "test-payload"
```

### Очистка старых событий

```sql
-- Запуск функции очистки
SELECT cleanup_old_stripe_events();
```

## Миграция с старой версии

1. Убедитесь, что все активные транзакции завершены
2. Примените новую миграцию
3. Добавьте секреты в Supabase Vault
4. Разверните новые Edge Functions
5. Обновите webhook URL в Stripe Dashboard
6. Протестируйте новую интеграцию

## Поддержка

При возникновении проблем:

1. Проверьте логи Edge Functions
2. Убедитесь, что все секреты добавлены в Supabase Vault
3. Проверьте настройки webhook'ов в Stripe Dashboard
4. Проверьте RLS политики в Supabase
