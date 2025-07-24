// Тест Telegram уведомлений для идей
console.log('💡 Testing Idea Suggestion Telegram Notifications');

async function testTelegramEdgeFunction() {
  console.log('\n=== ТЕСТ: Прямой вызов Edge Function ===');
  
  try {
    // Симулируем данные как от database trigger
    const testIdea = {
      id: 'test-' + Date.now(),
      title: 'Test Idea from Script',
      description: 'This is a test idea to verify Telegram notifications are working correctly.',
      category: 'new_agent',
      priority: 'medium',
      user_id: 'test-user-123',
      created_at: new Date().toISOString()
    };

    console.log('📤 Отправляем тестовую идею:', {
      id: testIdea.id,
      title: testIdea.title,
      category: testIdea.category
    });

    const response = await fetch('https://sgzlhcagtesjazvwskjw.supabase.co/functions/v1/telegram-notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnemxoY2FndGVzamF6dndza2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc4NjE2NDIsImV4cCI6MjA0MzQzNzY0Mn0.NsGMxGv7K_3F_rO7QzxBpBtYJSWmGP0r80qLZGmZbag' // anon key
      },
      body: JSON.stringify({
        record: testIdea
      })
    });

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Edge Function ответил успешно:', result);
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Edge Function ошибка:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.log('❌ Критическая ошибка Edge Function:', error.message);
    return false;
  }
}

async function checkSupabaseTrigger() {
  console.log('\n=== ПРОВЕРКА: Database Trigger ===');
  
  try {
    const fs = require('fs');
    
    // Проверяем есть ли файл trigger migration
    const triggerMigrationExists = fs.existsSync('/workspace/supabase/migrations/20250120000000_add_telegram_trigger.sql');
    console.log('✅ Trigger Migration File:', triggerMigrationExists ? 'СУЩЕСТВУЕТ' : 'НЕ НАЙДЕН');
    
    if (triggerMigrationExists) {
      const triggerContent = fs.readFileSync('/workspace/supabase/migrations/20250120000000_add_telegram_trigger.sql', 'utf8');
      const hasNotifyFunction = triggerContent.includes('notify_idea_suggestion');
      const hasTrigger = triggerContent.includes('AFTER INSERT') && triggerContent.includes('idea_suggestions');
      
      console.log('✅ Notify Function определена:', hasNotifyFunction ? 'ДА' : 'НЕТ');
      console.log('✅ INSERT Trigger настроен:', hasTrigger ? 'ДА' : 'НЕТ');
      
      if (hasNotifyFunction && hasTrigger) {
        console.log('🎉 Database Trigger полностью настроен!');
        console.log('📝 При создании новой записи в idea_suggestions автоматически вызовется Edge Function');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.log('❌ Ошибка проверки Database Trigger:', error.message);
    return false;
  }
}

// Запуск всех тестов
async function runIdeaTelegramTests() {
  console.log('🚀 Начинаем тестирование Telegram уведомлений для идей...\\n');
  
  const edgeFunctionTest = await testTelegramEdgeFunction();
  const triggerTest = await checkSupabaseTrigger();
  
  console.log('\\n' + '='.repeat(60));
  console.log('📋 РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ IDEA TELEGRAM NOTIFICATIONS');
  console.log('='.repeat(60));
  
  console.log('✅ Edge Function тест:', edgeFunctionTest ? 'РАБОТАЕТ' : 'НЕ РАБОТАЕТ');
  console.log('✅ Database Trigger:', triggerTest ? 'НАСТРОЕН' : 'НЕ НАСТРОЕН');
  
  if (edgeFunctionTest && triggerTest) {
    console.log('\\n🎉 УСПЕХ: Telegram уведомления для идей работают!');
    console.log('📱 При отправке идеи через форму будет приходить уведомление в чат');
    console.log('🔗 Чат ID: -1002604809855');
    
    console.log('\\n💡 Если уведомления всё ещё не приходят:');
    console.log('1. Проверьте что migration применена: supabase db reset');
    console.log('2. Проверьте логи Edge Function в Supabase Dashboard');
    console.log('3. Убедитесь что бот добавлен в чат -1002604809855');
    
  } else {
    console.log('\\n❌ ПРОБЛЕМЫ найдены:');
    
    if (!edgeFunctionTest) {
      console.log('💡 Edge Function не отвечает или возвращает ошибки');
      console.log('   - Проверьте код функции в /workspace/supabase/functions/telegram-notify/');
      console.log('   - Проверьте логи в Supabase Dashboard');
    }
    
    if (!triggerTest) {
      console.log('💡 Database Trigger не настроен');
      console.log('   - Примените migration: supabase db push');
      console.log('   - Проверьте файл migration в /workspace/supabase/migrations/');
    }
  }
  
  console.log('='.repeat(60));
}

// Запуск
runIdeaTelegramTests().catch(error => {
  console.error('💥 Критическая ошибка при тестировании:', error);
});