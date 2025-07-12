#!/bin/bash

# Скрипт быстрого развертывания исправлений интеграции с Telegram
echo "🚀 Быстрое развертывание исправлений Telegram интеграции"
echo "======================================================="

# Проверяем, установлен ли Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI не найден. Установите: npm install -g supabase"
    exit 1
fi

# Шаг 1: Настройка environment variables
echo "📋 Шаг 1: Настройка environment variables"
echo "TELEGRAM_BOT_TOKEN: 7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA"
echo "TELEGRAM_CHAT_ID: -1002604809855"

supabase secrets set TELEGRAM_BOT_TOKEN="7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA"
supabase secrets set TELEGRAM_CHAT_ID="-1002604809855"

echo "✅ Environment variables настроены"

# Шаг 2: Применение миграций
echo ""
echo "📋 Шаг 2: Применение миграций"
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Миграции применены успешно"
else
    echo "❌ Ошибка при применении миграций"
    exit 1
fi

# Шаг 3: Развертывание Edge Function
echo ""
echo "📋 Шаг 3: Развертывание Edge Function"
supabase functions deploy telegram-notify

if [ $? -eq 0 ]; then
    echo "✅ Edge Function развернута успешно"
else
    echo "❌ Ошибка при развертывании Edge Function"
    exit 1
fi

# Шаг 4: Тестирование
echo ""
echo "📋 Шаг 4: Тестирование"
echo "Проверка бота..."

BOT_RESPONSE=$(curl -s "https://api.telegram.org/bot7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA/getMe")
if echo "$BOT_RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Бот работает корректно"
else
    echo "❌ Проблемы с ботом"
    echo "$BOT_RESPONSE"
fi

echo ""
echo "🎉 Развертывание завершено!"
echo "======================================================="
echo "Теперь можно протестировать форму 'Suggest an Idea'"
echo ""
echo "🧪 Для тестирования Edge Function:"
echo "curl -X POST 'https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/telegram-notify' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"record\": {\"id\": \"test-123\", \"title\": \"Test Idea\", \"description\": \"Test description\", \"category\": \"other\", \"priority\": \"medium\", \"created_at\": \"2025-01-20T12:00:00Z\"}}'"
echo ""
echo "📊 Мониторинг логов:"
echo "supabase functions logs telegram-notify" 