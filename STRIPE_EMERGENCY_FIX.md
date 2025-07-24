# 🚨 Экстренное исправление Stripe

## Проблема
Edge Function возвращает ошибку "invalid session token", что блокирует процесс покупки.

## ✅ Временное решение (применено)

1. **Исправлен fallback механизм** в `src/services/stripe.service.ts`
2. **Добавлено подробное логирование** для диагностики
3. **Временно отключена Edge Function** - используется прямое подключение к Express серверу

## 🚀 Быстрый запуск

### Шаг 1: Запустить Express сервер
```bash
cd server
npm install  # если еще не установлены зависимости
node server.js
```

Сервер должен запуститься на порту 3002 и показать:
```
🚀 Stripe server running on port 3002
📊 Health check: http://localhost:3002/health
🔑 Stripe key configured: true
```

### Шаг 2: Запустить фронтенд
```bash
npm run dev
```

### Шаг 3: Протестировать
1. Откройте приложение в браузере
2. Перейдите на страницу Pricing  
3. Попробуйте купить любой пакет
4. В консоли должно появиться: "⚠️ Using Express server fallback"

## 🔧 Что исправлено

### `src/services/stripe.service.ts`
- ✅ Исправлена ошибка `this.stripePublicKey`
- ✅ Добавлен fallback механизм  
- ✅ Улучшена обработка ошибок аутентификации
- ✅ Временно отключена проблемная Edge Function

### Архитектура
- ✅ Express сервер работает на порту 3002
- ✅ Vite proxy настроен правильно
- ✅ Fallback логика работает автоматически

## 🐛 Известные проблемы

### Edge Function
- ❌ Проблема с токенами аутентификации 
- ❌ Нужна настройка Supabase secrets
- ❌ Требует дополнительную отладку

### Решение Edge Function (для продакшена)
```bash
# 1. Настроить переменные окружения в Supabase
npx supabase secrets set STRIPE_PUBLIC_KEY=pk_test_...
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
npx supabase secrets set SUPABASE_URL=your_url
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key

# 2. Развернуть функцию
npx supabase functions deploy stripe-checkout-v4

# 3. Включить обратно в коде
# В stripe.service.ts раскомментировать оригинальную логику
```

## 📊 Мониторинг

Проверьте логи в браузере:
- ✅ "📤 Sending request to create checkout session"
- ✅ "⚠️ Using Express server fallback"  
- ✅ "✅ Checkout session created via Express server"

Если видите эти сообщения - всё работает правильно!

## 🎯 Результат

Теперь система Stripe должна работать через Express сервер как fallback, пока не будет исправлена Edge Function.