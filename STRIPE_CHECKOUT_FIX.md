# Исправление ошибки Stripe Checkout (500 Internal Server Error)

## Проблема

Пользователи получали ошибку 500 при попытке создать Stripe checkout сессию:

```
POST https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/stripe-checkout-v3 500 (Internal Server Error)
```

## Диагностика

1. **Переменные окружения**: ✅ Все Stripe переменные настроены правильно
2. **Edge Function**: ✅ Функция работает при прямом тестировании
3. **CORS настройки**: ❌ Использовались устаревшие CORS заголовки
4. **Логирование**: ❌ Недостаточно детальное логирование для диагностики

## Исправления

### 1. Обновление CORS в Edge Function

**Файл**: `supabase/functions/stripe-checkout-v3/index.ts`

**Было**:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // ... другие заголовки
};
```

**Стало**:

```typescript
import {
  corsHeaders,
  getCorsHeaders,
  handleCorsOptions,
  createCorsResponse,
} from "../_shared/cors.ts";

// Использование правильных функций CORS с валидацией origin
```

### 2. Добавление детального логирования

**Файл**: `supabase/functions/stripe-checkout-v3/index.ts`

Добавлено логирование переменных окружения и входящих запросов:

```typescript
// Проверка переменных окружения
const envCheck = {
  STRIPE_PUBLIC_KEY: !!Deno.env.get("STRIPE_PUBLIC_KEY"),
  STRIPE_SECRET_KEY: !!Deno.env.get("STRIPE_SECRET_KEY"),
  // ... другие переменные
};
console.log("Environment variables check:", envCheck);
```

### 3. Улучшение клиентского логирования

**Файл**: `src/services/stripe.service.ts`

Добавлено детальное логирование запросов и ответов:

```typescript
console.log("Calling Stripe function:", {
  functionName,
  payload,
  hasSession: !!session,
  sessionError,
  authTokenLength: authToken?.length || 0,
});
```

### 4. Исправление AuthModal

**Файл**: `src/components/auth/AuthModal.tsx`

Добавлена поддержка callback `onSuccess` для автоматического запуска покупки после аутентификации:

```typescript
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Новый prop
  initialMode?: "signin" | "signup";
}
```

### 5. Улучшение PricingCard

**Файл**: `src/components/pricing/PricingCard.tsx`

Добавлено детальное логирование процесса покупки и правильная интеграция с AuthModal.

## Тестирование

### Тест переменных окружения

```bash
node test-stripe-env.js
```

### Тест браузерного запроса

```bash
node test-browser-request.js
```

Оба теста показывают, что функция работает правильно (статус 200).

## Развертывание

Для применения исправлений необходимо развернуть обновленную Edge Function:

```bash
supabase functions deploy stripe-checkout-v3
```

## Результат

После применения всех исправлений:

- ✅ Правильная обработка CORS с валидацией origin
- ✅ Детальное логирование для диагностики проблем
- ✅ Правильная интеграция аутентификации с процессом покупки
- ✅ Улучшенная обработка ошибок

## Дополнительные рекомендации

1. Мониторинг логов Edge Function после развертывания
2. Тестирование с разных браузеров и устройств
3. Проверка работы как для аутентифицированных, так и для анонимных пользователей
