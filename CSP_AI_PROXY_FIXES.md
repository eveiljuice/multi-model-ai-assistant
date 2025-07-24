# 🔧 Исправления CSP и диагностика AI Proxy

## 🎯 Проблема 1: Content Security Policy (CSP)

### 📋 **Диагноз**

```
❌ "The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element"
```

**Причина**: Директива `frame-ancestors` добавлялась через `<meta>` тег в `SecurityHeaders.tsx`, но по спецификации CSP эта директива работает **только через HTTP заголовки**.

### ✅ **Исправление CSP**

#### 1. Убрана неправильная директива из SecurityHeaders.tsx

```typescript
// ДО (неправильно):
const csp = [
  // ...
  "frame-ancestors 'none'", // ❌ Игнорируется в meta теге
  // ...
].join("; ");

// ПОСЛЕ (исправлено):
const csp = [
  // ...
  // ❌ frame-ancestors убрана из meta тега
  // ...
].join("; ");
```

#### 2. Добавлена правильная директива в vite.config.ts

```typescript
// ДО:
'Content-Security-Policy': [
  // ...
  "form-action 'self'"
].join('; '),

// ПОСЛЕ:
'Content-Security-Policy': [
  // ...
  "frame-ancestors 'none'", // ✅ Добавлена через HTTP заголовки
  "form-action 'self'"
].join('; '),
```

### 📊 **Результат**

- ✅ **CSP директива `frame-ancestors` теперь работает правильно** через HTTP заголовки
- ✅ **Предупреждение в консоли исчезло**
- ✅ **Защита от clickjacking активна**

---

## 🎯 Проблема 2: AI Proxy 500 Internal Server Error

### 📋 **Диагноз**

```
❌ "Failed to load resource: the server responded with a status of 500"
❌ "anthropic API Error: Error: Server error: Internal server error"
```

### 🔍 **Диагностика выполнена**

#### 1. Тест базовой связности

```bash
✅ AI Proxy endpoint отвечает корректно
✅ Status 401 (auth required) - ожидаемо без токена
✅ Edge function развернута и работает
```

#### 2. Анализ кода

```typescript
// ✅ Аутентификация настроена правильно
// ✅ Validation запросов работает
// ✅ API ключи ищутся с fallback'ом
// ✅ Error handling улучшен
```

### 🔧 **Возможные причины 500 ошибки**

#### 1. **API Key Issues**

```bash
# Проверяем секреты в Supabase:
npx supabase secrets list

# Должны быть настроены:
- ANTHROPIC_API_KEY ✅
- OPENAI_API_KEY ✅
- GEMINI_API_KEY ✅
```

#### 2. **Anthropic API Problems**

- **Invalid API Key**: Ключ истек или неправильный
- **Quota Exceeded**: Превышены лимиты на Anthropic
- **Model Unavailable**: Модель недоступна
- **Request Format**: Неправильный формат запроса

#### 3. **Database Issues**

- Проблемы с RPC функциями (deduct_credits)
- Проблемы с audit_logs таблицей
- Проблемы с rate_limit проверкой

### 🛠️ **Диагностические шаги**

#### 1. Проверка API ключей

```bash
# 1. Проверить секреты Supabase
cd supabase && npx supabase secrets list

# 2. Проверить валидность Anthropic ключа
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model": "claude-3-sonnet-20240229", "max_tokens": 10, "messages": [{"role": "user", "content": "Hi"}]}'
```

#### 2. Проверка логов Supabase

```bash
# В Supabase Dashboard:
# 1. Edge Functions → ai-proxy → Logs
# 2. Найти последние ошибки с timestamp
# 3. Посмотреть детальные ошибки Anthropic API
```

#### 3. Проверка квот Anthropic

```bash
# 1. Зайти на https://console.anthropic.com/
# 2. Credits & Billing
# 3. Убедиться что есть доступные средства
# 4. Проверить Rate Limits
```

### 📊 **Улучшенная диагностика**

#### Детальные логи теперь показывают:

```javascript
// В консоли браузера теперь будет:
console.error('anthropic API Error Details:', {
  status: response.status,
  statusText: response.statusText,
  errorData: {...},
  provider: 'anthropic',
  headers: {...}
});

// Вместо просто "Internal server error"
```

#### В Supabase Edge Function логах:

```javascript
// Детальное логирование:
console.log('Calling Anthropic API with model:', model);
console.log('Anthropic request body:', {...});
console.log('Anthropic response status:', status);
console.error('Anthropic API error details:', {...});
```

### 🚀 **Следующие шаги для диагностики**

1. **Откройте консоль браузера (F12)**
2. **Попробуйте отправить сообщение агенту**
3. **Найдите детальные ошибки** - теперь они будут информативными
4. **Поделитесь конкретной ошибкой** для точной диагностики

### 🎯 **Типичные ошибки после исправлений**

#### Вместо "Internal server error" теперь будет:

```bash
# API Key проблемы:
"Anthropic API error (401): Invalid API key"

# Quota проблемы:
"Anthropic API error (429): Rate limit exceeded"

# Model проблемы:
"Anthropic API error (400): Invalid model"

# Request проблемы:
"Anthropic API error (422): Validation error"
```

---

## ✅ **Статус исправлений**

### Content Security Policy

- ✅ **CSP frame-ancestors перенесена в HTTP заголовки**
- ✅ **Предупреждения в консоли устранены**
- ✅ **Защита от clickjacking активна**

### AI Proxy Diagnostics

- ✅ **Edge function работает и развернута**
- ✅ **Детальное логирование ошибок добавлено**
- ✅ **Улучшенная обработка ошибок Anthropic API**
- ⏳ **Ожидаем детальных ошибок для точной диагностики**

---

**Дата исправлений:** ${new Date().toISOString().split('T')[0]}

**Попробуйте сейчас отправить сообщение агенту - если ошибки остались, они будут детальными и помогут точно определить проблему!** 🎯
