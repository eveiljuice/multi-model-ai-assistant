# API Testing Suite - Multi-Model AI Assistant

Комплексная система тестирования для всех API сервисов платформы Multi-Model AI Assistant.

## 🎯 Цель

Данная тестовая система выполняет полное тестирование всех API интеграций проекта:

- **AI Providers**: OpenAI, Anthropic Claude, Google Gemini
- **Stripe**: Checkout sessions, webhook обработка, платежи
- **Telegram**: Bot notifications, уведомления
- **Supabase**: Edge Functions, база данных, аутентификация

## 📋 Структура проекта

```
tests/
├── README.md                     # Данный файл
├── package.json                  # Зависимости и scripts
├── test-runner.js               # Основной test runner
├── edge-functions-test.js       # Специализированные тесты Edge Functions
├── api-comprehensive-test.ts    # Полный комплексный тест на TypeScript
└── results/                     # Папка для сохранения результатов
```

## 🚀 Установка

### 1. Установка зависимостей

```bash
cd tests
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```bash
# Supabase
VITE_SUPABASE_URL=https://sgzlhcagtesjazvwskjw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (для webhook тестов)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Telegram (для notification тестов)
TELEGRAM_BOT_TOKEN=7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA
TELEGRAM_CHAT_ID=-1002604809855
```

## 🧪 Запуск тестов

### Быстрый запуск

```bash
# Основные тесты
npm test

# Тесты Edge Functions
npm run test:edge-functions

# Все тесты
npm run test:all
```

### Детальные варианты

```bash
# Подробный вывод
npm run test:verbose

# Сохранение результатов в файл
npm run test:save

# Вывод в JSON формате
npm run test:json

# Тесты Edge Functions с подробностями
npm run test:edge-functions:verbose
```

### Прямой запуск

```bash
# Основной test runner
node test-runner.js --verbose --save

# Edge Functions тесты
node edge-functions-test.js --verbose

# Комплексный TypeScript тест
npx ts-node api-comprehensive-test.ts
```

## 📊 Типы тестов

### 1. Базовые тесты (test-runner.js)

- **Supabase Connection**: Проверка подключения к БД
- **Authentication**: Тестирование аутентификации
- **Database Operations**: Работа с таблицами
- **AI Proxy Function**: Базовые запросы к AI
- **Stripe Checkout**: Создание checkout sessions
- **Telegram Notifications**: Отправка уведомлений

### 2. Edge Functions тесты (edge-functions-test.js)

- **Function Availability**: Проверка доступности всех функций
- **AI Proxy**: Тестирование всех AI providers
- **Stripe Integration**: Все аспекты Stripe интеграции
- **Telegram Bot**: Полная проверка Telegram бота
- **Credit System**: Тестирование кредитной системы
- **Webhook Handlers**: Проверка webhook обработчиков

### 3. Комплексные тесты (api-comprehensive-test.ts)

- **Multi-Provider AI Tests**: Параллельное тестирование AI
- **Performance Tests**: Нагрузочное тестирование
- **Rate Limiting**: Проверка лимитов запросов
- **Error Handling**: Тестирование обработки ошибок
- **Security Tests**: Проверка безопасности

## 📈 Интерпретация результатов

### Статусы тестов

- ✅ **SUCCESS**: Тест прошел успешно
- ❌ **FAILURE**: Тест не прошел (ожидался другой результат)
- 🚨 **ERROR**: Критическая ошибка во время выполнения

### Метрики производительности

- **Response Time**: Время ответа в миллисекундах
- **Success Rate**: Процент успешных тестов
- **Average Time**: Среднее время выполнения

### Пример успешного отчета

```
📊 API TEST REPORT
============================================================
Total Tests: 15
✅ Passed: 13
❌ Failed: 2
📈 Success Rate: 86.7%
⏱️ Total Duration: 45.32s
------------------------------------------------------------

