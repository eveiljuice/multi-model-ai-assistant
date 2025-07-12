# Stripe Integration Guide

_React + Vite + Supabase_

> Следуйте этому пошаговому руководству, чтобы менее чем за 30 минут подключить Stripe и настроить оплату подписок/кредитов в проекте.

---

## 1 Регистрация и первичная настройка

1. Перейдите на <https://dashboard.stripe.com/> → **Sign up**.
2. Подтвердите e-mail, войдите в панель Stripe.
3. Работайте в **Test mode** (оранжевый переключатель).  
   • Live-режим треб-ет верификации (**Activate payments**).  
   • Для разработки Test-режима достаточно.

---

## 2 Ключи API

| Ключ                            | Где используется                 | Получение                                   | Безопасное хранение           |
| ------------------------------- | -------------------------------- | ------------------------------------------- | ----------------------------- |
| `Publishable key` (`pk_test_…`) | Client (React)                   | Developers → **API keys**                   | `.env` с префиксом `VITE_`    |
| `Secret key` (`sk_test_…`)      | Server (Supabase Edge / backend) | Нажать **Reveal key**                       | Supabase Secrets / CI Secrets |
| `Webhook secret` (`whsec_…`)    | Server (обработка событий)       | Создается после добавления Webhook-endpoint | Supabase Secrets              |

> **Важно:** Secret и Webhook‐ключи никогда не попадают в клиентский код.

---

## 3 Создание продуктов и цен

1. **Products → +Add product** → заполните _Name_, _Description_.
2. На странице продукта → **+Add price**.
3. Выберите:
   - **Standard pricing** → фиксированная цена.
   - **Amount** (напр. `9.99`).
   - **Billing period**:
     - _One time_ — разовая (top-up);
     - _Recurring_ — подписка.
4. Нажмите **Add price** — получите `price_…` ID.

Создайте минимум две цены:

| Назначение   | mode           | Пример Price ID |
| ------------ | -------------- | --------------- |
| Top-up пакет | `payment`      | `price_1TOPUP…` |
| Подписка     | `subscription` | `price_1SUB…`   |

---

## 4 Экспорт цен в проект

```ts
// src/stripe-config.ts
export const STRIPE_PRODUCTS = [
  {
    name: "Credit Top-up 100",
    mode: "payment" as const,
    priceId: "price_1TOPUP…",
    amount: 4_99, // $4.99
    credits: 100,
  },
  {
    name: "Credit Top-up 500",
    mode: "payment" as const,
    priceId: "price_1TOPUP500…",
    amount: 19_99,
    credits: 500,
  },
  {
    name: "Credit Top-up 1500",
    mode: "payment" as const,
    priceId: "price_1TOPUP1500…",
    amount: 49_99,
    credits: 1500,
  },
  {
    name: "Pro Subscription 250",
    mode: "subscription" as const,
    priceId: "price_1SUB…",
    amount: 9_99,
    creditsPerMonth: 250,
  },
];
```

---

## 5 Интеграция ключей в код

### 5.1 Фронтенд

```
# .env.local
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…
```

```ts
import { loadStripe } from "@stripe/stripe-js";
export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!
);
```

```tsx
import { Elements } from "@stripe/react-stripe-js";
<Elements stripe={stripePromise}>
  <App />
</Elements>;
```

### 5.2 Edge Function (Supabase)

Добавьте secrets:

```
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
```

```ts
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
});

export const handler = async (req: Request) => {
  const { priceId, mode, successUrl, cancelUrl } = await req.json();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode, // 'payment' | 'subscription'
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" },
  });
};
```

---

## 6 Webhook-endpoint

1. **Developers → Webhooks → +Add endpoint**:  
   URL → `https://<PROJECT_REF>.functions.supabase.co/stripe-webhook`
2. Подписаться минимум на события:
   - `checkout.session.completed`
   - `invoice.paid`, `invoice.payment_failed`
3. Сохраните и скопируйте `Signing secret` → `STRIPE_WEBHOOK_SECRET`.

---

## 7 Безопасность

| Делать                                       | Никогда не делать                  |
| -------------------------------------------- | ---------------------------------- |
| Хранить `sk_*` и `whsec_*` только на сервере | Коммитить Secret key в репозиторий |
| Использовать `pk_*` в браузере               | Логировать Secret key              |
| Ограничить Webhook по подписи                | Отправлять Secret key в клиент     |

---

## 8 Тестирование

1. Запустите фронтенд, нажмите «Buy / Subscribe».
2. Откроется Stripe Checkout.
3. Введите карту **4242 4242 4242 4242** (любая дата, CVC `123`).
4. Сессия завершится → событие появится в Webhooks.
5. Edge Function обновит кредиты/подписку.

---

## 9 Переход в Live

1. Завершите `Activate payments` в Stripe.
2. Переключитесь в **Live mode** (верхний левый тумблер).
3. Создайте Live-версии продуктов/цен.
4. Получите **Live Publishable** и **Live Secret** keys.
5. Обновите `.env` и Supabase Secrets.
6. Создайте отдельный Live-Webhook-endpoint.

---

## 10 Чек-лист перед продакшеном

- [ ] `pk_live_*` на клиенте, `sk_live_*` + `whsec_*` — только на сервере.
- [ ] Webhook подпись проверяется.
- [ ] Success / Cancel URLs указывают на страницы вашего домена.
- [ ] В Live-mode протестирована реальная карта (Stripe предоставляет тестовые для Live-sandbox).

---

### 🎉 Готово!

У вас настроен Stripe: разовые платежи, подписки и вебхуки — всё готово к масштабированию.
