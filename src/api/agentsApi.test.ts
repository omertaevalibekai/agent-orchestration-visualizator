import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { agentsApi } from './agentsApi';

describe('browser persistence', () => {
  let values: Map<string, string>;
  beforeEach(() => {
    values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  async function settle<T>(promise: Promise<T>): Promise<T> {
    await vi.runAllTimersAsync();
    return promise;
  }
  it('keeps an intentionally empty saved map across reloads', async () => {
    await settle(agentsApi.list());
    await settle(agentsApi.replace([]));
    expect(await settle(agentsApi.list())).toEqual([]);
  });
  it('preserves edited instructions across reloads', async () => {
    const agents = await settle(agentsApi.list());
    agents[0].instruction = 'My saved instructions';
    await settle(agentsApi.replace(agents));
    expect(await settle(agentsApi.list())).toEqual(agents);
  });
  it('recovers from invalid JSON and supports an explicit reset', async () => {
    const defaults = await settle(agentsApi.list());
    values.set('agents-map-store', '{broken');
    expect(await settle(agentsApi.list())).toEqual(defaults);
    await settle(agentsApi.replace([]));
    expect(await settle(agentsApi.reset())).toEqual(defaults);
  });
});
