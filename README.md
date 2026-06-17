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
npm install
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
