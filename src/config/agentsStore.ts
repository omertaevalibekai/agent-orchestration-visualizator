/**
 * Хелперы и дефолты для конструктора агентов.
 *
 * Хранение — в localStorage браузера (api/agentsApi.ts).
 * Здесь остаются чистые функции: дефолтный «сид» (стартовый набор / сброс),
 * фабрика нового под-агента и обход иерархии.
 *
 * Источник дефолтов — defaultAgents.json (зашитая стартовая конфигурация,
 * выгруженная из реальной правки в UI), чтобы все посетители видели одну
 * и ту же карту при первом открытии.
 */

import { type AgentSpec } from './agentsArchitecture';
import rawDefaults from './defaultAgents.json';

const DEFAULT_AGENTS = rawDefaults as unknown as AgentSpec[];

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

/** Гарантирует, что у каждого агента задан parentId (на случай старых/частичных данных). */
export function normalize(list: AgentSpec[]): AgentSpec[] {
  const orchestrator = list.find((a) => a.level === 'orchestrator');
  return list.map((a) => ({
    ...a,
    parentId:
      a.parentId === undefined
        ? a.level === 'orchestrator'
          ? null
          : orchestrator?.id ?? null
        : a.parentId,
  }));
}

/** Дефолтный набор агентов (фолбэк, если бэк недоступен). */
export function defaultAgents(): AgentSpec[] {
  return normalize(clone(DEFAULT_AGENTS));
}

/** Фабрика нового под-агента, подчинённого parentId (null = корневой). */
export function newSpecialist(parentId: string | null): AgentSpec {
  return {
    id: `agent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: 'Новый агент',
    title: 'Опишите роль',
    level: 'specialist',
    parentId,
    emoji: '🤖',
    accent: 'cyan',
    instruction: '',
    accessRoles: ['admin', 'super'],
    whatsapp: false,
    tools: [],
    dataSources: [],
  };
}

/** Множество всех потомков агента (для запрета циклов при выборе родителя). */
export function descendantIds(agents: AgentSpec[], id: string): Set<string> {
  const out = new Set<string>();
  const walk = (pid: string) => {
    for (const c of agents) {
      if (c.parentId === pid && !out.has(c.id)) {
        out.add(c.id);
        walk(c.id);
      }
    }
  };
  walk(id);
  return out;
}
