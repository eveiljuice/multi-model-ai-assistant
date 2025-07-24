# 🤖 Руководство по настройке AI провайдеров

## 📋 Обзор проблем и решений

### Выявленные критические проблемы:

1. **401 Ошибки аутентификации** - AI proxy требует JWT токен
2. **Отсутствие API ключей** - Ключи не настроены в Supabase Secrets
3. **Некорректное извлечение ответов** - Неправильная обработка форматов ответов
4. **Отсутствие retry логики** - Нет повторных попыток при сбоях
5. **Слабая обработка ошибок** - Недостаточная детализация ошибок

---

## 🔧 Пошаговое исправление

### Шаг 1: Настройка API ключей в Supabase

#### 1.1 Получение API ключей

**OpenAI:**

```bash
# Перейдите на https://platform.openai.com/api-keys
# Создайте новый API ключ
# Формат: sk-...
```

**Anthropic (Claude):**

```bash
# Перейдите на https://console.anthropic.com/
# Создайте новый API ключ
# Формат: sk-ant-...
```

**Google Gemini:**

```bash
# Перейдите на https://makersuite.google.com/app/apikey
# Создайте новый API ключ
# Формат: AIza...
```

#### 1.2 Установка ключей в Supabase

```bash
# Используя Supabase CLI
npx supabase secrets set OPENAI_API_KEY=sk-your-openai-key
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
npx supabase secrets set GEMINI_API_KEY=AIza-your-gemini-key

# Или через Supabase Dashboard:
# 1. Откройте https://supabase.com/dashboard
# 2. Выберите ваш проект
# 3. Settings → Edge Functions → Environment Variables
# 4. Добавьте каждый ключ отдельно
```

### Шаг 2: Проверка настройки

#### 2.1 Проверка API ключей

```bash
# Тест через API keys check function
curl "https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/api-keys-check?test=true"
```

#### 2.2 Использование диагностики в UI

1. Откройте ваше приложение
2. Перейдите в раздел "AI Provider Diagnostics" (если доступен)
3. Нажмите "Run Diagnostics"
4. Проверьте статус всех провайдеров

### Шаг 3: Исправленная конфигурация

#### 3.1 Обновленный AI Service

Основные улучшения в `aiService.ts`:

```typescript
// ✅ Улучшенная аутентификация с retry
private async getAuthToken(): Promise<string> {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        // Try to refresh session
        const { data: { session: refreshedSession }, error: refreshError } =
          await supabase.auth.refreshSession();

        if (refreshError || !refreshedSession?.access_token) {
          throw new Error('Authentication failed: Unable to refresh session');
        }

        return refreshedSession.access_token;
      }

      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      return session.access_token;
    } catch (authError) {
      retryCount++;
      if (retryCount >= maxRetries) {
        throw new Error(`Authentication failed after ${maxRetries} attempts`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
    }
  }
}

// ✅ Улучшенная обработка ответов
private extractContent(data: any, provider: string): { content: string; tokens: number } {
  try {
    switch (provider) {
      case 'openai':
        if (!data.response?.choices?.[0]?.message?.content) {
          throw new Error('Invalid OpenAI response format');
        }
        return {
          content: data.response.choices[0].message.content,
          tokens: data.response.usage?.total_tokens || 0
        };

      case 'anthropic':
        if (!data.response?.content?.[0]?.text) {
          throw new Error('Invalid Anthropic response format');
        }
        return {
          content: data.response.content[0].text,
          tokens: (data.response.usage?.input_tokens || 0) + (data.response.usage?.output_tokens || 0)
        };

      case 'gemini':
        if (!data.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error('Invalid Gemini response format');
        }
        return {
          content: data.response.candidates[0].content.parts[0].text,
          tokens: data.tokens_used || 1
        };

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Content extraction error for ${provider}:`, error);
    throw error;
  }
}
```

#### 3.2 Улучшенная обработка ошибок

```typescript
// ✅ Специфические ошибки для каждого провайдера
private categorizeError(error: string, statusCode?: number): {
  type: string;
  retryable: boolean;
  userMessage: string;
} {
  if (statusCode === 401 || error.includes('authentication')) {
    return {
      type: 'auth_error',
      retryable: false,
      userMessage: 'Please re-login to continue using AI features'
    };
  }

  if (statusCode === 429 || error.includes('rate limit')) {
    return {
      type: 'rate_limit',
      retryable: true,
      userMessage: 'Too many requests. Please wait a moment and try again'
    };
  }

  if (error.includes('API key not configured')) {
    return {
      type: 'config_error',
      retryable: false,
      userMessage: 'AI service temporarily unavailable. Please contact support'
    };
  }

  if (error.includes('quota') || error.includes('billing')) {
    return {
      type: 'quota_error',
      retryable: false,
      userMessage: 'AI service quota exceeded. Please try again later'
    };
  }

  return {
    type: 'unknown_error',
    retryable: true,
    userMessage: 'Temporary AI service issue. Please try again'
  };
}
```

### Шаг 4: Тестирование исправлений

#### 4.1 Автоматическое тестирование

```bash
# Запуск тестов AI провайдеров
cd tests
npm test ai-providers

