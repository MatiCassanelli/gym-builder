import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateEs, initialsOf, isExpired } from '../../lib/format';
import { buildRoutineCopy, createRoutine } from '../../services/routinesService';
import type { Routine, UserRef } from '../../types';

interface RoutineListItemProps {
  routine: Routine;
  currentUser: UserRef;
  onRequestDelete: (routine: Routine) => void;
}

export default function RoutineListItem({
  routine,
  currentUser,
  onRequestDelete,
}: RoutineListItemProps) {
  const navigate = useNavigate();
  const [copying, setCopying] = useState(false);
  const expired = isExpired(routine.endDate);

  async function handleCopy(e: MouseEvent) {
    e.stopPropagation();
    setCopying(true);
    try {
      const newId = await createRoutine(buildRoutineCopy(routine), currentUser);
      navigate(`/routines/${newId}/edit`);
    } finally {
      setCopying(false);
    }
  }

  function handleDeleteClick(e: MouseEvent) {
    e.stopPropagation();
    onRequestDelete(routine);
  }

  return (
    <div
      onClick={() => navigate(`/routines/${routine.id}/edit`)}
      className="flex items-center gap-4 bg-white border border-stone-200 rounded-[13px] px-[18px] py-4 cursor-pointer"
    >
      <div className="w-[42px] h-[42px] rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-extrabold text-sm shrink-0">
        {initialsOf(routine.student)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[15px]">{routine.student || 'Sin nombre'}</div>
        <div className="text-[12.5px] text-stone-500 mt-0.5">
          Creada el {formatDateEs(new Date(routine.createdAt).toISOString().slice(0, 10))} ·{' '}
          {routine.periodicity}x/semana
          {routine.objective ? ` · ${routine.objective}` : ''}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[12.5px] font-semibold text-stone-700">
          {formatDateEs(routine.startDate)} → {formatDateEs(routine.endDate)}
        </div>
        <div
          className="mt-1 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold"
          style={{
            // Hardcoded (not var(--color-*)): this is a JS-computed style, not a literal
            // Tailwind class, so Tailwind's scanner never sees "red-100"/"red-800" as
            // strings and won't emit those variables — see the note in muscleGroups.ts.
            background: expired ? 'oklch(93.6% 0.032 17.717)' : 'oklch(92.3% 0.003 48.717)',
            color: expired ? 'oklch(44.4% 0.177 26.899)' : 'oklch(44.4% 0.011 73.639)',
          }}
        >
          {expired ? 'VENCIDA' : 'VIGENTE'}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={(e) => void handleCopy(e)}
          disabled={copying}
          className="text-[12.5px] font-semibold text-stone-700 cursor-pointer bg-transparent border-none p-0 disabled:opacity-60"
        >
          {copying ? 'Copiando…' : 'Copiar'}
        </button>
        <button
          type="button"
          onClick={handleDeleteClick}
          className="text-[12.5px] font-semibold text-red-700 cursor-pointer bg-transparent border-none p-0"
        >
          Eliminar
        </button>
      </div>
      <div className="text-stone-400 text-lg shrink-0">›</div>
    </div>
  );
}
