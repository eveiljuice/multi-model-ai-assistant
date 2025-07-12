# Отладка Telegram уведомлений - Обновлено

## Проблема с HTTP расширением решена!

Обновленная система теперь использует `pg_net` вместо `http` расширения, которое доступно в Supabase.

## Шаги для настройки:

### 1. Получите ваш Chat ID:

**Важно!** Сначала отправьте любое сообщение боту в Telegram, затем выполните:

```bash
curl "https://api.telegram.org/bot7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA/getUpdates"
```

В ответе найдите ваш `chat.id` в разделе `message.chat.id`.

### 2. Обновите Chat ID в функции:

В файле `supabase/functions/telegram-notify/index.ts` замените:
```typescript
const TELEGRAM_CHAT_ID = "1096481173"; // Замените на ваш реальный chat_id
```

### 3. Обновите URL проекта:

В файле `supabase/migrations/20250703181000_fix_http_extension.sql` замените:
```sql
webhook_url := 'https://zp1v56uxy8rdx5ypatb0ockcb9tr6a.supabase.co/functions/v1/telegram-notify';
```

На URL вашего Supabase проекта.

### 4. Проверьте развертывание Edge Function:

1. Перейдите в Supabase Dashboard
2. Откройте раздел "Functions"
3. Убедитесь, что функция `telegram-notify` развернута
4. Проверьте логи функции

### 5. Тестирование:

После отправки идеи через форму проверьте:

**В базе данных:**
```sql
-- Проверьте попытки вызова webhook
SELECT * FROM activity_logs 
WHERE event_type LIKE '%telegram%' 
ORDER BY created_at DESC;

-- Проверьте ошибки
SELECT * FROM error_logs 
WHERE error_type LIKE '%telegram%' 
ORDER BY created_at DESC;

-- Проверьте доступные расширения
SELECT * FROM activity_logs 
WHERE event_type = 'extension_check' 
ORDER BY created_at DESC;
```

**Прямое тестирование бота:**
```bash
curl -X POST "https://api.telegram.org/bot7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "ВАШ_CHAT_ID",
    "text": "🧪 Тест бота Agent Core",
    "parse_mode": "HTML"
  }'
```

## Что исправлено:

1. ✅ **HTTP расширение**: Теперь используется `pg_net` вместо `http`
2. ✅ **Обработка ошибок**: Улучшенное логирование и диагностика
3. ✅ **Проверка расширений**: Автоматическая проверка доступных расширений
4. ✅ **Детальные логи**: Подробная информация для отладки
5. ✅ **Fallback механизм**: Несколько способов отправки webhook

## Возможные проблемы и решения:

| Проблема | Решение |
|----------|---------|
| Chat ID не настроен | Получите через `/getUpdates` и обновите в функции |
| Функция не развернута | Проверьте в Supabase Dashboard → Functions |
| Неверный URL проекта | Обновите webhook_url в миграции |
| Бот не отвечает | Убедитесь, что отправили сообщение боту первым |
| Нет прав доступа | Проверьте service_role_key в настройках |

## Отладочная информация:

Все действия теперь подробно логируются:
- `activity_logs` - успешные операции
- `error_logs` - ошибки с деталями
- Edge Function логи - в Supabase Dashboard

Система должна работать корректно после этих исправлений!