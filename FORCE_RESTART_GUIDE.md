# 🔄 Принудительный перезапуск с обновленным CSP

## 🚨 Проблема
Изменения в `vite.config.ts` могут не применяться из-за кеширования.

## ✅ Решение

### 1. Полностью остановить все процессы
```powershell
# Нажмите Ctrl+C в окне с Vite
# Нажмите Ctrl+C в окне с Express сервером
```

### 2. Очистить кеш и перезапустить
```powershell
# Удалить кеш Vite
Remove-Item -Recurse -Force .vite

# Перезапустить Express сервер
cd server
node server.js
```

### 3. В новом окне запустить фронтенд
```powershell
# Запустить с принудительной перезагрузкой конфига
npm run dev -- --force

# Или обычный запуск
npm run dev
```

## 🎯 Обновленный CSP включает:

- ✅ `http://localhost:*` - разрешает все localhost порты
- ✅ `https://js.stripe.com` - для загрузки Stripe.js
- ✅ `https://checkout.stripe.com` - для Stripe checkout
- ✅ `https://*.stripe.com` - для всех Stripe доменов

## 🔍 Проверка работы CSP

После перезапуска в консоли браузера НЕ должно быть:
- ❌ "Refused to connect to 'http://localhost:3002'"
- ❌ "Refused to load the script 'https://js.stripe.com'"

## 🚀 Альтернативный запуск

Если проблемы продолжаются, попробуйте:
```powershell
# Очистить все и переустановить
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
Remove-Item -Recurse -Force .vite
npm install
npm run dev
```

## ✅ Ожидаемый результат

После правильного перезапуска:
1. Stripe.js загрузится без ошибок CSP
2. Подключение к `localhost:3002` будет работать
3. Покупка будет перенаправлять на Stripe checkout