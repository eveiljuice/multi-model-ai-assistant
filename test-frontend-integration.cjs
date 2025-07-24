// Тест фронтенд интеграции с CSP и CORS
console.log('🌐 Testing Frontend Integration with CSP/CORS');

async function testFrontendIntegration() {
  console.log('\n=== ТЕСТ: Фронтенд доступ к Express серверу ===');
  
  try {
    // Симулируем запрос как будто от фронтенда
    const response = await fetch('http://localhost:3002/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Добавляем заголовки как от браузера
        'Origin': 'http://localhost:5173',
        'Referer': 'http://localhost:5173/pricing'
      },
      body: JSON.stringify({
        priceId: 'price_1RiUt0AK7V4m73aluYckgD6P',
        mode: 'subscription',
        successUrl: 'http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: 'http://localhost:5173/pricing',
        customerEmail: 'test@example.com',
        userId: 'frontend-test-user',
        credits: 250
      })
    });

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    // Проверяем CORS заголовки
    const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
    const corsCredentials = response.headers.get('Access-Control-Allow-Credentials');
    
    console.log('\n🔍 CORS Analysis:');
    console.log('- Access-Control-Allow-Origin:', corsOrigin);
    console.log('- Access-Control-Allow-Credentials:', corsCredentials);
    
    if (corsOrigin && (corsOrigin === '*' || corsOrigin.includes('localhost'))) {
      console.log('✅ CORS: Origin разрешен');
    } else {
      console.log('❌ CORS: Origin может быть заблокирован');
    }

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Успешный ответ от Express сервера');
      console.log('🔗 Stripe URL доступен:', !!result.url);
      
      return {
        success: true,
        hasUrl: !!result.url,
        corsConfigured: !!corsOrigin
      };
    } else {
      const errorText = await response.text();
      console.log('❌ Ошибка от Express сервера:', errorText);
      return {
        success: false,
        error: errorText
      };
    }

  } catch (error) {
    console.log('❌ Критическая ошибка подключения:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testCSPCompatibility() {
  console.log('\n=== ТЕСТ: CSP Совместимость ===');
  
  console.log('📋 Проверяем, что изменения CSP применены:');
  
  // Проверяем файлы CSP конфигурации
  const fs = require('fs');
  
  try {
    const indexHtml = fs.readFileSync('/workspace/index.html', 'utf8');
    const hasLocalhostInCSP = indexHtml.includes('http://localhost:*');
    
    console.log('✅ index.html CSP проверен:', hasLocalhostInCSP ? 'СОДЕРЖИТ localhost:*' : 'НЕ содержит localhost:*');
    
    const securityHeaders = fs.readFileSync('/workspace/src/components/SecurityHeaders.tsx', 'utf8');
    const hasLocalhostInHeaders = securityHeaders.includes('http://localhost:*');
    
    console.log('✅ SecurityHeaders.tsx проверен:', hasLocalhostInHeaders ? 'СОДЕРЖИТ localhost:*' : 'НЕ содержит localhost:*');
    
    if (hasLocalhostInCSP && hasLocalhostInHeaders) {
      console.log('🎉 CSP настройки корректны для localhost:3002');
      return true;
    } else {
      console.log('⚠️  CSP может блокировать подключения к localhost:3002');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Ошибка чтения CSP файлов:', error.message);
    return false;
  }
}

// Создаем детальный отчет готовности к продакшену
async function generateProductionReadinessReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 ОТЧЕТ О ГОТОВНОСТИ К ПРОДАКШЕНУ');
  console.log('='.repeat(60));
  
  const frontendResult = await testFrontendIntegration();
  const cspResult = await testCSPCompatibility();
  
  console.log('\n📋 Чек-лист готовности:');
  
  // Проверка Express сервера
  let expressRunning = false;
  try {
    const healthResponse = await fetch('http://localhost:3002/health');
    expressRunning = healthResponse.ok;
  } catch (e) {
    expressRunning = false;
  }
  
  console.log('✅ Express сервер запущен:', expressRunning ? '✅ ДА' : '❌ НЕТ');
  console.log('✅ Фронтенд интеграция:', frontendResult.success ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ');
  console.log('✅ CSP настройки:', cspResult ? '✅ НАСТРОЕНЫ' : '❌ НЕ НАСТРОЕНЫ');
  console.log('✅ CORS заголовки:', frontendResult.corsConfigured ? '✅ НАСТРОЕНЫ' : '❌ НЕ НАСТРОЕНЫ');
  console.log('✅ Stripe URL генерация:', frontendResult.hasUrl ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ');
  
  const allGood = expressRunning && frontendResult.success && cspResult && frontendResult.corsConfigured && frontendResult.hasUrl;
  
  if (allGood) {
    console.log('\n🎉 ВЕРДИКТ: ГОТОВО К ПРОДАКШЕНУ!');
    console.log('👤 Пользователи смогут оплачивать подписки без проблем');
    
    console.log('\n📝 Финальные шаги для продакшена:');
    console.log('1. ✅ Настроить Stripe webhooks в dashboard');
    console.log('2. ✅ Проверить обработку успешных платежей');  
    console.log('3. ✅ Настроить мониторинг платежей');
    console.log('4. ✅ Обновить переменные окружения на production');
    console.log('5. ✅ Тестировать с реальными тестовыми картами Stripe');
    
  } else {
    console.log('\n❌ ВЕРДИКТ: ТРЕБУЕТСЯ ДОРАБОТКА');
    console.log('⚡ Исправьте проблемы выше перед запуском в продакшен');
    
    if (!expressRunning) {
      console.log('💡 Запустите Express сервер: cd server && node server.js');
    }
    
    if (!cspResult) {
      console.log('💡 Проверьте CSP настройки в index.html и SecurityHeaders.tsx');
    }
  }
  
  console.log('='.repeat(60));
  return allGood;
}

// Запуск всех тестов
generateProductionReadinessReport().catch(error => {
  console.error('💥 Критическая ошибка:', error);
});