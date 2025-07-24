# Мастер-промпт для защиты Multi-Model AI Assistant

## 🔐 КРИТИЧЕСКИЕ УЯЗВИМОСТИ И ЗАЩИТА

### 1. ЗАЩИТА API КЛЮЧЕЙ
```typescript
// ❌ УЯЗВИМОСТЬ: Потенциальная утечка через логи
console.log('API Response:', response); // Может содержать ключи

// ✅ ЗАЩИТА: Фильтрация чувствительных данных
const sanitizeLog = (data: any) => {
  const sensitive = ['api_key', 'secret', 'token', 'password'];
  return JSON.stringify(data, (key, value) => 
    sensitive.some(s => key.toLowerCase().includes(s)) ? '[REDACTED]' : value
  );
};
```

### 2. ЗАЩИТА CREDIT DEDUCTION SYSTEM
```sql
-- ❌ УЯЗВИМОСТЬ: Race condition в дедукции кредитов
BEGIN;
SELECT credits FROM credit_wallets WHERE user_id = $1;
UPDATE credit_wallets SET credits = credits - $2 WHERE user_id = $1;
COMMIT;

-- ✅ ЗАЩИТА: Atomic update с проверкой
UPDATE credit_wallets 
SET credits = credits - $2 
WHERE user_id = $1 AND credits >= $2
RETURNING credits;
```

### 3. ЗАЩИТА EDGE FUNCTIONS
```typescript
// Supabase Edge Function Security Template
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

export default async function handler(req: Request) {
  // 1. CORS Protection
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Authentication Validation
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 3. JWT Token Validation
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (error || !user) {
    return new Response('Invalid token', { status: 401 });
  }

  // 4. Rate Limiting Check
  const rateLimit = await checkRateLimit(user.id);
  if (rateLimit.exceeded) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  // 5. Input Validation
  const body = await req.json();
  const validatedInput = await validateInput(body);
  if (!validatedInput.valid) {
    return new Response('Invalid input', { status: 400 });
  }

  try {
    // 6. Business Logic with Audit
    const result = await processRequest(validatedInput.data, user.id);
    await auditLog(user.id, 'function_call', { function: 'ai-proxy', result });
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // 7. Error Handling
    console.error('Function error:', error);
    await auditLog(user.id, 'function_error', { error: error.message });
    return new Response('Internal server error', { status: 500 });
  }
}
```

### 4. ЗАЩИТА STRIPE WEBHOOK
```typescript
// Stripe Webhook Security
import { stripe } from '../_shared/stripe.ts';

export default async function handler(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  
  let event;
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  // Idempotency protection
  const idempotencyKey = req.headers.get('stripe-idempotency-key');
  if (idempotencyKey) {
    const existing = await checkIdempotency(idempotencyKey);
    if (existing) {
      return new Response(JSON.stringify(existing), { status: 200 });
    }
  }

  // Process webhook securely
  switch (event.type) {
    case 'payment_intent.succeeded':
      await processPaymentSuccess(event.data.object);
      break;
    case 'customer.subscription.updated':
      await processSubscriptionUpdate(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

### 5. ЗАЩИТА FRONTEND
```typescript
// React Security Headers
const SecurityHeaders = () => {
  useEffect(() => {
    // Content Security Policy
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co https://api.openai.com https://api.anthropic.com"
    ].join('; ');
    
    document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.setAttribute('content', csp);
    
    // Prevent clickjacking
    if (window.self !== window.top) {
      window.top.location = window.location;
    }
  }, []);

  return null;
};

// Input Sanitization
const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove JS protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Secure API Client
const apiClient = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('supabase.auth.token');
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
};
```

### 6. DATABASE SECURITY (RLS)
```sql
-- Row Level Security для всех таблиц
-- Users table
CREATE POLICY "Users can only view own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Credit Wallets
CREATE POLICY "Users can only view own wallet" ON credit_wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only update own wallet" ON credit_wallets
    FOR UPDATE USING (auth.uid() = user_id);

-- Transactions
CREATE POLICY "Users can only view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Audit logs (только для администраторов)
CREATE POLICY "Only admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Функция для безопасной дедукции кредитов
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INTEGER)
RETURNS TABLE(success BOOLEAN, remaining_credits INTEGER) AS $$
BEGIN
    UPDATE credit_wallets 
    SET credits = credits - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id 
    AND credits >= p_amount;
    
    IF FOUND THEN
        INSERT INTO transactions (user_id, amount, type, description)
        VALUES (p_user_id, -p_amount, 'deduction', 'AI usage');
        
        RETURN QUERY SELECT TRUE, (SELECT credits FROM credit_wallets WHERE user_id = p_user_id);
    ELSE
        RETURN QUERY SELECT FALSE, 0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7. МОНИТОРИНГ И АЛЕРТЫ
