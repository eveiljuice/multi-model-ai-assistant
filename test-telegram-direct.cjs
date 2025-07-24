const fetch = require('node-fetch');

const TELEGRAM_BOT_TOKEN = '7788182965:AAEiUmRg4l_HvaV3honhiVZluu_gFadOcrA';
const TELEGRAM_CHAT_ID = '-1002604809855';

async function sendTelegramMessage(text) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Telegram API error:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('✅ Telegram message sent:', result.result.message_id);
    return true;
  } catch (error) {
    console.error('❌ Failed to send Telegram message:', error);
    return false;
  }
}

async function testPaymentNotification() {
  const message = `💰 <b>ТЕСТ: Новая оплата в Donein5!</b>

🛒 <b>Тип:</b> Разовая покупка (тест)
💵 <b>Сумма:</b> $1.00
⚡ <b>Кредиты:</b> 10
💎 <b>Цена за кредит:</b> $0.100

👤 <b>Пользователь:</b>
   📧 test@donein5.com
   🆔 test-user-123

🧾 <b>Stripe Session:</b> <code>cs_test_123456</code>
🕐 <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}

---
<i>💫 ТЕСТ: Отправлено из Donein5 Payment System</i>`;

  console.log('📱 Отправляем тестовое уведомление в Telegram...');
  const success = await sendTelegramMessage(message);
  
  if (success) {
    console.log('🎉 Тестовое уведомление отправлено успешно!');
    console.log('📱 Проверьте Telegram чат.');
  } else {
    console.log('❌ Не удалось отправить тестовое уведомление.');
  }
  
  return success;
}

async function testSubscriptionNotification() {
  const message = `🔄 <b>ТЕСТ: Рекуррентный платеж подписки</b>

💰 <b>Сумма:</b> $29.00
⚡ <b>Кредиты добавлены:</b> 250

👤 <b>Пользователь:</b>
   📧 test-subscription@donein5.com
   🆔 test-sub-user-456

🧾 <b>Invoice ID:</b> <code>in_test_123456</code>
🔄 <b>Subscription ID:</b> <code>sub_test_789</code>
🕐 <b>Время:</b> ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}

---
<i>💫 ТЕСТ: Отправлено из Donein5 Payment System</i>`;

  console.log('📱 Отправляем тестовое уведомление о подписке в Telegram...');
  const success = await sendTelegramMessage(message);
  
  if (success) {
    console.log('🎉 Тестовое уведомление о подписке отправлено успешно!');
  } else {
    console.log('❌ Не удалось отправить тестовое уведомление о подписке.');
  }
  
  return success;
}

async function testEdgeFunction() {
  try {
    console.log('🧪 Тестируем Edge функцию напрямую...');
    
    const testData = {
      record: {
        id: 'test-idea-123',
        title: 'Тестовая идея',
        description: 'Тестовое описание идеи для проверки Telegram уведомлений',
        category: 'other',
        priority: 'low',
        user_id: 'test-user',
        created_at: new Date().toISOString()
      }
    };

    const response = await fetch('https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/telegram-notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnemxoY2FndGVzamF6dndza2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMjY1NTAsImV4cCI6MjA2NjgwMjU1MH0.FyANbeHq6ju5rk6dpjqMHhrmIT2wGna7ixTLpUG_u90'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('📋 Ответ Edge функции:', result);
    
    return response.ok;
  } catch (error) {
    console.error('❌ Ошибка тестирования Edge функции:', error.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'payment';
  
  console.log('🧪 Тестирование Telegram уведомлений\n');
  
  try {
    if (command === 'subscription') {
      await testSubscriptionNotification();
    } else if (command === 'edge') {
      await testEdgeFunction();
    } else {
      await testPaymentNotification();
    }
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

main(); 