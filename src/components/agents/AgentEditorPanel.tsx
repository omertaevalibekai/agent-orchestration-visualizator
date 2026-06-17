import { useState } from 'react';
import { Check, X, Trash2, Plus, Wrench, Database, MessageCircle } from 'lucide-react';
import type { AgentSpec, AgentTool, AgentDataSource, ToolAccess } from '@/config/agentsArchitecture';

const ACCENTS = ['cyan', 'teal', 'amber', 'emerald', 'fuchsia'] as const;

interface ParentOption {
  id: string;
  name: string;
  emoji: string;
}

interface Props {
  agent: AgentSpec;
  isDark: boolean;
  canDelete: boolean;
  /** Допустимые родители (без самого агента и его потомков — защита от циклов). */
  parents: ParentOption[];
  onSave: (a: AgentSpec) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export default function AgentEditorPanel({ agent, isDark, canDelete, parents, onSave, onCancel, onDelete }: Props) {
  const [d, setD] = useState<AgentSpec>(() => JSON.parse(JSON.stringify(agent)) as AgentSpec);
  const [roleInput, setRoleInput] = useState('');

  const input = `w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-cyan-400/40 ${
    isDark ? 'border-obsidian-700 bg-obsidian-950/60 text-obsidian-100' : 'border-obsidian-300 bg-white text-obsidian-800'
  }`;
  const label = `mb-1 block text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-obsidian-400' : 'text-obsidian-500'}`;
  const heading = isDark ? 'text-white' : 'text-obsidian-900';
  const muted = isDark ? 'text-obsidian-400' : 'text-obsidian-500';
  const rowBox = `rounded-lg border p-2.5 space-y-2 ${isDark ? 'border-obsidian-800' : 'border-obsidian-200'}`;

  const set = <K extends keyof AgentSpec>(k: K, v: AgentSpec[K]) => setD((p) => ({ ...p, [k]: v }));

  // --- access roles ---
  const addRole = () => {
    const r = roleInput.trim();
    if (!r || d.accessRoles.includes(r)) { setRoleInput(''); return; }
    set('accessRoles', [...d.accessRoles, r]);
    setRoleInput('');
  };
  const removeRole = (r: string) => set('accessRoles', d.accessRoles.filter((x) => x !== r));

  // --- tools ---
  const patchTool = (i: number, patch: Partial<AgentTool>) =>
    set('tools', d.tools.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const addTool = () =>
    set('tools', [...d.tools, { name: 'new_tool', endpoint: 'GET /api/v1/...', access: 'read', desc: '' }]);
  const removeTool = (i: number) => set('tools', d.tools.filter((_, idx) => idx !== i));

  // --- data sources ---
  const patchDS = (i: number, patch: Partial<AgentDataSource>) =>
    set('dataSources', d.dataSources.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const addDS = () => set('dataSources', [...d.dataSources, { label: '', source: '' }]);
  const removeDS = (i: number) => set('dataSources', d.dataSources.filter((_, idx) => idx !== i));

  const save = () => onSave({ ...d, name: d.name.trim() || 'Без имени' });

  return (
    <div className="space-y-5">
      {/* Шапка-форма */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <input
            value={d.emoji}
            onChange={(e) => set('emoji', e.target.value.slice(0, 4))}
            className={`w-12 rounded-lg border px-2 py-1.5 text-center text-xl outline-none focus:ring-2 focus:ring-cyan-400/40 ${isDark ? 'border-obsidian-700 bg-obsidian-950/60' : 'border-obsidian-300 bg-white'}`}
            aria-label="Эмодзи"
          />
          <div className="flex-1 space-y-1.5">
            <input value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Имя агента" className={`${input} font-bold`} />
            <input value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="Краткое описание роли" className={input} />
          </div>
        </div>
        <button type="button" onClick={onCancel} className={`rounded-lg p-1.5 ${isDark ? 'hover:bg-obsidian-800 text-obsidian-400' : 'hover:bg-obsidian-100 text-obsidian-500'}`}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Цвет + WhatsApp */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <span className={label}>Цвет</span>
          <div className="flex items-center gap-1.5">
            {ACCENTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set('accent', c)}
                className={`h-6 w-6 rounded-full bg-${c}-500 transition-transform ${d.accent === c ? 'ring-2 ring-offset-2 ' + (isDark ? 'ring-white ring-offset-obsidian-900' : 'ring-obsidian-900 ring-offset-white') : 'opacity-70 hover:opacity-100'}`}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={d.whatsapp} onChange={(e) => set('whatsapp', e.target.checked)} className="h-4 w-4 accent-green-500" />
          <span className={`inline-flex items-center gap-1 ${heading}`}><MessageCircle className="h-4 w-4 text-green-500" /> Доступен в WhatsApp</span>
        </label>
      </div>

      {/* Родитель (кому подчиняется) */}
      <div>
        <span className={label}>Подчиняется (вышестоящий агент)</span>
        <select
          value={d.parentId ?? ''}
          onChange={(e) => set('parentId', e.target.value ? e.target.value : null)}
          className={input}
        >
          <option value="">— Корневой (без родителя) —</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
          ))}
        </select>
      </div>

      {/* Доступ (роли) */}
      <div>
        <span className={label}>Кто обращается (роли / отделы)</span>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {d.accessRoles.map((r) => (
            <span key={r} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${isDark ? 'border-obsidian-700 text-obsidian-200' : 'border-obsidian-200 text-obsidian-700'}`}>
              {r}
              <button type="button" onClick={() => removeRole(r)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRole(); } }}
            placeholder="напр. hr, manager, Finance dept"
            className={input}
          />
          <button type="button" onClick={addRole} className={`flex-shrink-0 rounded-lg border px-2.5 ${isDark ? 'border-obsidian-700 text-obsidian-200 hover:bg-obsidian-800' : 'border-obsidian-300 text-obsidian-700 hover:bg-obsidian-100'}`}><Plus className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Инструкция */}
      <div>
        <span className={label}>Инструкция (system prompt)</span>
        <textarea
          value={d.instruction}
          onChange={(e) => set('instruction', e.target.value)}
          rows={7}
          placeholder="Опишите роль агента, что он умеет и его границы…"
          className={`${input} resize-y leading-relaxed`}
        />
      </div>

      {/* Инструменты */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${muted}`}><Wrench className="h-3.5 w-3.5" /> Инструменты ({d.tools.length})</span>
          <button type="button" onClick={addTool} className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2 py-1 text-[11px] font-medium text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-500/15 dark:text-cyan-300 dark:hover:bg-cyan-500/25"><Plus className="h-3.5 w-3.5" /> Инструмент</button>
        </div>
        <div className="space-y-2">
          {d.tools.map((t, i) => (
            <div key={i} className={rowBox}>
              <div className="flex items-center gap-1.5">
                <input value={t.name} onChange={(e) => patchTool(i, { name: e.target.value })} placeholder="имя_инструмента" className={`${input} font-mono text-xs`} />
                <button type="button" onClick={() => removeTool(i)} className="flex-shrink-0 rounded-lg p-1.5 text-obsidian-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/15"><Trash2 className="h-4 w-4" /></button>
              </div>
              <input value={t.endpoint} onChange={(e) => patchTool(i, { endpoint: e.target.value })} placeholder="GET /api/v1/... или сервис" className={`${input} font-mono text-xs`} />
              <input value={t.desc} onChange={(e) => patchTool(i, { desc: e.target.value })} placeholder="что делает инструмент" className={input} />
              <div className="flex items-center gap-3">
                <select value={t.access} onChange={(e) => patchTool(i, { access: e.target.value as ToolAccess })} className={`${input} w-auto`}>
                  <option value="read">read</option>
                  <option value="write">write</option>
                </select>
                {t.access === 'write' && (
                  <label className={`flex cursor-pointer items-center gap-1.5 text-xs ${heading}`}>
                    <input type="checkbox" checked={!!t.confirm} onChange={(e) => patchTool(i, { confirm: e.target.checked })} className="h-4 w-4 accent-amber-500" />
                    требует подтверждения
                  </label>
                )}
              </div>
            </div>
          ))}
          {d.tools.length === 0 && <p className={`text-xs ${muted}`}>Пока нет инструментов.</p>}
        </div>
      </div>

      {/* Источники данных */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${muted}`}><Database className="h-3.5 w-3.5" /> Данные для аналитики ({d.dataSources.length})</span>
          <button type="button" onClick={addDS} className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2 py-1 text-[11px] font-medium text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-500/15 dark:text-cyan-300 dark:hover:bg-cyan-500/25"><Plus className="h-3.5 w-3.5" /> Источник</button>
        </div>
        <div className="space-y-2">
          {d.dataSources.map((s, i) => (
            <div key={i} className={rowBox}>
              <div className="flex items-center gap-1.5">
                <input value={s.label} onChange={(e) => patchDS(i, { label: e.target.value })} placeholder="что берёт (например, выручка)" className={input} />
                <button type="button" onClick={() => removeDS(i)} className="flex-shrink-0 rounded-lg p-1.5 text-obsidian-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/15"><Trash2 className="h-4 w-4" /></button>
              </div>
              <input value={s.source} onChange={(e) => patchDS(i, { source: e.target.value })} placeholder="откуда (сервис / таблица)" className={`${input} font-mono text-xs`} />
            </div>
          ))}
          {d.dataSources.length === 0 && <p className={`text-xs ${muted}`}>Пока нет источников данных.</p>}
        </div>
      </div>

      {/* Действия */}
      <div className={`flex items-center justify-between gap-2 border-t pt-4 ${isDark ? 'border-obsidian-800' : 'border-obsidian-200'}`}>
        {canDelete ? (
          <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15"><Trash2 className="h-3.5 w-3.5" /> Удалить агента</button>
        ) : <span />}
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onCancel} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium ${isDark ? 'text-obsidian-300 hover:bg-obsidian-800' : 'text-obsidian-600 hover:bg-obsidian-100'}`}><X className="h-3.5 w-3.5" /> Отмена</button>
          <button type="button" onClick={save} className="inline-flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-cyan-600"><Check className="h-3.5 w-3.5" /> Сохранить</button>
        </div>
      </div>
    </div>
  );
}
