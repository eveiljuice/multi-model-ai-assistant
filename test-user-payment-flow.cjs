// Комплексный тест процесса оплаты как настоящий пользователь
const express = require('express');
const cors = require('cors');

// Проверим, что Express сервер работает правильно
console.log('🧪 Testing Stripe Payment Flow as Real User');

async function testCompletePaymentFlow() {
  console.log('\n=== ТЕСТ 1: Проверка Express сервера ===');
  
  try {
    const response = await fetch('http://localhost:3002/health');
    const health = await response.json();
    console.log('✅ Express Server Health:', health);
    
    if (!health.stripe_configured) {
      console.error('❌ КРИТИЧНО: Stripe не настроен в Express сервере!');
      return false;
    }
  } catch (error) {
    console.error('❌ КРИТИЧНО: Express сервер недоступен!', error.message);
    console.log('💡 Запустите сервер: cd server && node server.js');
    return false;
  }

  console.log('\n=== ТЕСТ 2: Создание Checkout Session ===');
  
  try {
    const checkoutData = {
      priceId: 'price_1RiUt0AK7V4m73aluYckgD6P', // Monthly Subscription
      mode: 'subscription',
      successUrl: 'http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'http://localhost:5173/pricing',
      customerEmail: 'test@example.com',
      userId: 'test-user-' + Date.now(),
      credits: 250
    };

    console.log('📤 Отправляем данные:', checkoutData);

    const response = await fetch('http://localhost:3002/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ошибка создания session:', response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log('✅ Checkout Session создана:', {
      sessionId: result.id,
      url: result.url ? result.url.substring(0, 80) + '...' : 'NO URL'
    });

    if (!result.url) {
      console.error('❌ КРИТИЧНО: Нет URL для редиректа!');
      return false;
    }

    console.log('\n=== ТЕСТ 3: Анализ Stripe URL ===');
    
    // Проверим, что URL валидный для Stripe
    if (result.url.includes('checkout.stripe.com')) {
      console.log('✅ URL ведет на официальный Stripe Checkout');
      
      // Извлечем session ID из URL
      const sessionIdMatch = result.url.match(/cs_[a-zA-Z0-9_]+/);
      if (sessionIdMatch) {
        console.log('✅ Session ID найден:', sessionIdMatch[0]);
      }
      
      // Проверим, что это live session (начинается с cs_live)
      if (result.url.includes('cs_live')) {
        console.log('⚠️  ВНИМАНИЕ: Используется LIVE Stripe session (реальные деньги!)');
        console.log('💡 Для тестирования используйте test ключи (cs_test)');
      }
      
    } else {
      console.error('❌ КРИТИЧНО: URL не ведет на Stripe Checkout!');
      return false;
    }

    return true;

  } catch (error) {
    console.error('❌ Ошибка тестирования checkout:', error.message);
    return false;
  }
}

async function testDifferentProducts() {
  console.log('\n=== ТЕСТ 4: Тестирование разных продуктов ===');
  
  const products = [
    { id: 'monthly-subscription', priceId: 'price_1RiUt0AK7V4m73aluYckgD6P', name: 'Monthly Subscription' },
    { id: 'small-topup', priceId: 'price_1RiUvhAK7V4m73alSPDpllg2', name: 'Small Credits' },
    { id: 'medium-topup', priceId: 'price_1RiUxdAK7V4m73alz8Oad0YH', name: 'Medium Credits' },
    { id: 'xxl-topup', priceId: 'price_1RiUyPAK7V4m73alBCuO8sYC', name: 'XXL Credits' }
  ];

  let successCount = 0;

  for (const product of products) {
    try {
      console.log(`\n🧪 Тестируем: ${product.name}`);
      
      const response = await fetch('http://localhost:3002/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: product.priceId,
          mode: product.id.includes('subscription') ? 'subscription' : 'payment',
          successUrl: 'http://localhost:5173/success',
          cancelUrl: 'http://localhost:5173/pricing',
          customerEmail: 'test@example.com',
          userId: 'test-user'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${product.name}: Session создан`);
        successCount++;
      } else {
        console.log(`❌ ${product.name}: Ошибка ${response.status}`);
      }

    } catch (error) {
      console.log(`❌ ${product.name}: Exception - ${error.message}`);
    }
  }

  console.log(`\n📊 Результат: ${successCount}/${products.length} продуктов работают`);
  return successCount === products.length;
}

// Запуск тестов
async function runAllTests() {
  console.log('🚀 Начинаем полное тестирование процесса оплаты...\n');
  
  const basicFlowPassed = await testCompletePaymentFlow();
  const allProductsPassed = await testDifferentProducts();
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 ИТОГОВЫЙ РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ');
  console.log('='.repeat(60));
  
  console.log('✅ Базовый процесс оплаты:', basicFlowPassed ? 'РАБОТАЕТ' : 'НЕ РАБОТАЕТ');
  console.log('✅ Все продукты Stripe:', allProductsPassed ? 'РАБОТАЮТ' : 'НЕ РАБОТАЮТ');
  
  if (basicFlowPassed && allProductsPassed) {
    console.log('\n🎉 УСПЕХ: Stripe интеграция готова к продакшену!');
    console.log('👤 Пользователи смогут успешно оплачивать подписки');
    console.log('\n📝 Рекомендации для продакшена:');
    console.log('1. Убедитесь, что webhook настроен в Stripe Dashboard');
    console.log('2. Проверьте обработку успешных платежей');
    console.log('3. Настройте мониторинг транзакций');
    console.log('4. Добавьте обработку ошибок платежей');
  } else {
    console.log('\n❌ ПРОБЛЕМЫ: Требуется дополнительная настройка');
    console.log('💡 Проверьте логи выше для диагностики проблем');
  }
  
  console.log('='.repeat(60));
}

// Запуск
runAllTests().catch(error => {
  console.error('💥 Критическая ошибка при тестировании:', error);
});