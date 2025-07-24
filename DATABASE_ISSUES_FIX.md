# 🔧 Исправление проблем с базой данных

## 🚨 **Обнаруженные проблемы:**

### 1. **404 ошибки на таблицу `session_security`**

**Проблема:** Приложение пытается обращаться к таблице `session_security`, которая не существует в базе данных.

**Временное решение:**

- Отключен функционал session security в `src/services/sessionSecurity.ts`
- Добавлена константа `SESSION_SECURITY_ENABLED = false`
- Все методы теперь возвращают успешные результаты без обращения к БД

### 2. **500 ошибка в Edge Function `stripe-checkout`**

**Проблема:** Edge Function возвращает Internal Server Error.

**Возможные причины:**

- Отсутствующие таблицы в базе данных
- Неправильные ключи Stripe
- Проблемы с аутентификацией
- Ошибки в коде Edge Function

## 🛠️ **Необходимые таблицы для создания:**

### **1. Таблица `session_security`**

```sql
CREATE TABLE IF NOT EXISTS session_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  UNIQUE(user_id, session_id)
);
```

### **2. Таблица `security_events`**

```sql
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **3. Индексы для производительности**

```sql
-- Session security indexes
CREATE INDEX IF NOT EXISTS idx_session_security_user_id ON session_security(user_id);
CREATE INDEX IF NOT EXISTS idx_session_security_session_id ON session_security(session_id);
CREATE INDEX IF NOT EXISTS idx_session_security_is_active ON session_security(is_active);
CREATE INDEX IF NOT EXISTS idx_session_security_last_activity ON session_security(last_activity);

-- Security events indexes
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
```

### **4. RLS политики**

```sql
-- Enable RLS
ALTER TABLE session_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Session security policies
CREATE POLICY "Users can view their own session security" ON session_security
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own session security" ON session_security
  FOR ALL USING (auth.uid() = user_id);

-- Security events policies
CREATE POLICY "Users can view their own security events" ON security_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create security events" ON security_events
  FOR INSERT WITH CHECK (true);
```

## 🔍 **Диагностика Edge Function:**

### **1. Проверка логов**

```bash
# Получить логи Edge Functions
npx supabase functions logs stripe-checkout

# Или через web интерфейс
# https://supabase.com/dashboard/project/sgzlhcagtesjazvwskjw/functions
```

### **2. Локальное тестирование**

```bash
# Запустить функции локально
npx supabase functions serve --no-verify-jwt

# Тестировать через curl
curl -X POST http://localhost:54321/functions/v1/stripe-checkout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price_id": "price_1RiUt0AK7V4m73aluYckgD6P", "mode": "subscription"}'
```

### **3. Проверка переменных окружения**

Убедиться, что все секреты настроены:

```bash
npx supabase secrets list
```

Должны быть:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 🚀 **Исправления в коде:**

### **1. Отключение session security (✅ Выполнено)**

```typescript
// В src/services/sessionSecurity.ts
const SESSION_SECURITY_ENABLED = false;
```

### **2. Обработка ошибок в PricingCard (✅ Выполнено)**

- Добавлен показ ошибок пользователю
- Исправлена обработка состояния загрузки
- Добавлен AuthModal для неавторизованных пользователей

## 📋 **Следующие шаги:**

### **Немедленные действия:**

1. ✅ Отключить session security (выполнено)
2. ⏳ Проверить логи Edge Function
3. ⏳ Протестировать покупку после отключения session security

### **Долгосрочные решения:**

1. 🔄 Создать недостающие таблицы в БД
2. 🔄 Включить session security обратно
3. 🔄 Настроить мониторинг ошибок

## 🧪 **Тестирование:**

### **1. Тест без авторизации**

```javascript
// В консоли браузера
console.log("Testing unauthorized purchase...");
// Нажать кнопку "Купить" - должно показать AuthModal
```

### **2. Тест с авторизацией**

```javascript
// В консоли браузера
console.log("User authenticated:", !!user);
// Нажать кнопку "Купить" - должно перенаправить на Stripe
```

### **3. Тест Edge Function**

```javascript
// Использовать кнопку "Тест Edge Function" в UI
// Должно показать успешный результат
```

## 🛡️ **Безопасность:**

### **Временное отключение session security:**

- ✅ Не влияет на основную функциональность
- ⚠️ Снижает уровень безопасности
- 🔄 Нужно включить обратно после создания таблиц

### **Мониторинг:**

- Проверять логи на наличие подозрительной активности
- Мониторить неудачные попытки входа
- Отслеживать необычные паттерны использования

---

_Последнее обновление: отключен session security для устранения 404 ошибок_
