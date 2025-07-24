# 🎯 Исправление Content Security Policy для Stripe

## ❌ Проблема
Content Security Policy блокировал подключения к `localhost:3002`:
```
Refused to connect to 'http://localhost:3002/api/stripe/create-checkout-session' because it violates the following Content Security Policy directive: "connect-src..."
```

## ✅ Решение
Добавлен `http://localhost:3002` в CSP директиву `connect-src` в `vite.config.ts`:

### До:
```javascript
"connect-src 'self' https://sgzlhcagtesjazvwskjw.supabase.co https://api.stripe.com..."
```

### После:
```javascript
"connect-src 'self' http://localhost:3002 https://sgzlhcagtesjazvwskjw.supabase.co https://api.stripe.com..."
```

## 🚀 Перезапуск для применения изменений

⚠️ **ВАЖНО**: После изменения `vite.config.ts` необходимо перезапустить Vite сервер:

1. **Остановите** текущий Vite процесс (`Ctrl+C`)
2. **Перезапустите** сервер:
   ```powershell
   npm run dev
   ```

## 🎯 Ожидаемый результат

После перезапуска при попытке покупки должно появиться:
- ✅ "🌐 Using API URL: http://localhost:3002/..."
- ✅ "✅ Checkout session created via Express server"
- ✅ Перенаправление на Stripe checkout страницу

Больше **НЕ должно быть** ошибок CSP!

## 🔧 Проверка работы

1. Убедитесь, что Express сервер запущен:
   ```powershell
   cd server
   node server.js
   ```

2. В новом окне запустите фронтенд:
   ```powershell  
   npm run dev
   ```

3. Попробуйте купить любой пакет

## ✅ Готово!
Stripe интеграция теперь должна работать полностью!