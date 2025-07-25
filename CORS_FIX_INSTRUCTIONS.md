# CORS Fix Instructions

Я исправил CORS ошибки в ai-proxy функции. Вот что было сделано и что нужно проверить:

## ✅ Исправления, которые уже применены:

### 1. Обновленные CORS настройки в `supabase/functions/_shared/cors.ts`:

- Добавлены варианты `127.0.0.1:5173` и `127.0.0.1:5174`
- Улучшено определение development режима
- Более гибкая проверка localhost origins
- Изменен статус OPTIONS ответа с 204 на 200
- Добавлено лучшее логирование для отладки

### 2. Улучшенная обработка ошибок в `src/services/aiService.ts`:

- Добавлена специальная обработка CORS/network ошибок
- Лучшие сообщения об ошибках для пользователей

### 3. Функция ai-proxy развернута:

- Обновленная функция уже развернута в Supabase
- CORS настройки активны

## 🔧 Что нужно проверить:

### 1. Проверьте API ключи в Supabase:

```bash
npx supabase secrets list
```

Убедитесь что настроены следующие секреты:

- `OPENAI_API_KEY` (для ChatGPT-4)
- `ANTHROPIC_API_KEY` (для Claude-2)
- `GEMINI_API_KEY` (для Gemini Pro)

### 2. Если API ключи отсутствуют, добавьте их:

```bash
# OpenAI API Key
npx supabase secrets set OPENAI_API_KEY=your_openai_key_here

# Anthropic API Key
npx supabase secrets set ANTHROPIC_API_KEY=your_anthropic_key_here

# Gemini API Key
npx supabase secrets set GEMINI_API_KEY=your_gemini_key_here
```

### 3. Перезапустите локальный сервер:

```bash
npm run dev
```

### 4. Протестируйте функциональность:

- Откройте http://localhost:5173
- Выберите любого агента (например, Prompt Polisher)
- Попробуйте переключить AI модель в селекторе (Settings кнопка в заголовке чата)
- Отправьте тестовое сообщение

## 🚨 Если ошибки продолжаются:

### Проверьте браузерную консоль:

1. Откройте DevTools (F12)
2. Перейдите на вкладку Console
3. Посмотрите есть ли новые ошибки CORS или 401/403

### Проверьте Supabase логи:

1. Перейдите в Supabase Dashboard
2. Functions → ai-proxy → Logs
3. Посмотрите логи CORS preflight requests

### Очистите кеш браузера:

- Ctrl+Shift+R (жесткое обновление)
- Или очистите кеш в DevTools → Application → Storage

## 📋 Ожидаемый результат:

После этих исправлений вы должны видеть:

1. ✅ Успешные запросы к ai-proxy без CORS ошибок
2. ✅ Работающий селектор моделей AI
3. ✅ Ответы от выбранных AI моделей
4. ✅ В консоли браузера: "Development mode: allowing localhost origin: http://localhost:5173"

Если проблемы продолжаются, пришлите новые логи ошибок - я доработаю исправления.
