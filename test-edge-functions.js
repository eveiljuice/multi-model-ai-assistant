import https from 'https';

const SUPABASE_URL = 'https://sgzlhcagtesjazvwskjw.supabase.co';

async function testEndpoint(path, description) {
    return new Promise((resolve) => {
        const url = `${SUPABASE_URL}/functions/v1/${path}`;
        console.log(`\nТестирую: ${description}`);
        console.log(`URL: ${url}`);
        
        const startTime = Date.now();
        
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer invalid_token'
            }
        }, (res) => {
            const responseTime = Date.now() - startTime;
            console.log(`✅ Статус: ${res.statusCode} (${res.statusMessage})`);
            console.log(`⏱️ Время ответа: ${responseTime}ms`);
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log(`📝 Ответ:`, response);
                } catch (e) {
                    console.log(`📝 Ответ (raw):`, data.substring(0, 200));
                }
                resolve({ status: res.statusCode, responseTime, working: true });
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ Ошибка:`, error.message);
            resolve({ error: error.message, working: false });
        });
        
        req.on('timeout', () => {
            console.log(`⏰ Timeout`);
            req.destroy();
            resolve({ error: 'Timeout', working: false });
        });
        
        req.setTimeout(10000); // 10 секунд timeout
        
        // Отправляем тестовый JSON
        req.write(JSON.stringify({ test: true }));
        req.end();
    });
}

async function runTests() {
    console.log('🔍 Тестирование Edge Functions\n');
    console.log('=' * 50);
    
    const functions = [
        { path: 'stripe-checkout', description: 'Stripe Checkout Session' },
        { path: 'stripe-webhook', description: 'Stripe Webhook Handler' },
        { path: 'webhook-handler', description: 'Alternative Webhook Handler' },
        { path: 'credit-meter', description: 'Credit Deduction' },
        { path: 'ai-proxy', description: 'AI Proxy Service' },
        { path: 'telegram-notify', description: 'Telegram Notifications' }
    ];
    
    const results = [];
    
    for (const func of functions) {
        const result = await testEndpoint(func.path, func.description);
        results.push({ ...func, ...result });
        
        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n' + '=' * 50);
    console.log('📊 СВОДКА РЕЗУЛЬТАТОВ:');
    console.log('=' * 50);
    
    results.forEach(result => {
        const status = result.working ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ';
        const time = result.responseTime ? `(${result.responseTime}ms)` : '';
        console.log(`${result.description}: ${status} ${time}`);
        if (result.error) {
            console.log(`   Ошибка: ${result.error}`);
        }
    });
    
    const workingCount = results.filter(r => r.working).length;
    console.log(`\n📈 Работающих функций: ${workingCount}/${results.length}`);
    
    if (workingCount === results.length) {
        console.log('🎉 Все Edge Functions доступны!');
    } else {
        console.log('⚠️ Некоторые функции недоступны');
    }
}

runTests().catch(console.error); 