# Или использование специального теста
node test-ai-proxy.js
```

#### 4.2 Ручное тестирование

1. **Аутентификация:**

   - Войдите в систему
   - Попробуйте использовать любого AI агента
   - Проверьте, что нет 401 ошибок

2. **Ответы AI:**

   - Задайте простой вопрос агенту
   - Убедитесь, что ответ корректный и полный
   - Проверьте, что нет ошибок "Invalid response format"

3. **Fallback система:**
   - Временно отключите один из провайдеров
   - Убедитесь, что система переключается на резервный провайдер

#### 4.3 Мониторинг в реальном времени

```typescript
// Используйте AI Provider Diagnostics компонент
import AIProviderDiagnostics from "./components/AIProviderDiagnostics";

// Интеграция в ваш админ панель или debug режим
<AIProviderDiagnostics />;
```

---

## 📊 Ожидаемые результаты

### После исправлений вы должны увидеть:

✅ **API Keys Check:**

- OpenAI: ✓ Configured (sk-...)
- Anthropic: ✓ Configured (sk-ant-...)
- Gemini: ✓ Configured (AIza...)

✅ **Connection Tests:**

- Claude: ✓ Connection successful (< 2000ms)
- Gemini: ✓ Connection successful (< 1500ms)

✅ **Provider Status:**

- All providers: ✓ Available
- Rate limits: Within normal ranges
- Last errors: None

✅ **User Experience:**

- AI агенты отвечают быстро и корректно
- Нет ошибок аутентификации
- Плавное переключение между провайдерами при сбоях

---

## 🚨 Troubleshooting

### Если проблемы все еще присутствуют:

#### Проблема: "API key not configured"

```bash
# Решение 1: Проверьте правильность ключей
npx supabase secrets list

# Решение 2: Перезапустите edge functions
npx supabase functions deploy ai-proxy --no-verify-jwt

# Решение 3: Проверьте формат ключей
echo $OPENAI_API_KEY | head -c 10  # Должно быть sk-
```

#### Проблема: "Authentication failed"

```typescript
// Решение: Добавьте обработку просроченных токенов
const handleAuthError = async () => {
  await supabase.auth.signOut();
  // Redirect to login
  window.location.href = "/auth";
};
```

#### Проблема: "Invalid response format"

```typescript
// Решение: Добавьте детальное логирование
console.log("Raw AI response:", JSON.stringify(data, null, 2));

// Проверьте структуру ответа для каждого провайдера
```

#### Проблема: "Rate limit exceeded"

```typescript
// Решение: Реализуйте exponential backoff
const retryWithBackoff = async (fn: Function, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};
```

---

## 🔄 Постоянный мониторинг

### Настройте алерты для мониторинга:

1. **Health Check Endpoint:**

```typescript
// GET /functions/v1/ai-proxy-health
// Должен возвращать статус всех провайдеров
```

2. **Логирование ошибок:**

```typescript
// Все ошибки логируются в audit_logs таблицу
// Настройте алерты при критических ошибках
```

3. **Метрики производительности:**

```typescript
// Отслеживайте:
// - Response time по провайдерам
// - Success rate
// - Rate limit utilization
```

---

## 📞 Поддержка

Если проблемы продолжаются после выполнения всех шагов:

1. Проверьте логи в Supabase Dashboard → Logs
2. Запустите полную диагностику через компонент
3. Проверьте статус API провайдеров:
   - https://status.openai.com/
   - https://status.anthropic.com/
   - https://status.cloud.google.com/

**Контакты для технической поддержки:**

- Telegram: @your_support_channel
- Email: support@yourproject.com
