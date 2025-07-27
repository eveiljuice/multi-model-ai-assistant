// Скрипт для исправления проблемы с кредитами нового пользователя
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserCreditsIssue(userEmail) {
  console.log(`🔧 Исправление проблемы для пользователя: ${userEmail}`);
  console.log('=' .repeat(50));

  try {
    // 1. Найти пользователя
    console.log('\n1. Поиск пользователя...');
    const { data: adminUsers, error: adminError } = await supabase.auth.admin.listUsers();
    
    if (adminError) {
      console.error('❌ Ошибка получения пользователей:', adminError);
      return;
    }

    const user = adminUsers.users.find(u => u.email === userEmail);
    if (!user) {
      console.log('❌ Пользователь не найден');
      return;
    }

    console.log('✅ Пользователь найден:', {
      id: user.id,
      email: user.email,
      created_at: user.created_at
    });

    const userId = user.id;

    // 2. Проверить существование записи в credits
    console.log('\n2. Проверка записи в credits...');
    const { data: existingCredits, error: creditsCheckError } = await supabase
      .from('credits')
      .select('*')
      .eq('user_id', userId);

    if (creditsCheckError) {
      console.error('❌ Ошибка проверки credits:', creditsCheckError);
      return;
    }

    if (existingCredits && existingCredits.length > 0) {
      console.log('✅ Запись в credits уже существует:', existingCredits[0]);
    } else {
      console.log('❌ Запись в credits отсутствует, создаем...');
      
      // 3. Создать запись в credits
      const { data: newCredits, error: createCreditsError } = await supabase
        .from('credits')
        .insert([{
          user_id: userId,
          balance: 5, // Пробные кредиты
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (createCreditsError) {
        console.error('❌ Ошибка создания credits:', createCreditsError);
        return;
      }

      console.log('✅ Запись в credits создана:', newCredits[0]);

      // 4. Создать транзакцию
      const { data: transaction, error: transactionError } = await supabase
        .from('credit_transactions')
        .insert([{
          user_id: userId,
          amount: 5,
          type: 'trial',
          description: 'Initial trial credits - manual fix',
          created_at: new Date().toISOString()
        }])
        .select();

      if (transactionError) {
        console.error('❌ Ошибка создания транзакции:', transactionError);
      } else {
        console.log('✅ Транзакция создана:', transaction[0]);
      }
    }

    // 5. Проверить user_activity
    console.log('\n3. Проверка user_activity...');
    const { data: existingActivity, error: activityCheckError } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', userId);

    if (activityCheckError) {
      console.error('❌ Ошибка проверки user_activity:', activityCheckError);
    } else if (!existingActivity || existingActivity.length === 0) {
      console.log('❌ Запись в user_activity отсутствует, создаем...');
      
      const { data: newActivity, error: createActivityError } = await supabase
        .from('user_activity')
        .insert([{
          user_id: userId,
          last_active: new Date().toISOString(),
          weekly_logins: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (createActivityError) {
        console.error('❌ Ошибка создания user_activity:', createActivityError);
      } else {
        console.log('✅ Запись в user_activity создана:', newActivity[0]);
      }
    } else {
      console.log('✅ Запись в user_activity существует:', existingActivity[0]);
    }

    // 6. Тест списания кредитов
    console.log('\n4. Тест списания кредитов...');
    const { data: deductResult, error: deductError } = await supabase
      .rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: 1,
        p_agent_id: 'test-agent',
        p_description: 'Test deduction after fix'
      });

    if (deductError) {
      console.error('❌ Ошибка списания кредитов:', deductError);
    } else {
      console.log('✅ Списание кредитов работает:', deductResult);
    }

    // 7. Тест логирования ошибок
    console.log('\n5. Тест логирования ошибок...');
    const { data: logResult, error: logError } = await supabase
      .from('error_logs')
      .insert([{
        user_id: userId,
        session_id: 'test-session',
        error_type: 'test_error',
        error_message: 'Test error message',
        component: 'fix-script',
        severity: 'low'
      }])
      .select();

    if (logError) {
      console.error('❌ Ошибка логирования:', logError);
    } else {
      console.log('✅ Логирование работает:', logResult[0]);
      
      // Удаляем тестовую запись
      await supabase
        .from('error_logs')
        .delete()
        .eq('id', logResult[0].id);
    }

    console.log('\n🎉 Исправление завершено!');

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

// Запуск исправления
const userEmail = process.argv[2];
if (!userEmail) {
  console.log('Использование: node fix-user-credits-issue.js <email>');
  process.exit(1);
}

fixUserCreditsIssue(userEmail);