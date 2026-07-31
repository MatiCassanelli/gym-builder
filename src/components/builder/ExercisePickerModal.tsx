import { useMemo, useState } from 'react';
import { MUSCLE_GROUPS, WARMUP_MUSCLE_GROUPS, WARMUP_PHASES } from '../../types';
import type { Exercise, WarmupPhaseKey } from '../../types';

const WARMUP_GROUPS = new Set(WARMUP_MUSCLE_GROUPS);

// 'day' adds to the day being edited; 'warmup' adds to that phase of the warm-up block.
export type PickerTarget = { kind: 'day' } | { kind: 'warmup'; phase: WarmupPhaseKey };

interface ExercisePickerModalProps {
  exercises: Exercise[];
  target: PickerTarget;
  activeDay: number;
  onAdd: (exerciseId: string) => void;
  onClose: () => void;
}

export default function ExercisePickerModal({
  exercises,
  target,
  activeDay,
  onAdd,
  onClose,
}: ExercisePickerModalProps) {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('Todos');

  const phaseTitle =
    target.kind === 'warmup' ? WARMUP_PHASES.find((p) => p.key === target.phase)?.title : undefined;
  const title = phaseTitle ? `Agregar a ${phaseTitle}` : `Elegir ejercicio — Día ${activeDay}`;

  const orderedGroups = useMemo(() => {
    if (!phaseTitle) return [...MUSCLE_GROUPS];
    const warmupFirst = MUSCLE_GROUPS.filter((g) => WARMUP_GROUPS.has(g));
    const rest = MUSCLE_GROUPS.filter((g) => !WARMUP_GROUPS.has(g));
    return [...warmupFirst, ...rest];
  }, [phaseTitle]);

  const groupedList = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = exercises.filter((e) => {
      const matchGroup = groupFilter === 'Todos' || e.group === groupFilter;
      const matchSearch = !q || e.name.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
    const groups = groupFilter === 'Todos' ? orderedGroups : [groupFilter];
    return groups
      .map((g) => ({ group: g, items: filtered.filter((e) => e.group === g) }))
      .filter((g) => g.items.length > 0);
  }, [exercises, search, groupFilter, orderedGroups]);

  return (
    <div
      className="fixed inset-0 bg-[rgba(20,15,10,0.45)] flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-[640px] max-w-[94vw] max-h-[80vh] p-[22px] flex flex-col gap-3.5"
      >
        <div className="flex items-center justify-between">
          <div className="text-[17px] font-extrabold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-lg text-stone-500 bg-transparent border-none"
          >
            X
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
        />

        <div className="flex gap-1.5 flex-wrap">
          {['Todos', ...orderedGroups].map((g) => {
            const active = groupFilter === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGroupFilter(g)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer border"
                style={{
                  borderColor: active ? 'transparent' : 'var(--color-stone-200)',
                  background: active ? 'var(--color-red-600)' : '#fff',
                  color: active ? '#fff' : 'var(--color-stone-700)',
                }}
              >
                {g}
              </button>
            );
          })}
        </div>

        <div className="overflow-y-auto flex flex-col gap-3.5 pr-1">
          {groupedList.length === 0 ? (
            <div className="text-center text-sm text-stone-500 py-6">
              No hay ejercicios con ese filtro.
            </div>
          ) : (
            groupedList.map((grp) => (
              <div key={grp.group}>
                <div className="text-[11.5px] font-extrabold uppercase tracking-wide text-stone-500 mb-2">
                  {grp.group}
                </div>
                <div className="flex flex-col gap-1.5">
                  {grp.items.map((it) => (
                    <div
                      key={it.id}
                      onClick={() => onAdd(it.id)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-stone-200 cursor-pointer hover:bg-red-50"
                    >
                      <div className="font-semibold text-[13.5px]">{it.name}</div>
                      <div className="text-xs font-bold text-red-700">
                        + Agregar
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
