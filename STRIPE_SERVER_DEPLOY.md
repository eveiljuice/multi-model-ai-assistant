# Express Stripe Server Deployment Guide

Этот Express сервер должен быть задеплоен отдельно для обработки Stripe платежей.

## Варианты деплоя

### 1. Render.com (Рекомендуется - бесплатно)

1. Зайдите на [render.com](https://render.com) и создайте аккаунт
2. Подключите ваш GitHub репозиторий
3. Создайте новый Web Service со следующими настройками:
   - **Repository**: ваш GitHub репозиторий
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment**: Node
   - **Plan**: Free

4. Добавьте Environment Variables:
   ```
   PORT=10000
   NODE_ENV=production
   STRIPE_SECRET_KEY=sk_live_... (ваш Stripe secret key)
   STRIPE_WEBHOOK_SECRET=whsec_... (ваш webhook secret)
   FRONTEND_URL=https://multi-model-ai-assistant.netlify.app
   ```

5. Сохраните URL вашего деплоя (например: `https://your-app.onrender.com`)

### 2. Railway.app (Альтернатива)

1. Зайдите на [railway.app](https://railway.app)
2. Подключите GitHub репозиторий
3. Выберите папку `server` как root directory
4. Добавьте те же environment variables

### 3. Heroku (Платный)

1. Установите Heroku CLI
2. Создайте новое приложение:
   ```bash
   heroku create your-stripe-server
   ```
3. Добавьте environment variables через Heroku dashboard

## Настройка Frontend

После деплоя сервера обновите переменную окружения в Netlify:

1. Зайдите в Netlify Dashboard → Site Settings → Environment Variables
2. Добавьте:
   ```
   VITE_STRIPE_SERVER_URL=https://your-deployed-server.onrender.com
   ```

## Тестирование

1. Откройте `https://your-deployed-server.onrender.com/health`
2. Должен вернуться JSON со статусом OK
3. Проверьте что Stripe configured: true

## Настройка Webhook

1. В Stripe Dashboard → Webhooks добавьте endpoint:
   ```
   https://your-deployed-server.onrender.com/api/stripe/webhook
   ```
2. Выберите события:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## Мониторинг

Сервер включает:
- Health check на `/health`
- Логирование всех операций
- Telegram уведомления о платежах
- CORS настройки для вашего frontend

URL для проверки: `https://your-server.onrender.com/health`