```typescript
// Security Monitoring System
const securityMonitor = {
  async logSecurityEvent(event: SecurityEvent) {
    await supabase.from('security_events').insert({
      user_id: event.userId,
      event_type: event.type,
      severity: event.severity,
      details: event.details,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      timestamp: new Date()
    });

    // Критические события - немедленное уведомление
    if (event.severity === 'critical') {
      await sendTelegramAlert(event);
    }
  },

  async detectAnomalies(userId: string) {
    const recentActivity = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 3600000)); // Последний час

    // Проверка на подозрительную активность
    const anomalies = [];
    
    if (recentActivity.length > 100) {
      anomalies.push('High frequency requests');
    }

    const uniqueIPs = new Set(recentActivity.map(a => a.ip_address));
    if (uniqueIPs.size > 5) {
      anomalies.push('Multiple IP addresses');
    }

    if (anomalies.length > 0) {
      await this.logSecurityEvent({
        userId,
        type: 'anomaly_detected',
        severity: 'warning',
        details: { anomalies }
      });
    }
  }
};
```

### 8. PENETRATION TESTING CHECKLIST

#### Authentication & Authorization
- [ ] JWT token validation bypass
- [ ] Session fixation attacks
- [ ] Privilege escalation
- [ ] Account enumeration
- [ ] Password reset vulnerabilities

#### Input Validation
- [ ] SQL injection через параметры
- [ ] XSS через пользовательский ввод
- [ ] Command injection в AI prompts
- [ ] Path traversal в file uploads
- [ ] JSON injection

#### Business Logic
- [ ] Credit manipulation vulnerabilities
- [ ] Race conditions в транзакциях
- [ ] Bypass rate limiting
- [ ] Subscription fraud
- [ ] API abuse

#### Infrastructure
- [ ] Supabase RLS bypass
- [ ] Edge function vulnerabilities
- [ ] CORS misconfiguration
- [ ] Secrets exposure
- [ ] Database connection pooling attacks

### 9. SECURE DEPLOYMENT CHECKLIST

#### Environment Variables
```bash
# Производственные переменные
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key # Только публичные операции
SUPABASE_SERVICE_ROLE_KEY=your_service_role # Только на сервере

# Stripe
STRIPE_SECRET_KEY=sk_live_... # Только на сервере
STRIPE_WEBHOOK_SECRET=whsec_... # Только на сервере

# AI APIs (только на сервере)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Мониторинг
TELEGRAM_BOT_TOKEN=... # Для уведомлений
```

#### Security Headers
```typescript
// Настройка в Vercel/Netlify
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
```

### 10. INCIDENT RESPONSE PLAN

#### Уровни инцидентов
- **Critical**: Утечка API ключей, несанкционированный доступ к данным
- **High**: Атака на кредитную систему, DDoS
- **Medium**: Подозрительная активность, попытки взлома
- **Low**: Необычные паттерны использования

#### Процедуры реагирования
1. **Немедленные действия** (0-15 минут)
   - Изоляция скомпрометированных аккаунтов
   - Ротация API ключей
   - Блокировка подозрительных IP

2. **Краткосрочные действия** (15 минут - 1 час)
   - Анализ логов и масштаба инцидента
   - Уведомление пользователей
   - Восстановление сервисов

3. **Долгосрочные действия** (1+ часов)
   - Полное расследование
   - Исправление уязвимостей
   - Обновление процедур безопасности

### 11. РЕГУЛЯРНЫЕ ПРОВЕРКИ БЕЗОПАСНОСТИ

#### Еженедельно
- Анализ логов безопасности
- Проверка неиспользуемых API ключей
- Мониторинг аномальной активности

#### Ежемесячно
- Penetration testing
- Обновление зависимостей
- Ревизия прав доступа

#### Ежеквартально
- Аудит безопасности
- Обновление плана реагирования
- Тестирование backup процедур

---

## 🚨 КРИТИЧЕСКИЕ ДЕЙСТВИЯ НЕМЕДЛЕННО

1. **Проверить переменные окружения** - убедиться, что чувствительные данные не попадают в frontend
2. **Включить RLS на всех таблицах** - настроить политики доступа
3. **Настроить мониторинг** - логирование всех критических операций
4. **Протестировать webhook безопасность** - проверить signature validation
5. **Создать систему алертов** - для критических событий безопасности

## 📋 SECURITY TESTING COMMANDS

```bash
# Проверка зависимостей
npm audit
npm audit fix

# Тестирование безопасности
npm run security-test

# Проверка secrets
git secrets --scan
trufflehog --regex --entropy=False .

# Lint безопасности
eslint --ext .ts,.tsx . --config .eslintrc.security.js
```

Этот мастер-промпт покрывает все критические аспекты безопасности вашего AI-приложения и должен быть адаптирован под конкретные требования вашей архитектуры.