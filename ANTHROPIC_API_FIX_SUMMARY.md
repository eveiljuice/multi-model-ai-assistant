# Anthropic API Error Fix Summary

## 🔍 Проблема

Возникала ошибка при ответе мультимодального ассистента со стороны Anthropic:

```
anthropic API Error: Error: Server error: Internal server error
```

## 🕵️ Диагностика

1. **Неправильное имя переменной окружения** - в edge функции искался `ANTHROPIC_API_KEY`, а в .env файле был `VITE_CLAUDE_API_KEY`
2. **Плохая обработка ошибок** - детальные ошибки от Anthropic API скрывались за общим "Internal server error"
3. **Недостаточное логирование** для диагностики проблем

## ✅ Исправления

### 1. Исправлены переменные окружения

**Файл:** `supabase/functions/ai-proxy/index.ts`

**Изменение:**

```typescript
// До
case 'anthropic':
  apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  break

// После
case 'anthropic':
  apiKey = Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('VITE_CLAUDE_API_KEY')
  break
```

### 2. Улучшена обработка ошибок в callAnthropic()

**Добавлено:**

- Детальное логирование запросов к Anthropic API
- Правильная обработка и парсинг ошибок
- Сохранение оригинальных сообщений об ошибках

**Код:**

```typescript
console.log("Calling Anthropic API with model:", request.model);
// ... детальное логирование
if (!response.ok) {
  const errorText = await response.text();
  console.error("Anthropic API error details:", {
    status: response.status,
    statusText: response.statusText,
    error: errorText,
    headers: Object.fromEntries(response.headers.entries()),
  });

  let errorDetails = errorText;
  try {
    const errorJson = JSON.parse(errorText);
    errorDetails = errorJson.error?.message || errorJson.message || errorText;
  } catch (e) {
    // Keep original error text if not JSON
  }

  throw new Error(`Anthropic API error (${response.status}): ${errorDetails}`);
}
```

### 3. Улучшен главный catch блок

**Изменение:**

```typescript
// До
catch (error) {
  console.error('AI proxy error:', error.message)
  return createCorsResponse({ error: 'Internal server error' }, 500, req);
}

// После
catch (error) {
  console.error('AI proxy error:', {
    message: error.message,
    stack: error.stack,
    provider: req.headers.get('content-type') ? 'Unknown' : 'None'
  });

  let errorMessage = 'Internal server error';
  let statusCode = 500;

  if (error.message?.includes('Anthropic API error')) {
    errorMessage = error.message;
    statusCode = 500;
  }
  // ... другие типы ошибок

  return createCorsResponse({
    error: errorMessage,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  }, statusCode, req);
}
```

### 4. Добавлена диагностика переменных окружения

**Добавлено логирование:**

```typescript
console.log("Environment check:", {
  supabaseUrl: !!Deno.env.get("SUPABASE_URL"),
  supabaseServiceKey: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  openaiKey: !!Deno.env.get("OPENAI_API_KEY"),
  anthropicKey: !!(
    Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("VITE_CLAUDE_API_KEY")
  ),
  geminiKey: !!(
    Deno.env.get("GEMINI_API_KEY") || Deno.env.get("VITE_GEMINI_API_KEY")
  ),
});
```

### 5. Улучшена обработка ошибок на фронтенде

**Файл:** `src/services/aiService.ts`

**Добавлено:**

```typescript
console.error(`${provider} API Error Details:`, {
  status: response.status,
  statusText: response.statusText,
  errorData,
  provider,
  headers: Object.fromEntries(response.headers.entries()),
});

// Enhanced error message for 500 errors
let serverError = errorData.error || response.statusText;
if (errorData.details) {
  serverError += ` (Details: ${errorData.details})`;
}
throw new Error(`Server error: ${serverError}`);
```

## 🧪 Тестирование

### Статус развертывания

✅ Edge функция `ai-proxy` успешно развернута  
✅ API ключи настроены в Supabase secrets:

- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`

### Как протестировать исправления

1. **Откройте приложение** и войдите в систему
2. **Выберите любого агента** который использует Anthropic/Claude
3. **Отправьте тестовое сообщение**
4. **Проверьте консоль браузера** (F12) для детальных логов

### Ожидаемое поведение

- ❌ **До исправления:** "Server error: Internal server error"
- ✅ **После исправления:** Детальное сообщение об ошибке или успешный ответ

## 📋 Следующие шаги

1. **Протестируйте в браузере** - попробуйте использовать агентов с Claude
2. **Проверьте консоль** - смотрите на детальные логи ошибок
3. **Если проблемы продолжаются:**
   - Проверьте Supabase Dashboard > Edge Functions > Logs
   - Убедитесь что API ключ Anthropic валиден
   - Проверьте квоты на Anthropic API

## 🔧 Дополнительные исправления

Аналогичные исправления также применены для:

- **Gemini API** - добавлен fallback на `VITE_GEMINI_API_KEY`
- **Общая обработка ошибок** для всех AI провайдеров

---

**Дата исправления:** ${new Date().toISOString().split('T')[0]}  
**Статус:** ✅ Исправления развернуты и готовы к тестированию
