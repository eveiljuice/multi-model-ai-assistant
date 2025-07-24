# Развертывание Edge Function

Чтобы развернуть обновленную Edge Function `stripe-checkout-v3`, выполните следующие команды:

## 1. Установка Supabase CLI (если не установлен)

```bash
npm install -g supabase
```

## 2. Логин в Supabase

```bash
supabase login
```

## 3. Связывание с проектом

```bash
supabase link --project-ref sgzlhcagtesjazvwskjw
```

## 4. Развертывание функции

```bash
supabase functions deploy stripe-checkout-v3
```

## Альтернативный способ через веб-интерфейс:

1. Откройте https://supabase.com/dashboard/project/sgzlhcagtesjazvwskjw
2. Перейдите в раздел "Edge Functions"
3. Найдите функцию `stripe-checkout-v3`
4. Скопируйте содержимое файла `supabase/functions/stripe-checkout-v3/index.ts`
5. Вставьте в редактор и сохраните

## Проверка развертывания:

После развертывания запустите тест:

```bash
node test-stripe-env.js
```

Функция должна работать с правильными CORS заголовками и детальным логированием.
