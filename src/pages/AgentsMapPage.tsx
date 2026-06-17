import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Crown,
  MessageCircle,
  Wrench,
  Database,
  ShieldCheck,
  Lock,
  X,
  ArrowRight,
  GitBranch,
  Pencil,
  Plus,
  RotateCcw,
  Loader2,
  CloudOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { ENTRY_POINTS, type AgentSpec } from '@/config/agentsArchitecture';
import { defaultAgents, newSpecialist, descendantIds } from '@/config/agentsStore';
import { agentsApi } from '@/api/agentsApi';
import AgentEditorPanel from '@/components/agents/AgentEditorPanel';

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Tailwind-классы по акценту агента (статически, чтобы JIT не вырезал).
const ACCENT: Record<string, { dot: string; ring: string; chip: string; chipDark: string; text: string }> = {
  cyan: { dot: 'bg-cyan-500', ring: 'ring-cyan-400/40', chip: 'bg-cyan-50 text-cyan-700 border-cyan-200', chipDark: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', text: 'text-cyan-500' },
  teal: { dot: 'bg-teal-500', ring: 'ring-teal-400/40', chip: 'bg-teal-50 text-teal-700 border-teal-200', chipDark: 'bg-teal-500/15 text-teal-300 border-teal-500/30', text: 'text-teal-500' },
  amber: { dot: 'bg-amber-500', ring: 'ring-amber-400/40', chip: 'bg-amber-50 text-amber-700 border-amber-200', chipDark: 'bg-amber-500/15 text-amber-300 border-amber-500/30', text: 'text-amber-500' },
  emerald: { dot: 'bg-emerald-500', ring: 'ring-emerald-400/40', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', chipDark: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', text: 'text-emerald-500' },
  fuchsia: { dot: 'bg-fuchsia-500', ring: 'ring-fuchsia-400/40', chip: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', chipDark: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30', text: 'text-fuchsia-500' },
};

export default function AgentsMapPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // --- Редактируемый граф агентов (хранится на бэке, tenant-scoped) ---
  const [agents, setAgents] = useState<AgentSpec[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false); // бэк недоступен (напр. preview без авторизации)

  // Загрузка набора агентов тенанта. При недоступном бэке — локальный фолбэк (без сохранения).
  useEffect(() => {
    let alive = true;
    agentsApi
      .list()
      .then((list) => { if (alive) { setAgents(list); setLoading(false); } })
      .catch(() => { if (alive) { setAgents(defaultAgents()); setOffline(true); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const selected = useMemo(() => agents.find((a) => a.id === selectedId) ?? null, [agents, selectedId]);
  const existingIds = useMemo(() => new Set(agents.map((a) => a.id)), [agents]);

  // Корни: агенты без родителя (или с «потерянным» родителем).
  const roots = useMemo(
    () => agents.filter((a) => !a.parentId || !existingIds.has(a.parentId)),
    [agents, existingIds],
  );
  const childrenOf = (pid: string) => agents.filter((a) => a.parentId === pid);

  // Выбор агента всегда открывает режим просмотра (не редактор).
  const selectAgent = (id: string) => { setSelectedId(id); setEditing(false); };

  // --- CRUD: оптимистичное локальное обновление + полная замена набора на бэке ---
  const commit = async (next: AgentSpec[]) => {
    setAgents(next); // мгновенный отклик UI
    if (offline) return; // бэк недоступен — изменения только локальные
    setSaving(true);
    try {
      const saved = await agentsApi.replace(next);
      setAgents(saved); // нормализованный ответ сервера
    } catch {
      toast.error('Не удалось сохранить агентов на сервере');
    } finally {
      setSaving(false);
    }
  };
  const saveAgent = (updated: AgentSpec) => {
    void commit(agents.map((a) => (a.id === updated.id ? updated : a)));
    setEditing(false);
  };
  const addSubAgent = (parentId: string | null) => {
    const a = newSpecialist(parentId);
    void commit([...agents, a]);
    setSelectedId(a.id);
    setEditing(true);
  };
  const deleteAgent = (id: string) => {
    if (!window.confirm('Удалить этого агента? Его под-агенты перейдут к вышестоящему.')) return;
    const node = agents.find((a) => a.id === id);
    const newParent = node?.parentId ?? null;
    const next = agents
      .filter((a) => a.id !== id)
      .map((a) => (a.parentId === id ? { ...a, parentId: newParent } : a));
    void commit(next);
    setSelectedId(null);
    setEditing(false);
  };
  const resetAll = async () => {
    if (!window.confirm('Сбросить всех агентов к стандартной конфигурации? Ваши правки будут удалены.')) return;
    setSelectedId(null);
    setEditing(false);
    if (offline) { setAgents(defaultAgents()); return; }
    setSaving(true);
    try {
      const list = await agentsApi.reset();
      setAgents(list);
    } catch {
      toast.error('Не удалось сбросить агентов на сервере');
    } finally {
      setSaving(false);
    }
  };

  // Допустимые родители для агента: все, кроме него самого и его потомков.
  const parentOptionsFor = (id: string) => {
    const desc = descendantIds(agents, id);
    return agents.filter((a) => a.id !== id && !desc.has(a.id)).map((a) => ({ id: a.id, name: a.name, emoji: a.emoji }));
  };

  // --- Измеренные коннекторы parent → child (строятся автоматически по иерархии) ---
  const graphRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [lines, setLines] = useState<Line[]>([]);

  useLayoutEffect(() => {
    const compute = () => {
      const container = graphRef.current;
      if (!container) return;
      const base = container.getBoundingClientRect();
      const next: Line[] = [];
      for (const a of agents) {
        if (!a.parentId) continue;
        const from = nodeRefs.current[a.parentId];
        const to = nodeRefs.current[a.id];
        if (!from || !to) continue;
        const f = from.getBoundingClientRect();
        const t = to.getBoundingClientRect();
        next.push({
          x1: f.left - base.left + f.width / 2,
          y1: f.bottom - base.top,
          x2: t.left - base.left + t.width / 2,
          y2: t.top - base.top,
        });
      }
      setLines(next);
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (graphRef.current) ro.observe(graphRef.current);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [agents]);

  const card = isDark ? 'bg-obsidian-900/60 border-obsidian-800' : 'bg-white border-obsidian-200';
  const muted = isDark ? 'text-obsidian-400' : 'text-obsidian-500';
  const heading = isDark ? 'text-white' : 'text-obsidian-900';
  const lineColor = isDark ? '#334155' : '#cbd5e1';

  const accentOf = (a: AgentSpec) => ACCENT[a.accent] ?? ACCENT.cyan;
  const chipCls = (a: AgentSpec) => (isDark ? accentOf(a).chipDark : accentOf(a).chip);

  if (loading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className={`flex flex-col items-center gap-3 ${muted}`}>
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <p className="text-sm">Загрузка агентов…</p>
        </div>
      </div>
    );
  }

  const renderNode = (a: AgentSpec) => {
    const acc = accentOf(a);
    const isSel = selectedId === a.id;
    const isRoot = !a.parentId;
    return (
      <button
        key={a.id}
        type="button"
        ref={(el) => { nodeRefs.current[a.id] = el; }}
        onClick={() => selectAgent(a.id)}
        className={`relative z-10 w-44 flex-shrink-0 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${card} ${
          isSel ? `ring-2 ${acc.ring}` : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{a.emoji}</span>
          <div className="min-w-0">
            <div className={`flex items-center gap-1 text-sm font-bold ${heading}`}>
              <span className="truncate">{a.name}</span>
              {isRoot && <Crown className={`h-3.5 w-3.5 flex-shrink-0 ${acc.text}`} />}
            </div>
            <div className={`truncate text-[11px] ${muted}`}>{a.title}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${chipCls(a)}`}>
            <Wrench className="h-3 w-3" /> {a.tools.length}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${chipCls(a)}`}>
            <Database className="h-3 w-3" /> {a.dataSources.length}
          </span>
          {a.whatsapp && (
            <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-300">
              <MessageCircle className="h-3 w-3" /> WA
            </span>
          )}
        </div>
      </button>
    );
  };

  // Рекурсивный рендер поддерева (org-chart).
  const renderSubtree = (a: AgentSpec): JSX.Element => {
    const kids = childrenOf(a.id);
    return (
      <div key={a.id} className="flex flex-col items-center">
        {renderNode(a)}
        {kids.length > 0 && (
          <div className="mt-12 flex items-start justify-center gap-6">
            {kids.map(renderSubtree)}
          </div>
        )}
      </div>
    );
  };

  const toolbarBtn = `inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
    isDark ? 'border-obsidian-700 text-obsidian-200 hover:bg-obsidian-800' : 'border-obsidian-300 text-obsidian-700 hover:bg-obsidian-100'
  }`;

  return (
    <div className="mx-auto w-full max-w-7xl p-4 lg:p-6">
      {/* Заголовок */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={`flex items-center gap-2 text-2xl font-bold tracking-tight ${heading}`}>
            <Bot className="h-6 w-6 text-cyan-500" />
            Карта агентов
          </h1>
          <p className={`mt-1 text-sm ${muted}`}>
            Иерархия агентов · под-агенты подчиняются вышестоящим · рантайм LangGraph · клик по агенту — детали и настройка
          </p>
        </div>
        <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 text-[11px] ${card} ${muted}`}>
          <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> read</span>
          <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5 text-amber-500" /> write · подтверждение</span>
          <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5 text-green-500" /> WhatsApp</span>
        </div>
      </div>

      {offline && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <CloudOff className="h-4 w-4 flex-shrink-0" />
          Сервер недоступен — показаны значения по умолчанию. Изменения не сохраняются (нужна авторизация на странице /agents-map).
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Граф иерархии */}
        <div className={`rounded-2xl border p-5 lg:col-span-2 ${card}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${muted}`}>
              <GitBranch className="h-4 w-4" /> Иерархия агентов
            </div>
            <div className="flex items-center gap-1.5">
              {saving && (
                <span className={`inline-flex items-center gap-1 text-[11px] ${muted}`}>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Сохранение…
                </span>
              )}
              <button type="button" onClick={() => addSubAgent(roots[0]?.id ?? null)} className={toolbarBtn}>
                <Plus className="h-4 w-4 text-cyan-500" /> Добавить агента
              </button>
              <button type="button" onClick={resetAll} className={toolbarBtn} title="Сбросить всех агентов к стандарту">
                <RotateCcw className="h-4 w-4" /> Сбросить всё
              </button>
            </div>
          </div>

          {/* Точки входа */}
          <div className="mb-5">
            <div className={`mb-2 text-[11px] font-medium ${muted}`}>Точки входа (доступ по отделу/роли)</div>
            <div className="flex flex-wrap gap-2">
              {ENTRY_POINTS.filter((e) => existingIds.has(e.agentId)).map((e) => (
                <button
                  key={e.label}
                  type="button"
                  onClick={() => selectAgent(e.agentId)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${card} ${heading} hover:border-cyan-400`}
                >
                  <span>{e.emoji}</span>
                  <span>{e.label}</span>
                  <ArrowRight className={`h-3 w-3 ${muted}`} />
                  <span className="font-semibold uppercase">{e.agentId}</span>
                  {e.channel === 'web+whatsapp' && <MessageCircle className="h-3 w-3 text-green-500" />}
                </button>
              ))}
            </div>
          </div>

          {/* Дерево + SVG-коннекторы (горизонтальная прокрутка для широких деревьев) */}
          <div className="overflow-x-auto pb-2">
            <div ref={graphRef} className="relative min-w-max">
              <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                {lines.map((l, i) => {
                  const midY = (l.y1 + l.y2) / 2;
                  return (
                    <path
                      key={i}
                      d={`M ${l.x1} ${l.y1} C ${l.x1} ${midY}, ${l.x2} ${midY}, ${l.x2} ${l.y2}`}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  );
                })}
              </svg>

              <div className="flex items-start justify-center gap-10">
                {roots.map(renderSubtree)}
              </div>
            </div>
          </div>

          <p className={`mt-5 text-[11px] ${muted}`}>
            Пунктир — подчинение/делегирование (handoff): вышестоящий агент направляет подзадачу
            под-агенту и получает результат обратно. Под-агента можно подвесить под любого агента,
            не только CEO — связи строятся автоматически.
          </p>
        </div>

        {/* Панель деталей / редактор */}
        <div className={`rounded-2xl border p-5 ${card}`}>
          {!selected ? (
            <div className={`flex h-full min-h-[300px] flex-col items-center justify-center text-center ${muted}`}>
              <Bot className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">Выберите агента на схеме,<br />чтобы увидеть и настроить его<br />инструкцию, инструменты и данные.</p>
              <button type="button" onClick={() => addSubAgent(roots[0]?.id ?? null)} className={`mt-4 ${toolbarBtn}`}><Plus className="h-4 w-4 text-cyan-500" /> Добавить агента</button>
            </div>
          ) : editing ? (
            <AgentEditorPanel
              agent={selected}
              isDark={isDark}
              canDelete={agents.length > 1}
              parents={parentOptionsFor(selected.id)}
              onSave={saveAgent}
              onCancel={() => setEditing(false)}
              onDelete={() => deleteAgent(selected.id)}
            />
          ) : (
            <div className="space-y-5">
              {/* Шапка */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selected.emoji}</span>
                  <div>
                    <div className={`flex items-center gap-1.5 text-lg font-bold ${heading}`}>
                      {selected.name}
                      {selected.whatsapp && <MessageCircle className="h-4 w-4 text-green-500" />}
                    </div>
                    <div className={`text-xs ${muted}`}>{selected.title}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2 py-1 text-[11px] font-medium text-cyan-700 transition-colors hover:bg-cyan-100 dark:bg-cyan-500/15 dark:text-cyan-300 dark:hover:bg-cyan-500/25"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className={`rounded-lg p-1.5 ${isDark ? 'hover:bg-obsidian-800 text-obsidian-400' : 'hover:bg-obsidian-100 text-obsidian-500'}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Подчинение */}
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const parent = selected.parentId ? agents.find((a) => a.id === selected.parentId) : null;
                  const kids = childrenOf(selected.id);
                  return (
                    <>
                      <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${isDark ? 'border-obsidian-700 text-obsidian-300' : 'border-obsidian-200 text-obsidian-600'}`}>
                        {parent ? <>Подчиняется: <b className={heading}>{parent.emoji} {parent.name}</b></> : <>Корневой агент <Crown className="h-3 w-3 text-cyan-500" /></>}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${isDark ? 'border-obsidian-700 text-obsidian-300' : 'border-obsidian-200 text-obsidian-600'}`}>
                        Под-агентов: <b className={heading}>{kids.length}</b>
                      </span>
                      <button
                        type="button"
                        onClick={() => addSubAgent(selected.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2 py-1 text-[11px] font-medium text-cyan-700 transition-colors hover:bg-cyan-100 dark:bg-cyan-500/15 dark:text-cyan-300 dark:hover:bg-cyan-500/25"
                      >
                        <Plus className="h-3.5 w-3.5" /> Под-агент
                      </button>
                    </>
                  );
                })()}
              </div>

              {/* Доступ */}
              <div>
                <div className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wide ${muted}`}>Кто обращается</div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.accessRoles.map((r) => (
                    <span key={r} className={`rounded-full border px-2 py-0.5 text-[11px] ${chipCls(selected)}`}>{r}</span>
                  ))}
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${selected.whatsapp ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-300' : (isDark ? 'border-obsidian-700 text-obsidian-400' : 'border-obsidian-200 text-obsidian-500')}`}>
                    {selected.whatsapp ? 'Web + WhatsApp' : 'Только Web'}
                  </span>
                </div>
              </div>

              {/* Инструкция */}
              <div>
                <div className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wide ${muted}`}>Инструкция (system prompt)</div>
                {selected.instruction.trim() ? (
                  <p className={`whitespace-pre-wrap rounded-xl border p-3 text-[13px] leading-relaxed ${isDark ? 'border-obsidian-800 bg-obsidian-950/40 text-obsidian-200' : 'border-obsidian-200 bg-obsidian-50 text-obsidian-700'}`}>
                    {selected.instruction}
                  </p>
                ) : (
                  <p className={`rounded-xl border border-dashed p-3 text-[13px] ${isDark ? 'border-obsidian-700 text-obsidian-500' : 'border-obsidian-300 text-obsidian-400'}`}>
                    Инструкция не задана — нажмите «Изменить».
                  </p>
                )}
              </div>

              {/* Инструменты */}
              <div>
                <div className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${muted}`}>
                  <Wrench className="h-3.5 w-3.5" /> Инструменты ({selected.tools.length})
                </div>
                <div className="space-y-1.5">
                  {selected.tools.map((tl, i) => (
                    <div key={i} className={`rounded-lg border p-2.5 ${isDark ? 'border-obsidian-800' : 'border-obsidian-200'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <code className={`text-[12px] font-semibold ${heading}`}>{tl.name}</code>
                        {tl.access === 'read' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                            <ShieldCheck className="h-3 w-3" /> read
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                            <Lock className="h-3 w-3" /> write{tl.confirm ? ' · confirm' : ''}
                          </span>
                        )}
                      </div>
                      {tl.desc && <div className={`mt-0.5 text-[11px] ${muted}`}>{tl.desc}</div>}
                      <code className={`mt-1 block truncate text-[10px] ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>{tl.endpoint}</code>
                    </div>
                  ))}
                  {selected.tools.length === 0 && <p className={`text-xs ${muted}`}>Инструменты не заданы.</p>}
                </div>
              </div>

              {/* Источники данных */}
              <div>
                <div className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${muted}`}>
                  <Database className="h-3.5 w-3.5" /> Данные для аналитики ({selected.dataSources.length})
                </div>
                <div className="space-y-1.5">
                  {selected.dataSources.map((d, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg border p-2.5 ${isDark ? 'border-obsidian-800' : 'border-obsidian-200'}`}>
                      <Database className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${muted}`} />
                      <div>
                        <div className={`text-[12px] font-medium ${heading}`}>{d.label}</div>
                        <code className={`text-[10px] ${muted}`}>{d.source}</code>
                      </div>
                    </div>
                  ))}
                  {selected.dataSources.length === 0 && <p className={`text-xs ${muted}`}>Источники данных не заданы.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
