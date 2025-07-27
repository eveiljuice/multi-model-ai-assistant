// Диагностический скрипт для проверки проблемы с новым пользователем
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

async function debugUserIssue(userEmail) {
  console.log(`🔍 Диагностика пользователя: ${userEmail}`);
  console.log('=' .repeat(50));

  try {
    // 1. Проверяем существование пользователя в auth.users
    console.log('\n1. Проверка auth.users...');
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, created_at, email_confirmed_at, deleted_at')
      .eq('email', userEmail);

    if (authError) {
      console.error('❌ Ошибка при проверке auth.users:', authError);
      
      // Альтернативный способ через RPC
      console.log('Пробуем через admin API...');
      const { data: adminUsers, error: adminError } = await supabase.auth.admin.listUsers();
      
      if (adminError) {
        console.error('❌ Ошибка admin API:', adminError);
      } else {
        const user = adminUsers.users.find(u => u.email === userEmail);
        if (user) {
          console.log('✅ Пользователь найден через admin API:', {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            email_confirmed_at: user.email_confirmed_at
          });
        } else {
          console.log('❌ Пользователь не найден через admin API');
        }
      }
    } else {
      if (authUsers && authUsers.length > 0) {
        console.log('✅ Пользователь найден в auth.users:', authUsers[0]);
      } else {
        console.log('❌ Пользователь не найден в auth.users');
        return;
      }
    }

    // Получаем ID пользователя для дальнейших проверок
    let userId = null;
    if (authUsers && authUsers.length > 0) {
      userId = authUsers[0].id;
    } else {
      // Пробуем получить через admin API
      const { data: adminUsers } = await supabase.auth.admin.listUsers();
      const user = adminUsers?.users.find(u => u.email === userEmail);
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      console.log('❌ Не удалось получить ID пользователя');
      return;
    }

    console.log(`\n📋 ID пользователя: ${userId}`);

    // 2. Проверяем запись в таблице credits
    console.log('\n2. Проверка таблицы credits...');
    const { data: credits, error: creditsError } = await supabase
      .from('credits')
      .select('*')
      .eq('user_id', userId);

    if (creditsError) {
      console.error('❌ Ошибка при проверке credits:', creditsError);
    } else {
      if (credits && credits.length > 0) {
        console.log('✅ Запись в credits найдена:', credits[0]);
      } else {
        console.log('❌ Запись в credits не найдена');
        
        // Пробуем инициализировать кредиты
        console.log('\n🔧 Попытка инициализации кредитов...');
        const { data: initResult, error: initError } = await supabase
          .rpc('initialize_user_trial_credits', { user_uuid: userId });
        
        if (initError) {
          console.error('❌ Ошибка инициализации кредитов:', initError);
        } else {
          console.log('✅ Результат инициализации:', initResult);
        }
      }
    }

    // 3. Проверяем транзакции кредитов
    console.log('\n3. Проверка credit_transactions...');
    const { data: transactions, error: transError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (transError) {
      console.error('❌ Ошибка при проверке transactions:', transError);
    } else {
      if (transactions && transactions.length > 0) {
        console.log('✅ Транзакции найдены:', transactions);
      } else {
        console.log('❌ Транзакции не найдены');
      }
    }

    // 4. Проверяем error_logs
    console.log('\n4. Проверка error_logs...');
    const { data: errorLogs, error: errorLogsError } = await supabase
      .from('error_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (errorLogsError) {
      console.error('❌ Ошибка при проверке error_logs:', errorLogsError);
    } else {
      if (errorLogs && errorLogs.length > 0) {
        console.log('✅ Логи ошибок найдены:', errorLogs);
      } else {
        console.log('❌ Логи ошибок не найдены');
      }
    }

    // 5. Тестируем списание кредитов
    console.log('\n5. Тест списания кредитов...');
    const { data: deductResult, error: deductError } = await supabase
      .rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: 1,
        p_agent_id: 'test-agent',
        p_description: 'Test deduction'
      });

    if (deductError) {
      console.error('❌ Ошибка списания кредитов:', deductError);
    } else {
      console.log('✅ Результат списания кредитов:', deductResult);
    }

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

// Запуск диагностики
const userEmail = process.argv[2];
if (!userEmail) {
  console.log('Использование: node debug-user-issue.js <email>');
  process.exit(1);
}

debugUserIssue(userEmail);