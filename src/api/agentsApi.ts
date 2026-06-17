import { defaultAgents, normalize } from '@/config/agentsStore';
import type { AgentSpec } from '@/config/agentsArchitecture';

/**
 * Standalone-версия API карты агентов: вместо бэкенда данные хранятся в
 * localStorage браузера. Контракт (list / replace / reset) совпадает с серверным,
 * поэтому страница работает без изменений и полностью функциональна на Vercel
 * (создание, редактирование, сохранение, сброс — всё локально, per-browser).
 */

const KEY = 'agents-map-store';
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

function read(): AgentSpec[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalize(parsed) : null;
  } catch {
    return null;
  }
}

function write(list: AgentSpec[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export const agentsApi = {
  async list(): Promise<AgentSpec[]> {
    await delay();
    const existing = read();
    if (existing && existing.length) return existing;
    const seed = defaultAgents();
    write(seed);
    return seed;
  },

  async replace(agents: AgentSpec[]): Promise<AgentSpec[]> {
    await delay();
    const next = normalize(agents);
    write(next);
    return next;
  },

  async reset(): Promise<AgentSpec[]> {
    await delay();
    const seed = defaultAgents();
    write(seed);
    return seed;
  },
};
