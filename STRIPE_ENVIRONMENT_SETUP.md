# Настройка Stripe Environment Variables

## Проблема

Новые edge functions не могут получить доступ к Stripe API, потому что секретные ключи не настроены в environment variables проекта.

## Решение

### 1. Получите ваши Stripe ключи

1. Перейдите в [Stripe Dashboard](https://dashboard.stripe.com/)
2. Перейдите в раздел **Developers** → **API Keys**
3. Скопируйте:
   - **Publishable key** (начинается с `pk_`)
   - **Secret key** (начинается с `sk_`)

### 2. Настройте Webhook Secret

1. В Stripe Dashboard перейдите в **Developers** → **Webhooks**
2. Найдите ваш webhook endpoint или создайте новый
3. Скопируйте **Signing secret** (начинается с `whsec_`)

### 3. Добавьте environment variables в Supabase

1. Перейдите в [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Settings** → **Edge Functions**
4. В разделе **Environment variables** добавьте:

```
STRIPE_SECRET_KEY=sk_test_... (или sk_live_...)
STRIPE_PUBLIC_KEY=pk_test_... (или pk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4. Перезапустите edge functions

После добавления environment variables, функции автоматически перезапустятся и получат доступ к новым переменным.

## Проверка

После настройки попробуйте снова запустить покупку в приложении. Функция `stripe-checkout-direct` должна работать корректно.

## Альтернативное решение

Если не хотите настраивать environment variables сейчас, можете временно использовать старые edge functions:

1. Откройте `src/services/stripe.service.ts`
2. Измените вызов функции с `stripe-checkout-direct` на `stripe-checkout-v3`
3. Убедитесь, что старые функции еще работают

## Логи для отладки

Если проблемы продолжаются, проверьте логи:

- Supabase Dashboard → Edge Functions → Logs
- Ищите ошибки связанные с отсутствующими environment variables
