import { useMemo, useState } from 'react';
import { MUSCLE_GROUPS } from '../../types';
import type { Exercise } from '../../types';

interface ExercisePickerModalProps {
  exercises: Exercise[];
  activeDay: number;
  onAdd: (exerciseId: string) => void;
  onClose: () => void;
}

export default function ExercisePickerModal({
  exercises,
  activeDay,
  onAdd,
  onClose,
}: ExercisePickerModalProps) {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('Todos');

  const groupedList = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = exercises.filter((e) => {
      const matchGroup = groupFilter === 'Todos' || e.group === groupFilter;
      const matchSearch = !q || e.name.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
    const groups = groupFilter === 'Todos' ? MUSCLE_GROUPS : [groupFilter];
    return groups
      .map((g) => ({ group: g, items: filtered.filter((e) => e.group === g) }))
      .filter((g) => g.items.length > 0);
  }, [exercises, search, groupFilter]);

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
          <div className="text-[17px] font-extrabold">Elegir ejercicio — Día {activeDay}</div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-lg text-stone-500 bg-transparent border-none"
          >
            ✕
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
        />

        <div className="flex gap-1.5 flex-wrap">
          {['Todos', ...MUSCLE_GROUPS].map((g) => {
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
