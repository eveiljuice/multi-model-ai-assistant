# Инструкции для пуша исправлений в GitHub

## Файлы для коммита

Следующие файлы были созданы для исправления проблемы с кредитами пользователей:

### SQL файлы для исправления БД:

- `step1_fixed_create_function.sql` - Основные функции исправления
- `step2_check_users_without_credits.sql` - Проверка пользователей без кредитов
- `step3_fix_rls_policies.sql` - Исправление RLS политик
- `step4_update_trigger.sql` - Обновление триггеров
- `fix_missing_users_credits.sql` - Поиск потерянных пользователей
- `debug_missing_users.sql` - Диагностика отсутствующих пользователей
- `check_auth_users_access.sql` - Проверка доступа к auth.users

### JavaScript файлы:

- `admin_list_all_users.js` - Скрипт для получения всех пользователей через Admin API
- `debug-user-issue.js` - Диагностика конкретного пользователя
- `fix-user-credits-issue.js` - Исправление проблемы конкретного пользователя

### Документация:

- `QUICK_FIX_GUIDE.md` - Быстрое руководство по исправлению
- `DATABASE_ISSUES_FIX.md` - Подробное описание проблемы и решения
- `GIT_PUSH_INSTRUCTIONS.md` - Эти инструкции

## Команды для пуша

Выполните следующие команды в терминале:

```bash
# 1. Проверить статус репозитория
git status

# 2. Добавить все новые файлы
git add step1_fixed_create_function.sql
git add step2_check_users_without_credits.sql
git add step3_fix_rls_policies.sql
git add step4_update_trigger.sql
git add fix_missing_users_credits.sql
git add debug_missing_users.sql
git add check_auth_users_access.sql
git add admin_list_all_users.js
git add debug-user-issue.js
git add fix-user-credits-issue.js
git add QUICK_FIX_GUIDE.md
git add DATABASE_ISSUES_FIX.md
git add GIT_PUSH_INSTRUCTIONS.md

# 3. Создать коммит
git commit -m "fix: resolve user credits initialization issues

- Add SQL scripts to fix missing user credits
- Create functions for safe credit initialization
- Update RLS policies for better access control
- Add diagnostic tools for user credit issues
- Include comprehensive documentation and guides

Fixes issues where new users couldn't use agents due to:
- Missing credits table entries
- Foreign key constraint violations in error_logs
- Trigger not firing for credit initialization"

# 4. Запушить в GitHub
git push origin main
```

## Альтернативный способ (добавить все файлы сразу)

```bash
# Добавить все новые файлы
git add .

# Создать коммит
git commit -m "fix: comprehensive solution for user credits issues

- SQL scripts for database fixes
- JavaScript diagnostic tools
- Complete documentation
- Step-by-step repair guides"

# Запушить
git push origin main
```

## Проверка после пуша

После успешного пуша:

1. Перейдите на https://github.com/eveiljuice/multi-model-ai-assistant
2. Убедитесь что все файлы загружены
3. Проверьте что коммит отображается в истории

## Если возникли проблемы

### Проблема с аутентификацией:

```bash
# Настроить Git credentials (если нужно)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Если используете токен доступа
git remote set-url origin https://YOUR_TOKEN@github.com/eveiljuice/multi-model-ai-assistant.git
```

### Конфликты или проблемы с пушем:

```bash
# Получить последние изменения
git pull origin main

# Решить конфликты если есть, затем
git add .
git commit -m "resolve merge conflicts"
git push origin main
```

## Следующие шаги после пуша

1. Примените SQL исправления в Supabase Dashboard
2. Протестируйте функциональность с проблемными пользователями
3. Мониторьте логи на предмет новых ошибок
4. Обновите документацию проекта при необходимости
