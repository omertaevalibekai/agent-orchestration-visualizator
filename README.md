[![CI](https://github.com/omertaevalibekai/agent-orchestration-visualizator/actions/workflows/ci.yml/badge.svg)](https://github.com/omertaevalibekai/agent-orchestration-visualizator/actions/workflows/ci.yml)

# Карта агентов (Agents Map)

Standalone-версия страницы «Карта агентов» из платформы  —
интерактивная иерархия AI-агентов (CEO-оркестратор + специалисты HR / Sales / CFO / CMO),
с просмотром и редактированием инструкций, инструментов и источников данных.

Извлечено как отдельное приложение для деплоя. Бэкенд не нужен:
данные агентов хранятся в `localStorage` браузера (создание, редактирование,
сохранение и сброс работают локально, у каждого пользователя свой набор).

## Стек

- Vite + React 18 + TypeScript
- Tailwind CSS (кастомная палитра `obsidian`, тёмная/светлая тема)
- lucide-react (иконки), react-hot-toast (уведомления)

## Локальный запуск

```bash
npm ci
npm run dev
```

Открыть http://localhost:5173

## Сборка

```bash
npm run build      # выход в dist/
npm run preview    # локальный предпросмотр сборки
```


## Структура

```
src/
  pages/AgentsMapPage.tsx          # страница: граф иерархии + панель деталей
  components/agents/AgentEditorPanel.tsx   # редактор агента
  config/agentsArchitecture.ts     # дефолтная архитектура (источник правды)
  config/agentsStore.ts            # хелперы: дефолты, фабрика под-агента, обход дерева
  api/agentsApi.ts                 # хранилище на localStorage (вместо бэкенда)
  contexts/ThemeContext.tsx        # светлая/тёмная тема
  App.tsx                          # обёртка + переключатель темы
```

## Связь с оригиналом

Чтобы вернуть «живой» серверный режим, замените `src/api/agentsApi.ts` на версию
с HTTP-вызовами (`GET/PUT/POST /api/v1/agents`) — контракт `AgentSpec` тот же.
## Хранение данных и сброс
Данные сохраняются только в текущем браузере для текущего адреса сайта
(протокол, домен и порт). Локальный запуск, preview и опубликованный сайт
используют отдельные хранилища; синхронизации между браузерами и устройствами нет.
Перезагрузка страницы сохраняет изменения, но очистка данных сайта удаляет их.
Сброс заменяет пользовательскую архитектуру дефолтным набором агентов.
Кроме того, `src/api/agentsApi.ts` сравнивает сохранённую версию начальных
данных с `SEED_VERSION`: при несовпадении набор автоматически заменяется
дефолтным при следующей загрузке. Перед сбросом, очисткой данных браузера
или обновлением версии сохраните важные инструкции и настройки отдельно.
Для запуска из нового checkout сначала клонируйте репозиторий:
```bash
git clone https://github.com/omertaevalibekai/agent-orchestration-visualizator.git
cd agent-orchestration-visualizator
npm ci
npm run dev
```

## Development checks

Use Node.js 22.16 or later (CI uses Node.js 22):

```sh
npm ci
npm run lint
npm run typecheck
npm run test:ci
npm run build
```

No `.env` file or API keys are required for the default local application.
Do not commit local credentials or browser data. Dependency updates are proposed
weekly by Dependabot and must pass the same CI checks.
