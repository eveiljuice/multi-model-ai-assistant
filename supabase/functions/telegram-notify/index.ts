import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: string;
}

interface IdeaSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  user_id?: string;
  created_at: string;
}

// Используем environment variables вместо хардкода
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

async function sendTelegramMessage(message: TelegramMessage): Promise<boolean> {
  try {
    console.log('Отправка сообщения в Telegram:', {
      chat_id: message.chat_id,
      text_length: message.text.length,
      has_bot_token: !!TELEGRAM_BOT_TOKEN
    });

    if (!TELEGRAM_BOT_TOKEN) {
      console.error('❌ TELEGRAM_BOT_TOKEN не настроен');
      return false;
    }

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    console.log('Ответ от Telegram API:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      result: response.ok ? { message_id: result.result?.message_id } : result
    });

    if (!response.ok) {
      console.error('Ошибка Telegram API:', {
        status: response.status,
        statusText: response.statusText,
        error: result.description || result.error_code
      });
      return false;
    }

    console.log('✅ Сообщение успешно отправлено в Telegram');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при отправке сообщения в Telegram:', error);
    return false;
  }
}

function formatIdeaMessage(idea: IdeaSuggestion): string {
  const categoryEmojis: Record<string, string> = {
    'new_agent': '🤖',
    'feature_improvement': '⚡',
    'ui_enhancement': '🎨',
    'integration': '🔗',
    'other': '💡'
  };

  const priorityEmojis: Record<string, string> = {
    'low': '🟢',
    'medium': '🟡',
    'high': '🟠',
    'urgent': '🔴'
  };

  const categoryEmoji = categoryEmojis[idea.category] || '💡';
  const priorityEmoji = priorityEmojis[idea.priority] || '🟡';

  const formattedDate = new Date(idea.created_at).toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Используем HTML для форматирования
  return `🚀 <b>Новая идея для Agent Core!</b>

${categoryEmoji} <b>Категория:</b> ${getCategoryName(idea.category)}
${priorityEmoji} <b>Приоритет:</b> ${getPriorityName(idea.priority)}

📝 <b>Заголовок:</b>
${idea.title}

📋 <b>Описание:</b>
${idea.description}

👤 <b>Пользователь:</b> ${idea.user_id ? `ID: ${idea.user_id}` : 'Анонимный'}
🕐 <b>Время:</b> ${formattedDate}
🆔 <b>ID идеи:</b> <code>${idea.id}</code>

---
<i>Отправлено из Agent Core</i>`;
}

function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    'new_agent': 'Новый агент',
    'feature_improvement': 'Улучшение функций',
    'ui_enhancement': 'Улучшение UI',
    'integration': 'Интеграция',
    'other': 'Другое'
  };
  return names[category] || category;
}

function getPriorityName(priority: string): string {
  const names: Record<string, string> = {
    'low': 'Низкий',
    'medium': 'Средний',
    'high': 'Высокий',
    'urgent': 'Срочный'
  };
  return names[priority] || priority;
}

serve(async (req) => {
  console.log('=== Telegram notify function вызвана ===');
  console.log('Метод:', req.method);
  console.log('URL:', req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Проверяем конфигурацию
    if (!TELEGRAM_BOT_TOKEN) {
      console.error('❌ TELEGRAM_BOT_TOKEN не настроен');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'TELEGRAM_BOT_TOKEN не настроен в environment variables',
          config_needed: 'supabase secrets set TELEGRAM_BOT_TOKEN=your_bot_token'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!TELEGRAM_CHAT_ID) {
      console.error('❌ TELEGRAM_CHAT_ID не настроен');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'TELEGRAM_CHAT_ID не настроен в environment variables',
          config_needed: 'supabase secrets set TELEGRAM_CHAT_ID=your_chat_id'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const body = await req.text();
    console.log('Тело запроса:', body);

    if (!body) {
      console.error('Пустое тело запроса');
      return new Response(
        JSON.stringify({ error: 'Empty request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let data;
    try {
      data = JSON.parse(body);
      console.log('Распарсенные данные:', data);
    } catch (parseError) {
      console.error('Ошибка парсинга JSON:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { record } = data;
    
    if (!record) {
      console.error('Нет записи в запросе');
      return new Response(
        JSON.stringify({ error: 'No record provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Обработка предложения идеи:', {
      id: record.id,
      title: record.title,
      category: record.category,
      priority: record.priority
    });

    // Форматируем и отправляем сообщение в Telegram
    const messageText = formatIdeaMessage(record);
    console.log('Форматированное сообщение длиной:', messageText.length);
    
    const telegramMessage: TelegramMessage = {
      chat_id: TELEGRAM_CHAT_ID,
      text: messageText,
      parse_mode: 'HTML'
    };

    const success = await sendTelegramMessage(telegramMessage);

    if (success) {
      console.log('✅ Уведомление в Telegram отправлено успешно');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Уведомление отправлено в Telegram успешно',
          debug_info: {
            chat_id: TELEGRAM_CHAT_ID,
            idea_id: record.id,
            message_length: messageText.length
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      console.error('❌ Не удалось отправить уведомление в Telegram');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Не удалось отправить уведомление в Telegram'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('❌ Ошибка в функции telegram-notify:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})