# 🚀 Credit Wallet System - Deployment Guide

Полное руководство по развертыванию системы кредитов в вашем проекте.

## 📋 Предварительные требования

1. **Supabase проект** - создайте на [supabase.com](https://supabase.com)
2. **Stripe аккаунт** - зарегистрируйтесь на [stripe.com](https://stripe.com)
3. **Supabase CLI** - установите локально:
   ```bash
   npm install supabase --global
   ```

## 🗄️ Шаг 1: Настройка базы данных

### 1.1 Связывание с проектом

```bash
# Замените YOUR_PROJECT_ID на ID вашего Supabase проекта
supabase link --project-ref YOUR_PROJECT_ID
```

### 1.2 Применение миграций

```bash
# Примените все миграции к базе данных
supabase db push
```

Это создаст следующие таблицы:

- `credits` - баланс кредитов пользователей
- `credit_transactions` - история транзакций
- `agent_pricing` - стоимость использования агентов
- `user_activity` - активность для Smart Streaks
- `referral_codes` - реферальные коды

## 💳 Шаг 2: Настройка Stripe

### 2.1 Создание продуктов

В вашем [Stripe Dashboard](https://dashboard.stripe.com) создайте:

**Подписка ($9.99/месяц):**

- Product: "Monthly Subscription"
- Price: $9.99 USD, recurring monthly
- Metadata: `credits: 250`

**Пополнения (одноразовые):**

- $4.99 → 100 кредитов (Metadata: `credits: 100`)
- $19.99 → 500 кредитов (Metadata: `credits: 500`)
- $49.99 → 1500 кредитов (Metadata: `credits: 1500`)

### 2.2 Настройка Webhook

1. Перейдите в `Developers` → `Webhooks`
2. Создайте новый endpoint:

   - **URL**: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook`
   - **Events**:
     - `checkout.session.completed`
     - `invoice.payment_failed`
     - `customer.subscription.updated`

3. Скопируйте **Signing secret** (понадобится для настройки)

## 🔧 Шаг 3: Настройка Edge Functions

### 3.1 Установка секретов

```bash
# Stripe секреты (получите в Stripe Dashboard → Developers → API keys)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...

# Секрет для защиты cron job
supabase secrets set SUPABASE_CRON_SECRET=your_strong_random_secret_here

# Service role key (получите в Supabase Dashboard → Settings → API)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 3.2 Развертывание функций

```bash
# Разверните все Edge Functions
supabase functions deploy
```

Это развернет:

- `credit-meter` - атомарное списание кредитов
- `rollover-cron` - ежемесячный ролловер
- `stripe-webhook` - обработка платежей Stripe

## ⏰ Шаг 4: Настройка Cron Job

### 4.1 В Supabase Dashboard

1. Перейдите в `Database` → `Cron Jobs`
2. Создайте новую задачу:
   - **Name**: `Monthly Credit Rollover`
   - **Schedule**: `0 0 1 * *` (1-го числа каждого месяца в 00:00)
   - **Command**:
     ```sql
     SELECT net.http_post(
       url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/rollover-cron',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer YOUR_SUPABASE_CRON_SECRET'
       ),
       body := jsonb_build_object()
     );
     ```

## 🎯 Шаг 5: Локальная настройка

### 5.1 Переменные окружения

Создайте файл `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 5.2 Установка и запуск

```bash
# Установите зависимости
npm install

# Запустите проект
npm run dev
```

## ✅ Шаг 6: Тестирование

### 6.1 Тест новых пользователей

1. Зарегистрируйте нового пользователя
2. Проверьте, что получил 5 пробных кредитов
3. Используйте агента для списания кредитов

### 6.2 Тест платежей

1. Сделайте тестовую покупку через Stripe
2. Проверьте, что кредиты добавились в баланс
3. Проверьте транзакции в базе данных

### 6.3 Тест ролловера

Вручную запустите функцию ролловера:

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/rollover-cron \
  -H "Authorization: Bearer YOUR_SUPABASE_CRON_SECRET" \
  -H "Content-Type: application/json"
```

## 🔍 Мониторинг

### Логи Edge Functions

```bash
# Просмотр логов всех функций
supabase functions logs

# Логи конкретной функции
supabase functions logs credit-meter
```

### Проверка состояния системы

В Supabase Dashboard → `Database` → `SQL Editor`:

```sql
-- Общая статистика кредитов
SELECT
  COUNT(*) as total_users,
  SUM(balance) as total_credits,
  AVG(balance) as avg_balance
FROM credits;

-- Активность транзакций за последний день
SELECT
  type,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM credit_transactions
WHERE created_at >= NOW() - INTERVAL '1 day'
GROUP BY type;
```

## 🚨 Возможные проблемы

### Проблема: Edge Function не разворачивается

**Решение**: Проверьте права доступа и правильность PROJECT_ID

```bash
supabase projects list
supabase link --project-ref CORRECT_PROJECT_ID
```

### Проблема: Webhook не получает события

**Решение**:

1. Проверьте URL webhook в Stripe
2. Убедитесь, что STRIPE_WEBHOOK_SIGNING_SECRET правильный
3. Проверьте логи: `supabase functions logs stripe-webhook`

### Проблема: Cron Job не работает

**Решение**:

1. Проверьте синтаксис cron выражения
2. Убедитесь, что SUPABASE_CRON_SECRET установлен
3. Проверьте логи в Database → Cron Jobs

## 🎉 Готово!

Ваша система кредитов полностью настроена! Теперь:

- ✅ Новые пользователи получают 5 пробных кредитов
- ✅ Платежи через Stripe автоматически добавляют кредиты
- ✅ Использование агентов списывает кредиты атомарно
- ✅ Ежемесячный ролловер работает автоматически
- ✅ Smart Streaks поощряют активных пользователей

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи Edge Functions
2. Проверьте таблицы в Supabase Dashboard
3. Убедитесь, что все секреты установлены правильно
4. Проверьте настройки Stripe Webhook
