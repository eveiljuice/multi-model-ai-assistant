// Скрипт для получения всех пользователей через Admin API
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

async function listAllUsers() {
  console.log('🔍 Получение всех пользователей через Admin API...');
  console.log('=' .repeat(60));

  try {
    // Получаем всех пользователей через Admin API
    const { data: adminUsers, error: adminError } = await supabase.auth.admin.listUsers();
    
    if (adminError) {
      console.error('❌ Ошибка Admin API:', adminError);
      return;
    }

    console.log(`📊 Всего пользователей: ${adminUsers.users.length}`);
    console.log('\n👥 Список пользователей:');
    console.log('-'.repeat(60));

    adminUsers.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email || 'No email'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Создан: ${user.created_at}`);
      console.log(`   Email подтвержден: ${user.email_confirmed_at ? '✅' : '❌'}`);
      console.log(`   Последний вход: ${user.last_sign_in_at || 'Никогда'}`);
      console.log('');
    });

    // Проверяем каких пользователей нет в credits
    console.log('\n🔍 Проверка пользователей без кредитов...');
    console.log('-'.repeat(60));

    for (const user of adminUsers.users) {
      const { data: credits, error: creditsError } = await supabase
        .from('credits')
        .select('balance, created_at')
        .eq('user_id', user.id)
        .single();

      if (creditsError || !credits) {
        console.log(`❌ ${user.email || user.id} - НЕТ КРЕДИТОВ`);
        
        // Попробуем инициализировать кредиты
        console.log(`   🔧 Попытка инициализации кредитов...`);
        const { data: initResult, error: initError } = await supabase
          .rpc('initialize_user_trial_credits_safe', { user_uuid: user.id });
        
        if (initError) {
          console.log(`   ❌ Ошибка инициализации: ${initError.message}`);
        } else if (initResult) {
          console.log(`   ✅ Кредиты инициализированы`);
        } else {
          console.log(`   ⚠️  Инициализация не выполнена (возможно уже есть кредиты)`);
        }
      } else {
        console.log(`✅ ${user.email || user.id} - ${credits.balance} кредитов`);
      }
    }

    // Статистика
    const usersWithoutCredits = [];
    for (const user of adminUsers.users) {
      const { data: credits } = await supabase
        .from('credits')
        .select('user_id')
        .eq('user_id', user.id)
        .single();
      
      if (!credits) {
        usersWithoutCredits.push(user);
      }
    }

    console.log('\n📈 Статистика:');
    console.log('-'.repeat(60));
    console.log(`Всего пользователей: ${adminUsers.users.length}`);
    console.log(`Пользователей без кредитов: ${usersWithoutCredits.length}`);
    console.log(`Пользователей с кредитами: ${adminUsers.users.length - usersWithoutCredits.length}`);

    if (usersWithoutCredits.length > 0) {
      console.log('\n⚠️  Пользователи без кредитов:');
      usersWithoutCredits.forEach(user => {
        console.log(`   - ${user.email || user.id} (создан: ${user.created_at})`);
      });
    }

  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

// Запуск
listAllUsers();