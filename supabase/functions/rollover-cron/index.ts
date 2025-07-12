import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Используем service_role_key для административных задач
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', 
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Проверка секрета для защиты эндпоинта
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_CRON_SECRET')}`) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    // Получаем всех подписчиков для обработки
    const { data: users, error: usersError } = await supabaseClient
      .from('credits')
      .select('user_id, balance, last_rollover')
      .not('last_rollover', 'is', null) // Только подписчики

    if (usersError) throw usersError

    let processedUsers = 0
    let totalRollover = 0

    // Запускаем ролловер для каждого пользователя
    for (const user of users) {
      try {
        const { data: rolloverAmount, error: rolloverError } = await supabaseClient.rpc('process_credit_rollover', {
          p_user_id: user.user_id,
        })

        if (!rolloverError) {
          processedUsers++
          totalRollover += rolloverAmount || 0
        }
      } catch (error) {
        console.error(`Error processing rollover for user ${user.user_id}:`, error)
      }
    }

    // Добавляем новых пользователей с 250 кредитами за подписку
    const { data: newSubscribers, error: newSubError } = await supabaseClient
      .from('credit_transactions')
      .select('user_id')
      .eq('type', 'subscription')
      .gte('created_at', new Date(new Date().setDate(1)).toISOString()) // Текущий месяц

    if (!newSubError && newSubscribers) {
      for (const subscriber of newSubscribers) {
        await supabaseClient.rpc('add_credits', {
          p_user_id: subscriber.user_id,
          p_amount: 250,
          p_type: 'subscription',
          p_description: 'Monthly subscription credits'
        })
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed_users: processedUsers,
      total_rollover: totalRollover,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}) 