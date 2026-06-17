/**
 * Конфиг архитектуры агентной системы (источник правды для страницы Agents Map).
 *
 * Топология: доступ по отделу/функции + CEO-оркестратор сверху.
 * Целевой рантайм: LangGraph (узлы = агенты, рёбра = делегирование/handoff).
 * Права инструментов: read — без подтверждения, write — с подтверждением пользователя.
 *
 * Это статичная (design-time) модель: страница рисует схему из этого файла,
 * бэкенд не требуется. Когда появится рантайм, тот же контракт можно отдавать
 * из GET /api/v1/agents и страница станет «живой» без изменения UI.
 */

export type ToolAccess = 'read' | 'write';

export interface AgentTool {
  /** Человекочитаемое имя инструмента (function tool в LangGraph). */
  name: string;
  /** Реальный вызов на платформе: метод + эндпоинт или сервис. */
  endpoint: string;
  /** read — чтение/аналитика; write — действие, меняющее данные. */
  access: ToolAccess;
  /** write-действия требуют подтверждения пользователя. */
  confirm?: boolean;
  /** Короткое пояснение, что делает инструмент. */
  desc: string;
}

export interface AgentDataSource {
  /** Что именно агент берёт для аналитики/ответов. */
  label: string;
  /** Откуда: сервис/таблица/коллекция. */
  source: string;
}

export interface AgentSpec {
  /** Стабильный идентификатор. Дефолтные агенты: ceo/hr/sales/cfo/cmo; новые — сгенерированные. */
  id: string;
  name: string;
  title: string;
  /** orchestrator — верхний уровень; specialist — функциональный агент. */
  level: 'orchestrator' | 'specialist';
  /** id вышестоящего агента, которому подчиняется этот. null/отсутствует = корневой. */
  parentId?: string | null;
  /** Эмодзи для быстрой визуальной идентификации. */
  emoji: string;
  /** Tailwind-акцент (используется в карточке/панели). */
  accent: string;
  /** Системная инструкция (роль и границы поведения агента). */
  instruction: string;
  /** Кто может обращаться к агенту: роли платформы и/или отделы. */
  accessRoles: string[];
  /** Доступен ли агент в WhatsApp-канале. */
  whatsapp: boolean;
  tools: AgentTool[];
  dataSources: AgentDataSource[];
}

/** Рёбра оркестрации: CEO делегирует специалистам (handoff в обе стороны — возврат результата). */
export const ORCHESTRATION_EDGES: { from: AgentSpec['id']; to: AgentSpec['id'] }[] = [
  { from: 'ceo', to: 'hr' },
  { from: 'ceo', to: 'sales' },
  { from: 'ceo', to: 'cfo' },
  { from: 'ceo', to: 'cmo' },
];

