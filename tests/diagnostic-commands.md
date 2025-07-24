# 🔧 Диагностические команды для API

Набор команд для тестирования и диагностики проблем с API интеграциями.

## 🧪 Тестирование Supabase

### Проверка подключения к базе данных

```bash
# Проверить статус проекта
curl -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
     -H "apikey: YOUR_SUPABASE_ANON_KEY" \
     https://sgzlhcagtesjazvwskjw.supabase.co/rest/v1/

# Проверить доступные таблицы
curl -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
     -H "apikey: YOUR_SUPABASE_ANON_KEY" \
     https://sgzlhcagtesjazvwskjw.supabase.co/rest/v1/users?select=count
```

### Тест Edge Functions

```bash
# Проверить доступность всех Edge Functions
curl -X OPTIONS https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/ai-proxy
curl -X OPTIONS https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/stripe-checkout
curl -X OPTIONS https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/telegram-notify
curl -X OPTIONS https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/credit-meter
curl -X OPTIONS https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/rollover-cron
curl -X OPTIONS https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/webhook-handler
```

## 🤖 Тестирование AI Providers

### OpenAI API Test

```bash
# Тест OpenAI API напрямую
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4.1-turbo",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
  }'
```

### Anthropic API Test

```bash
# Тест Anthropic API напрямую
curl -X POST https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 50,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Google Gemini API Test

```bash
# Тест Google Gemini API напрямую
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Hello"}]
    }]
  }'
```

### AI Proxy через Supabase

```bash
# Тест AI Proxy с аутентификацией
curl -X POST https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/ai-proxy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "provider": "openai",
    "model": "gpt-4.1-turbo",
    "messages": [{"role": "user", "content": "Test message"}],
    "temperature": 0.7,
    "max_tokens": 100
  }'
```

## 💳 Тестирование Stripe

### Проверка Stripe API Key

```bash
# Проверить валидность Stripe API key
curl -u "YOUR_STRIPE_SECRET_KEY:" https://api.stripe.com/v1/balance
```

### Тест создания Checkout Session

```bash
# Создать checkout session напрямую через Stripe
curl -X POST https://api.stripe.com/v1/checkout/sessions \
  -u "YOUR_STRIPE_SECRET_KEY:" \
  -d "payment_method_types[]=card" \
  -d "line_items[0][price]=price_1RiUvhAK7V4m73alSPDpllg2" \
  -d "line_items[0][quantity]=1" \
  -d "mode=payment" \
  -d "success_url=https://example.com/success" \
  -d "cancel_url=https://example.com/cancel"
```

### Тест Stripe Checkout через Supabase

```bash
# Создать checkout session через Edge Function
curl -X POST https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/stripe-checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "price_id": "price_1RiUvhAK7V4m73alSPDpllg2",
    "mode": "payment",
    "success_url": "https://example.com/success",
    "cancel_url": "https://example.com/cancel"
  }'
```

### Тест Stripe Webhook

```bash
# Тест webhook endpoint (должен отклонить без подписи)
curl -X POST https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: invalid_signature" \
  -d '{
    "id": "evt_test",
    "type": "checkout.session.completed",
    "data": {"object": {"id": "cs_test", "mode": "payment"}}
  }'
```

## 📱 Тестирование Telegram

### Проверка Telegram Bot

```bash
# Проверить информацию о боте
curl "https://api.telegram.org/bot7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA/getMe"

# Получить обновления
curl "https://api.telegram.org/bot7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA/getUpdates"
```

### Отправка тестового сообщения

```bash
# Отправить сообщение напрямую
curl -X POST "https://api.telegram.org/bot7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "-1002604809855",
    "text": "🧪 Тест API интеграции",
    "parse_mode": "HTML"
  }'
```

### Тест Telegram Notify через Supabase

```bash
# Отправить уведомление через Edge Function
curl -X POST https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/telegram-notify \
  -H "Content-Type: application/json" \
  -d '{
    "record": {
      "id": "test-123",
      "title": "Test API Notification",
      "description": "Test notification from API",
      "category": "test",
      "priority": "medium",
      "created_at": "2025-01-17T12:00:00Z"
    }
  }'
```

## 💰 Тестирование Credit System

### Проверка Credit Meter

```bash
# Проверить баланс кредитов
curl -X POST https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/credit-meter \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "action": "check_balance"
  }'
```

### Тест списания кредитов

```bash
# Списать кредиты
curl -X POST https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/credit-meter \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "agent_id": "test-agent",
    "session_id": "test-session-123",
    "user_message": "Test message",
    "credits_to_deduct": 1
  }'
```

## 🔍 Диагностика проблем

### Получение логов Edge Functions

```bash
# Через Supabase CLI
supabase functions logs ai-proxy
supabase functions logs stripe-checkout
supabase functions logs telegram-notify
supabase functions logs credit-meter
```

### Проверка RLS политик

```sql
-- Подключиться к базе данных и выполнить:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Проверить конкретную таблицу
SELECT * FROM pg_policies WHERE tablename = 'users';
SELECT * FROM pg_policies WHERE tablename = 'credit_wallets';
```

### Проверка миграций

```bash
# Проверить статус миграций
supabase migration list

