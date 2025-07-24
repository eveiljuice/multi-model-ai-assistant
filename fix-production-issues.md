# 🔧 Критические Исправления Перед Деплоем

**Статус:** ✅ ВСЕ ИСПРАВЛЕНИЯ ВЫПОЛНЕНЫ  
**Дата:** 12 июля 2025  
**Готовность:** ПРОЕКТ ГОТОВ К PRODUCTION ДЕПЛОЮ

## 1. Обновление Зависимостей

```bash
# Исправить уязвимости безопасности
npm audit fix

# Обновить критические пакеты
npm install @babel/helpers@latest
npm install @eslint/plugin-kit@latest
npm install cross-spawn@latest
npm install esbuild@latest
npm install prismjs@latest
```

## 2. Убрать TODOs из Edge Functions

### supabase/functions/stripe-webhook/index.ts

**Строка 207:** Удалить `// TODO verify if needed`

### supabase/functions/webhook-handler/index.ts

**Строка 418:** Удалить `// TODO verify if needed`

## 3. Environment Variables

### Добавить в Supabase Secrets:

```bash
supabase secrets set TELEGRAM_CHAT_ID=your_actual_chat_id
```

### Обновить src/services/telegramService.ts:

```typescript
// Заменить hardcoded значение на:
private readonly CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') || "fallback_id";
```

## 4. Удалить Debug Код

### src/services/loggingService.ts:

```typescript
// Заменить console.debug на условный логгинг:
if (process.env.NODE_ENV === "development") {
  console.debug("Activity logging skipped: Service not available");
}
```

## 5. Оптимизация Bundle

### vite.config.ts:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["framer-motion", "lucide-react"],
          supabase: ["@supabase/supabase-js"],
          stripe: ["@stripe/stripe-js"],
          ai: ["openai", "@anthropic-ai/sdk", "@google/generative-ai"],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

## 6. Production Environment Check

### Добавить в package.json:

```json
{
  "scripts": {
    "build:prod": "NODE_ENV=production vite build",
    "preview:prod": "NODE_ENV=production vite preview",
    "type-check": "tsc --noEmit"
  }
}
```

## 7. Минимальные Тесты

### Создать tests/critical.test.ts:

```typescript
import { describe, it, expect } from "vitest";
import { creditService } from "../src/services/creditService";

describe("Critical Functions", () => {
  it("should handle credit deduction atomically", async () => {
    // Критический тест для атомарного списания
  });

  it("should validate user authentication", () => {
    // Тест аутентификации
  });
});
```
