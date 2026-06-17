import { defaultAgents, normalize } from '@/config/agentsStore';
import type { AgentSpec } from '@/config/agentsArchitecture';

/**
 * Standalone-версия API карты агентов: вместо бэкенда данные хранятся в
 * localStorage браузера. Контракт (list / replace / reset) совпадает с серверным,
 * поэтому страница работает без изменений и полностью функциональна на Vercel
 * (создание, редактирование, сохранение, сброс — всё локально, per-browser).
 *
 * Версионирование сида (SEED_VERSION): когда мы обновляем стартовую
 * конфигурацию (defaultAgents.json), поднимаем SEED_VERSION. При несовпадении
 * сохранённой версии приложение пере-засеивает дефолты — так новая карта
 * гарантированно показывается всем, даже у кого в браузере остался старый набор.
 */

const KEY = 'agents-map-store';
const SEED_KEY = 'agents-map-seed-version';
const SEED_VERSION = '2';

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

function seed(): AgentSpec[] {
  const fresh = defaultAgents();
  write(fresh);
  try {
    localStorage.setItem(SEED_KEY, SEED_VERSION);
  } catch {
    // ignore
  }
  return fresh;
}

export const agentsApi = {
  async list(): Promise<AgentSpec[]> {
    await delay();
    // Новая версия стартовой конфигурации — пере-засеиваем (перетираем старый набор).
    if (localStorage.getItem(SEED_KEY) !== SEED_VERSION) {
      return seed();
    }
    const existing = read();
    if (existing && existing.length) return existing;
    return seed();
  },

  async replace(agents: AgentSpec[]): Promise<AgentSpec[]> {
    await delay();
    const next = normalize(agents);
    write(next);
    return next;
  },

  async reset(): Promise<AgentSpec[]> {
    await delay();
    return seed();
  },
};