✅ Supabase Connection - 234ms
✅ AI Proxy Function - 2156ms
❌ Stripe Checkout - 1205ms
✅ Telegram Notification - 847ms
```

## 🔧 Troubleshooting

### Типичные проблемы

#### 1. Authentication Failed

```
❌ Authentication failed: Invalid login credentials
```

**Решение**: Проверьте настройки Supabase и создайте тестового пользователя вручную

#### 2. AI API Keys Not Configured

```
❌ API key not configured for this provider
```

**Решение**: Убедитесь, что API ключи настроены в Supabase Secrets

#### 3. Stripe Webhook Signature Failed

```
❌ Webhook signature verification failed
```

**Решение**: Это ожидаемое поведение для тестов - webhook правильно отклоняет некорректные подписи

#### 4. Telegram Bot Token Issues

```
❌ TELEGRAM_BOT_TOKEN не настроен
```

**Решение**: Проверьте переменные окружения в Supabase

### Команды диагностики

```bash
# Проверка доступности Edge Functions
curl -X OPTIONS https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/ai-proxy

# Тест подключения к Supabase
node -e "const { createClient } = require('@supabase/supabase-js'); const supabase = createClient('URL', 'KEY'); supabase.from('users').select('count').then(console.log)"

# Проверка Telegram бота
curl "https://api.telegram.org/bot7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA/getMe"
```

## 🎨 Кастомизация

### Добавление новых тестов

1. Создайте новый метод в классе тестера:

```javascript
async testMyCustomAPI() {
  const testData = { /* ваши данные */ };

  const response = await fetch('https://api.example.com/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData)
  });

  // Проверка и возврат результата
  return { success: response.ok, data: await response.json() };
}
```

2. Добавьте тест в `runAllTests()`:

```javascript
await this.runTest("My Custom API", () => this.testMyCustomAPI());
```

### Изменение конфигурации

Отредактируйте объект `CONFIG` в начале файлов:

```javascript
const CONFIG = {
  SUPABASE_URL: "your-url",
  TEST_TIMEOUT: 60000, // 1 минута
  MAX_RETRIES: 5,
  VERBOSE: true,
};
```

## 📝 Логирование

### Файлы логов

- `test-results-YYYY-MM-DD.json`: Детальные результаты тестов
- `test-runner.log`: Общий лог выполнения
- `edge-functions.log`: Логи Edge Functions тестов

### Уровни логирования

- **INFO**: Общая информация
- **SUCCESS**: Успешные операции
- **WARN**: Предупреждения
- **ERROR**: Ошибки

## 🚀 CI/CD Integration

### GitHub Actions

```yaml
name: API Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Install dependencies
        run: cd tests && npm install
      - name: Run tests
        run: cd tests && npm run test:all
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

### Локальная автоматизация

```bash
# Ежедневный запуск тестов
echo "0 9 * * * cd /path/to/tests && npm test" | crontab -

# Мониторинг изменений
watch -n 60 'npm test > latest-results.txt'
```

## 🔐 Безопасность

### Рекомендации

1. **Не коммитьте секреты**: Используйте `.env` файлы
2. **Тестовые данные**: Используйте только тестовые API ключи
3. **Изоляция**: Запускайте тесты в изолированном окружении
4. **Логи**: Не логируйте чувствительную информацию

### Тестовые пользователи

Создайте отдельных тестовых пользователей:

```sql
-- В Supabase SQL Editor
INSERT INTO auth.users (email, email_confirmed_at, encrypted_password)
VALUES ('test@example.com', now(), crypt('testpassword123', gen_salt('bf')));
```

## 📞 Поддержка

### Контакты

- **GitHub Issues**: [Создать issue](https://github.com/your-repo/issues)
- **Telegram**: [@your_dev_channel](https://t.me/your_dev_channel)
- **Email**: dev@yourproject.com

### Полезные ссылки

- [Supabase Documentation](https://supabase.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [OpenAI API](https://platform.openai.com/docs/api-reference)

## 🎉 Заключение

Данная тестовая система обеспечивает полный контроль качества всех API интеграций проекта. Регулярное выполнение тестов гарантирует стабильную работу платформы и раннее обнаружение проблем.

**Рекомендуется запускать тесты:**

- Перед каждым деплоем
- После изменения API ключей
- При обновлении зависимостей
- Ежедневно в автоматическом режиме
