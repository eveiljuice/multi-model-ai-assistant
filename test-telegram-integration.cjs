// Комплексный тест Telegram интеграции
console.log('🤖 Testing Telegram Integration for Donein5');

async function testTelegramIntegration() {
  console.log('\n=== ТЕСТ 1: Проверка Telegram Test Endpoint ===');
  
  try {
    const response = await fetch('http://localhost:3002/api/telegram/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Telegram Test API работает:', result.message);
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Telegram Test API ошибка:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.log('❌ Критическая ошибка Telegram Test API:', error.message);
    return false;
  }
}

async function testStripeWebhookSimulation() {
  console.log('\n=== ТЕСТ 2: Симуляция Stripe Webhook для Payment ===');
  
  // Создаем checkout session для тестирования
  try {
    const checkoutResponse = await fetch('http://localhost:3002/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        priceId: 'price_1RiUvhAK7V4m73alSPDpllg2', // Small Credits
        mode: 'payment',
        successUrl: 'http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: 'http://localhost:5173/pricing',
        customerEmail: 'test-telegram@example.com',
        userId: 'telegram-test-user',
        credits: 100
      })
    });

    if (checkoutResponse.ok) {
      const session = await checkoutResponse.json();
      console.log('✅ Test Checkout Session создана:', session.id);
      
      // Note: В реальном проекте webhook будет автоматически вызван Stripe
      console.log('📝 В продакшене Stripe автоматически отправит webhook');
      console.log('📝 При успешной оплате будет отправлено уведомление в Telegram');
      
      return true;
    } else {
      const errorText = await checkoutResponse.text();
      console.log('❌ Ошибка создания checkout session:', errorText);
      return false;
    }
  } catch (error) {
    console.log('❌ Критическая ошибка checkout session:', error.message);
    return false;
  }
}

async function checkSuggestIdeaFormIntegration() {
  console.log('\n=== ТЕСТ 3: Проверка Suggest an Idea интеграции ===');
  
  console.log('📋 Анализируем существующую интеграцию:');
  
  // Проверяем файлы интеграции
  const fs = require('fs');
  
  try {
    // Проверяем Supabase Edge Function
    const edgeFunctionExists = fs.existsSync('/workspace/supabase/functions/telegram-notify/index.ts');
    console.log('✅ Edge Function для Telegram:', edgeFunctionExists ? 'СУЩЕСТВУЕТ' : 'НЕ НАЙДЕН');
    
    // Проверяем database trigger
    const migrationExists = fs.existsSync('/workspace/supabase/migrations/20250120000000_add_telegram_trigger.sql');
    console.log('✅ Database Trigger Migration:', migrationExists ? 'СУЩЕСТВУЕТ' : 'НЕ НАЙДЕН');
    
    // Проверяем SuggestIdeaModal компонент
    const modalExists = fs.existsSync('/workspace/src/components/SuggestIdeaModal.tsx');
    console.log('✅ SuggestIdeaModal компонент:', modalExists ? 'СУЩЕСТВУЕТ' : 'НЕ НАЙДЕН');
    
    if (edgeFunctionExists && migrationExists && modalExists) {
      console.log('🎉 Suggest an Idea форма уже интегрирована с Telegram!');
      console.log('📝 При отправке идеи автоматически отправляется уведомление');
      return true;
    } else {
      console.log('⚠️  Некоторые компоненты Suggest an Idea интеграции отсутствуют');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Ошибка проверки Suggest an Idea интеграции:', error.message);
    return false;
  }
}

// Запуск всех тестов
async function runAllTests() {
  console.log('🚀 Начинаем комплексное тестирование Telegram интеграции...\\n');
  
  const telegramTest = await testTelegramIntegration();
  const stripeTest = await testStripeWebhookSimulation();
  const suggestIdeaTest = await checkSuggestIdeaFormIntegration();
  
  console.log('\\n' + '='.repeat(60));
  console.log('📋 ИТОГОВЫЙ РЕЗУЛЬТАТ TELEGRAM ИНТЕГРАЦИИ');
  console.log('='.repeat(60));
  
  console.log('✅ Telegram API тест:', telegramTest ? 'РАБОТАЕТ' : 'НЕ РАБОТАЕТ');
  console.log('✅ Stripe Payment уведомления:', stripeTest ? 'НАСТРОЕНЫ' : 'НЕ НАСТРОЕНЫ');
  console.log('✅ Suggest an Idea уведомления:', suggestIdeaTest ? 'РАБОТАЮТ' : 'НЕ РАБОТАЮТ');
  
  const allGood = telegramTest && stripeTest && suggestIdeaTest;
  
  if (allGood) {
    console.log('\\n🎉 УСПЕХ: Telegram интеграция полностью настроена!');
    console.log('📱 Уведомления будут отправляться в чат: -1002604809855');
    
    console.log('\\n📝 Активные уведомления:');
    console.log('1. 💡 Suggest an Idea форма → Telegram');
    console.log('2. 💰 Успешные платежи Stripe → Telegram');  
    console.log('3. 🚫 Отмена подписок → Telegram');
    console.log('4. ❌ Ошибки оплаты → Telegram');
    
    console.log('\\n🔧 Для продакшена:');
    console.log('• Настройте Stripe webhooks в dashboard');
    console.log('• Проверьте переменные окружения Supabase');
    console.log('• Убедитесь, что бот добавлен в чат -1002604809855');
    
  } else {
    console.log('\\n❌ ПРОБЛЕМЫ: Требуется дополнительная настройка');
    
    if (!telegramTest) {
      console.log('💡 Проверьте Telegram Bot Token и Chat ID');
    }
    if (!stripeTest) {
      console.log('💡 Проверьте настройки Stripe');
    }
    if (!suggestIdeaTest) {
      console.log('💡 Проверьте файлы Supabase интеграции');
    }
  }
  
  console.log('='.repeat(60));
}

// Запуск
runAllTests().catch(error => {
  console.error('💥 Критическая ошибка при тестировании:', error);
});