export const AGENTS: AgentSpec[] = [
  {
    id: 'ceo',
    name: 'CEO',
    title: 'Оркестратор · стратегия',
    level: 'orchestrator',
    emoji: '👑',
    accent: 'cyan',
    instruction:
      'Ты — CEO-агент, точка входа для руководства. Разбираешь запрос, ' +
      'определяешь, какие функции затронуты, и делегируешь специализированным агентам ' +
      '(HR, Sales, CFO, CMO). Собираешь их ответы, разрешаешь противоречия и даёшь ' +
      'единый ответ топ-менеджменту. Готовишь кросс-функциональные сводки. ' +
      'Действия, меняющие данные, всегда выносишь на подтверждение человека.',
    accessRoles: ['super', 'admin', 'CEO / C-level'],
    whatsapp: true,
    tools: [
      { name: 'route_to_agent', endpoint: 'LangGraph handoff → hr | sales | cfo | cmo', access: 'read', desc: 'Делегирует подзадачу нужному специалисту и ждёт результат.' },
      { name: 'company_overview', endpoint: 'GET /api/v1/analytic/company', access: 'read', desc: 'Сводная аналитика по компании.' },
      { name: 'rag_search', endpoint: 'services/rag.py (Qdrant)', access: 'read', desc: 'Поиск по корпоративным документам/политикам.' },
      { name: 'broadcast_announcement', endpoint: 'POST /api/v1/announcements', access: 'write', confirm: true, desc: 'Публикует объявление для компании (после подтверждения).' },
    ],
    dataSources: [
      { label: 'Сводная аналитика компании', source: 'analytics_service · company_analytics_service' },
      { label: 'Агрегаты подчинённых агентов', source: 'HR / Sales / CFO / CMO (handoff)' },
      { label: 'AI-инсайты по метрикам', source: 'analytics_ai_service' },
      { label: 'Корпоративные документы', source: 'Qdrant (RAG)' },
    ],
  },
  {
    id: 'hr',
    name: 'HR',
    title: 'Персонал · найм · адаптация',
    level: 'specialist',
    emoji: '👥',
    accent: 'teal',
    instruction:
      'Ты — HR-агент. Отвечаешь сотрудникам на вопросы по политикам, льготам и ' +
      'процессам, опираясь на корпоративные документы (RAG). Помогаешь с рекрутингом, ' +
      'онбордингом и оценкой сотрудников. Не раскрываешь персональные данные тем, у кого ' +
      'нет прав. Создание задач/писем — только после подтверждения.',
    accessRoles: ['hr', 'admin', 'super', 'employee (вопросы по компании)'],
    whatsapp: false,
    tools: [
      { name: 'rag_search', endpoint: 'GET /api/v1/documents/search', access: 'read', desc: 'Ответы по политикам и документам компании.' },
      { name: 'list_recruiting', endpoint: 'GET /api/v1/recruiting', access: 'read', desc: 'Кандидаты, вакансии, статусы воронки найма.' },
      { name: 'onboarding_status', endpoint: 'GET /api/v1/onboarding', access: 'read', desc: 'Прогресс адаптации сотрудников.' },
      { name: 'create_task', endpoint: 'POST /api/v1/user_tasks', access: 'write', confirm: true, desc: 'Ставит задачу сотруднику/рекрутеру.' },
      { name: 'rate_employee', endpoint: 'POST /api/v1/employee_rating', access: 'write', confirm: true, desc: 'Фиксирует оценку сотрудника.' },
    ],
    dataSources: [
      { label: 'Корпоративные документы и FAQ', source: 'Qdrant (RAG) · hr_faq_block' },
      { label: 'Аналитика рекрутинга', source: 'recruiting_ai_service · recruitment_ai_analysis' },
      { label: 'Статусы онбординга', source: 'onboarding · company_onboarding_checklist' },
      { label: 'Оценки и геймификация', source: 'employee_rating · gamification' },
    ],
  },
  {
    id: 'sales',
    name: 'Sales',
    title: 'Воронка · лиды · звонки',
    level: 'specialist',
    emoji: '📈',
    accent: 'amber',
    instruction:
      'Ты — Sales-агент. Ведёшь воронку продаж, анализируешь лиды и звонки, ' +
      'подсказываешь следующий шаг по сделке. Используешь транскрипты звонков для оценки ' +
      'качества и конверсии. Изменение стадий сделок и отправка сообщений — с подтверждением.',
    accessRoles: ['seller', 'manager', 'admin', 'super'],
    whatsapp: false,
    tools: [
      { name: 'get_funnel', endpoint: 'GET /api/v1/sales_funnel', access: 'read', desc: 'Сделки и стадии воронки.' },
      { name: 'list_leads', endpoint: 'GET /api/v1/lead_webhook', access: 'read', desc: 'Входящие лиды и их источники.' },
      { name: 'call_insights', endpoint: 'GET /api/v1/telephony (recordings)', access: 'read', desc: 'Записи и транскрипты звонков.' },
      { name: 'update_lead_stage', endpoint: 'PATCH /api/v1/sales_funnel/{id}', access: 'write', confirm: true, desc: 'Двигает сделку по стадиям.' },
    ],
    dataSources: [
      { label: 'Сделки и конверсия воронки', source: 'sales_funnel_lead_service' },
      { label: 'Лиды и источники', source: 'lead_webhook_service' },
      { label: 'Звонки и транскрипты', source: 'telephony_recording_service · binotel/onlinepbx' },
      { label: 'Сообщения клиентам', source: 'waha_whatsapp_service' },
    ],
  },
  {
    id: 'cfo',
    name: 'CFO',
    title: 'Финансы · выручка · затраты',
    level: 'specialist',
    emoji: '💰',
    accent: 'emerald',
    instruction:
      'Ты — CFO-агент для руководства. Считаешь и объясняешь финансовые метрики: ' +
      'выручку из воронки, конверсию в деньги, динамику. Готовишь короткие финансовые ' +
      'сводки (в т.ч. в WhatsApp). Только чтение данных; рекомендации — без действий над БД.',
    accessRoles: ['Finance dept', 'admin', 'super', 'CEO / C-level'],
    whatsapp: true,
    tools: [
      { name: 'revenue_metrics', endpoint: 'GET /api/v1/analytic/revenue', access: 'read', desc: 'Выручка и динамика из воронки.' },
      { name: 'company_metrics', endpoint: 'GET /api/v1/analytic/company', access: 'read', desc: 'Общие операционные метрики.' },
      { name: 'funnel_value', endpoint: 'GET /api/v1/sales_funnel (aggregated)', access: 'read', desc: 'Денежная оценка сделок по стадиям.' },
    ],
    dataSources: [
      { label: 'Выручка и конверсия в деньги', source: 'sales_funnel_lead_service (агрегаты)' },
      { label: 'Операционные метрики', source: 'company_analytics_service' },
      { label: 'AI-объяснение трендов', source: 'analytics_ai_service' },
    ],
  },
  {
    id: 'cmo',
    name: 'CMO',
    title: 'Маркетинг · лиды · контент',
    level: 'specialist',
    emoji: '📣',
    accent: 'fuchsia',
    instruction:
      'Ты — CMO-агент для руководства. Анализируешь источники лидов, эффективность ' +
      'каналов и контент. Готовишь маркетинговые сводки (в т.ч. в WhatsApp). Создание ' +
      'постов/объявлений — только после подтверждения.',
    accessRoles: ['Marketing dept', 'admin', 'super', 'CEO / C-level'],
    whatsapp: true,
    tools: [
      { name: 'lead_sources', endpoint: 'GET /api/v1/lead_webhook', access: 'read', desc: 'Источники и качество лидов по каналам.' },
      { name: 'site_insights', endpoint: 'services/website_parser.py', access: 'read', desc: 'Контент и данные с сайта/лендингов.' },
      { name: 'marketing_metrics', endpoint: 'GET /api/v1/analytic/company', access: 'read', desc: 'Маркетинговые метрики и воронка.' },
      { name: 'create_post', endpoint: 'POST /api/v1/posts', access: 'write', confirm: true, desc: 'Публикует контент/пост (после подтверждения).' },
    ],
    dataSources: [
      { label: 'Лиды по каналам', source: 'lead_webhook_service' },
      { label: 'Контент сайта/лендингов', source: 'website_parser' },
      { label: 'Маркетинговая аналитика', source: 'analytics_service · analytics_ai_service' },
    ],
  },
];

/** Точки входа: какой пользователь к какому агенту попадает (доступ по отделу/функции). */
export const ENTRY_POINTS: { label: string; emoji: string; agentId: AgentSpec['id']; channel: 'web' | 'web+whatsapp' }[] = [
  { label: 'Сотрудник / HR-отдел', emoji: '👥', agentId: 'hr', channel: 'web' },
  { label: 'Отдел продаж', emoji: '📈', agentId: 'sales', channel: 'web' },
  { label: 'Финансы', emoji: '💰', agentId: 'cfo', channel: 'web+whatsapp' },
  { label: 'Маркетинг', emoji: '📣', agentId: 'cmo', channel: 'web+whatsapp' },
  { label: 'CEO / C-level (admin · super)', emoji: '👑', agentId: 'ceo', channel: 'web+whatsapp' },
];
