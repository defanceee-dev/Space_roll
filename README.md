# Space Roll Mini App

Готовий статичний Mini App для Telegram, який можна залити на GitHub Pages.

## Що вже є
- українська мова
- 109 позицій із PDF меню
- категорії
- швидкий пошук
- кошик
- повтор останнього замовлення
- форма клієнта
- відправка на Make webhook
- підтримка Telegram WebApp `sendData`

## Що потрібно зробити перед запуском
1. У файлі `app.js` впиши свій webhook:
   ```js
   webhookUrl: "https://hook.make.com/..."
   ```
2. У файлі `menu.json` заповни реальні `poster_id` з Poster POS.
   Зараз вони лишені порожніми, тому що PDF не містить ID товарів.
3. Завантаж усю папку у GitHub репозиторій і переконайся, що GitHub Pages публікується з `main` -> `/root`.

## Як підключити до бота
1. В BotFather:
   - `/setmenubutton`
   - вибери бота
   - назва кнопки: `Відкрити меню`
   - URL: посилання на GitHub Pages
2. У Make створи `Custom webhook`.
3. У сценарії Make прийми JSON і далі перетвори `items[].poster_id` на запит у Poster.

## Важливо
Без реальних `poster_id` із Poster POS замовлення не можна коректно створити в Poster.
