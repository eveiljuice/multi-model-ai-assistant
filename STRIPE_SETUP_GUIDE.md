# Настройка Stripe для Разработки

## Исправленные проблемы

1. **Исправлена ошибка в `stripe.service.ts`**: Заменен несуществующий `this.stripePublicKey` на правильный `this.getPublicKey()`
2. **Переход на Supabase Edge Functions**: Убран конфликт между Express сервером и Edge Functions
3. **Безопасность**: Добавлен пример с test ключами вместо live ключей

## Настройка переменных окружения

### 1. Локальные переменные окружения (.env)

```bash
# Используйте TEST ключи для разработки
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_test_public_key
```

### 2. Настройка Supabase Edge Functions

Установите переменные окружения для Edge Functions:

```bash
# Stripe переменные для Edge Functions
npx supabase secrets set STRIPE_PUBLIC_KEY=pk_test_your_stripe_test_public_key
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_your_stripe_test_secret_key  
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Supabase переменные
npx supabase secrets set SUPABASE_URL=your_supabase_url
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
npx supabase secrets set SUPABASE_ANON_KEY=your_anon_key
```

### 3. Развертывание Edge Functions

```bash
npx supabase functions deploy stripe-checkout-v4
npx supabase functions deploy stripe-cancel-subscription
```

## Тестирование

1. Запустите приложение:
```bash
npm run dev
```

2. Попробуйте создать checkout сессию через UI

3. Проверьте логи Edge Functions в Supabase Dashboard

## Что изменено в коде

### `src/services/stripe.service.ts`
- Исправлена ошибка `getPublicKey()` метода  
- Переход с Express API на Supabase Edge Functions
- Правильная обработка ответов от Edge Functions
- Добавлена аутентификация для всех Stripe операций

### Удален конфликт архитектуры
- Теперь используются только Supabase Edge Functions
- Express сервер больше не требуется для Stripe интеграции  
- Vite proxy для Stripe больше не используется

## Структура после исправлений

```
Frontend (stripe.service.ts)
    ↓
Supabase Edge Functions
    ↓  
Stripe API
```

Простая и надежная архитектура без дублирования функциональности.