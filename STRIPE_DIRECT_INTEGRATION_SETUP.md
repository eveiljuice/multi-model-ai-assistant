# Прямая интеграция Stripe без Edge Functions

## Обзор

Эта новая архитектура полностью исключает использование edge functions для взаимодействия со Stripe, используя прямую интеграцию с Stripe API через клиентский код и минимальные серверные функции только для критически важных операций.

## Архитектура

### 1. Клиентская часть

- **Файл**: `src/services/stripe.service.ts`
- **Функционал**: Прямая работа с Stripe API через `@stripe/stripe-js`
- **Безопасность**: Использует только публичный ключ Stripe

### 2. Серверные функции (Edge Functions)

- **stripe-checkout-direct**: Создание checkout сессий
- **stripe-cancel-subscription**: Отмена подписок
- **stripe-webhook-direct**: Обработка webhook событий

### 3. База данных

- **RPC функции**: Минимальные функции для получения секретов и обработки данных
- **Таблицы**: Существующие таблицы Stripe (customers, subscriptions, orders, events)

## Настройка

### Шаг 1: Добавление секретов в Supabase Vault

```bash
# Через Supabase CLI
supabase secrets set stripe_public_key="pk_live_..."
supabase secrets set stripe_secret_key="sk_live_..."
supabase secrets set stripe_webhook_secret="whsec_..."
```

Или через Supabase Dashboard:

1. Перейдите в Settings > Vault
2. Добавьте секреты:
   - `stripe_public_key`: Публичный ключ Stripe
   - `stripe_secret_key`: Секретный ключ Stripe
   - `stripe_webhook_secret`: Секрет для webhook'ов

### Шаг 2: Применение миграций

```bash
# Применить новую миграцию
supabase db push
```

Эта миграция создаст:

- RPC функции для работы с секретами
- Функции для обработки платежей
- Индексы для оптимизации

### Шаг 3: Деплой Edge Functions

```bash
# Деплой новых функций
supabase functions deploy stripe-checkout-direct
supabase functions deploy stripe-cancel-subscription
supabase functions deploy stripe-webhook-direct
```

### Шаг 4: Настройка Stripe Dashboard

1. **Webhook endpoint**: Создайте новый webhook endpoint в Stripe Dashboard

   - URL: `https://your-project.supabase.co/functions/v1/stripe-webhook-direct`
   - События:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

2. **Продукты**: Убедитесь, что все продукты существуют в Stripe с правильными ID

## Как это работает

### Создание платежа

1. **Клиент**: Пользователь нажимает кнопку "Купить"
2. **Сервис**: `stripeService.createCheckoutSession()` вызывает edge function `stripe-checkout-direct`
3. **Edge Function**:
   - Получает Stripe секреты из Supabase Vault
   - Создает или находит Stripe customer
   - Создает checkout сессию в Stripe
   - Сохраняет предварительный заказ в базе
4. **Редирект**: Пользователь перенаправляется на Stripe Checkout
5. **Webhook**: После оплаты Stripe отправляет webhook в `stripe-webhook-direct`
6. **Обработка**: Webhook обновляет заказ и добавляет кредиты пользователю

### Обработка подписок

1. **Создание**: При создании подписки webhook создает запись в `stripe_subscriptions`
2. **Обновление**: При изменении статуса webhook обновляет запись
3. **Отмена**: Клиент может отменить через `stripeService.cancelSubscription()`

### Безопасность

- **Секреты**: Хранятся в Supabase Vault, недоступны клиенту
- **Публичный ключ**: Получается через RPC функцию
- **Webhook**: Проверяется подпись от Stripe
- **Авторизация**: Все операции требуют аутентификации пользователя

## Преимущества новой архитектуры

1. **Простота**: Минимальное количество edge functions
2. **Производительность**: Прямая работа с Stripe API
3. **Безопасность**: Секреты надежно защищены в Vault
4. **Масштабируемость**: Легко добавлять новые функции
5. **Отладка**: Проще отслеживать и исправлять ошибки

## Отличия от предыдущей версии

### Что убрано:

- Множественные edge functions для каждой операции
- Сложная логика получения секретов в каждой функции
- Дублирование кода между функциями

### Что добавлено:

- Прямая интеграция с Stripe API в клиенте
- Централизованное управление секретами
- Улучшенная обработка ошибок
- Более простая архитектура

## Тестирование

### Тестирование платежей

1. Используйте тестовые ключи Stripe
2. Используйте тестовые номера карт: `4242 4242 4242 4242`
3. Проверьте создание заказов в базе данных
4. Проверьте добавление кредитов

### Тестирование webhook'ов

1. Используйте Stripe CLI для локального тестирования:

```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook-direct
```

2. Проверьте обработку событий в логах Supabase

## Мониторинг

### Логи Edge Functions

- Проверяйте логи в Supabase Dashboard > Edge Functions
- Отслеживайте ошибки и время выполнения

### Stripe Dashboard

- Мониторьте webhook'и в Stripe Dashboard
- Проверяйте статус платежей и подписок

### База данных

- Отслеживайте записи в `stripe_events` для идемпотентности
- Проверяйте корректность данных в таблицах Stripe

## Миграция с предыдущей версии

1. Сохраните существующие данные
2. Примените новую миграцию
3. Деплойте новые edge functions
4. Обновите webhook URL в Stripe
5. Протестируйте все функции
6. Удалите старые edge functions (опционально)

## Поддержка

При возникновении проблем:

1. Проверьте логи edge functions
2. Убедитесь, что секреты правильно настроены
3. Проверьте webhook URL в Stripe
4. Проверьте статус миграций базы данных