# Применить миграции
supabase db push

# Сброс базы данных (ОСТОРОЖНО!)
supabase db reset
```

### Проверка Secrets

```bash
# Проверить настроенные secrets
supabase secrets list

# Установить secrets
supabase secrets set OPENAI_API_KEY="sk-..."
supabase secrets set ANTHROPIC_API_KEY="sk-ant-..."
supabase secrets set GEMINI_API_KEY="..."
supabase secrets set STRIPE_SECRET_KEY="sk_test_..."
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
supabase secrets set TELEGRAM_BOT_TOKEN="7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA"
supabase secrets set TELEGRAM_CHAT_ID="-1002604809855"
```

## 🧪 Пакетные тесты

### Node.js скрипт для массового тестирования

```javascript
// test-all-apis.js
const fetch = require("node-fetch");

const tests = [
  {
    name: "Supabase Health",
    url: "https://sgzlhcagtesjazvwskjw.supabase.co/rest/v1/",
    method: "GET",
    headers: {
      Authorization: "Bearer YOUR_SUPABASE_ANON_KEY",
      apikey: "YOUR_SUPABASE_ANON_KEY",
    },
  },
  {
    name: "AI Proxy",
    url: "https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/ai-proxy",
    method: "OPTIONS",
  },
  {
    name: "Stripe Checkout",
    url: "https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/stripe-checkout",
    method: "OPTIONS",
  },
  {
    name: "Telegram Notify",
    url: "https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/telegram-notify",
    method: "OPTIONS",
  },
];

async function runTests() {
  for (const test of tests) {
    try {
      const response = await fetch(test.url, {
        method: test.method,
        headers: test.headers,
      });

      console.log(
        `✅ ${test.name}: ${response.status} - ${response.statusText}`
      );
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
}

runTests();
```

### Запуск пакетных тестов

```bash
# Запустить Node.js скрипт
node test-all-apis.js

# Запустить созданные тесты
npm test
npm run test:edge-functions
npm run test:verbose
```

## 📊 Мониторинг производительности

### Измерение времени ответа

```bash
# Использовать curl с timing
curl -w "@curl-format.txt" -o /dev/null -s https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/ai-proxy

# Файл curl-format.txt:
#     time_namelookup:  %{time_namelookup}s\n
#        time_connect:  %{time_connect}s\n
#     time_appconnect:  %{time_appconnect}s\n
#    time_pretransfer:  %{time_pretransfer}s\n
#       time_redirect:  %{time_redirect}s\n
#  time_starttransfer:  %{time_starttransfer}s\n
#                     ----------\n
#          time_total:  %{time_total}s\n
```

### Stress testing

```bash
# Использовать Apache Bench
ab -n 100 -c 10 https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/telegram-notify

# Использовать curl в цикле
for i in {1..10}; do
  curl -w "Test $i: %{time_total}s\n" -o /dev/null -s https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/ai-proxy
done
```

## 🔨 Исправление типичных проблем

### Проблема: "Invalid API key"

```bash
# Проверить и обновить API ключи
supabase secrets set OPENAI_API_KEY="sk-проверьте-ключ"
supabase secrets set ANTHROPIC_API_KEY="sk-ant-проверьте-ключ"
```

### Проблема: "Table doesn't exist"

```bash
# Проверить миграции
supabase migration list
supabase db push

# Если таблицы отсутствуют, создать их
psql -h YOUR_DB_HOST -U postgres -d postgres -c "
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);
"
```

### Проблема: "RLS policy violation"

```sql
-- Временно отключить RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_wallets DISABLE ROW LEVEL SECURITY;

-- Или создать политику для тестирования
CREATE POLICY "Allow all for testing" ON users FOR ALL TO anon USING (true);
```

### Проблема: "Authentication required"

```bash
# Создать тестового пользователя
curl -X POST https://sgzlhcagtesjazvwskjw.supabase.co/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

## 🎯 Регулярные проверки

### Ежедневные проверки

```bash
#!/bin/bash
# daily-health-check.sh

echo "🔍 Daily API Health Check - $(date)"
echo "================================"

# Проверить все Edge Functions
for func in ai-proxy stripe-checkout telegram-notify credit-meter; do
  status=$(curl -s -o /dev/null -w "%{http_code}" https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/$func)
  if [ "$status" -eq 200 ] || [ "$status" -eq 204 ]; then
    echo "✅ $func: OK ($status)"
  else
    echo "❌ $func: FAIL ($status)"
  fi
done

# Проверить Telegram Bot
bot_status=$(curl -s "https://api.telegram.org/bot7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA/getMe" | grep -o '"ok":true')
if [ "$bot_status" = '"ok":true' ]; then
  echo "✅ Telegram Bot: OK"
else
  echo "❌ Telegram Bot: FAIL"
fi

echo "================================"
echo "Health check completed"
```

### Еженедельные проверки

```bash
#!/bin/bash
# weekly-full-test.sh

echo "🧪 Weekly Full API Test - $(date)"
echo "================================"

# Запустить все тесты
cd tests
npm test
npm run test:edge-functions
node functional-api-test.js

echo "================================"
echo "Weekly test completed"
```

---

_Используйте эти команды для диагностики и мониторинга API интеграций_
