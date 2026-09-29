import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateEs, initialsOf, isExpired } from '../../lib/format';
import { buildRoutineCopy, createRoutine } from '../../services/routinesService';
import type { Routine, UserRef } from '../../types';
import { MoreVerticalIcon } from '../layout/icons';

interface RoutineListItemProps {
  routine: Routine;
  currentUser: UserRef;
  onRequestDelete: (routine: Routine) => void;
  /** Set only in the admin's cross-gym view, where rows from several gyms are mixed. */
  gymName: string | null;
}

export default function RoutineListItem({
  routine,
  currentUser,
  onRequestDelete,
  gymName,
}: RoutineListItemProps) {
  const navigate = useNavigate();
  const [copying, setCopying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const expired = isExpired(routine.endDate);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsideClick = (e: globalThis.MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [menuOpen]);

  function handleMenuToggle(e: MouseEvent) {
    e.stopPropagation();
    setMenuOpen((open) => !open);
  }

  async function handleCopy(e: MouseEvent) {
    e.stopPropagation();
    setCopying(true);
    try {
      const newId = await createRoutine(buildRoutineCopy(routine), routine.gymId, currentUser);
      navigate(`/routines/${newId}/edit`);
    } finally {
      setCopying(false);
      setMenuOpen(false);
    }
  }

  function handleNewVersionClick(e: MouseEvent) {
    e.stopPropagation();
    navigate(`/routines/${routine.id}/new-version`);
  }

  function handleDeleteClick(e: MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
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
        <div className="flex items-center gap-2 min-w-0">
          <div className="font-bold text-[15px] truncate">{routine.student || 'Sin nombre'}</div>
          {routine.version > 1 ? (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-bold">
              v{routine.version}
            </span>
          ) : null}
          {gymName ? (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-bold">
              {gymName}
            </span>
          ) : null}
        </div>
        <div className="text-[12.5px] text-stone-500 mt-0.5">
          Creada el {formatDateEs(new Date(routine.createdAt).toISOString().slice(0, 10))} ·{' '}
          {routine.periodicity}x/semana
          {routine.objective ? ` · ${routine.objective}` : ''}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[12.5px] font-semibold text-stone-700">
          {formatDateEs(routine.startDate)} - {formatDateEs(routine.endDate)}
        </div>
        <div
          className="mt-1 inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold"
          style={{
            // Hardcoded (not var(--color-*)): this is a JS-computed style, not a literal
            // Tailwind class, so Tailwind's scanner never sees "red-100"/"red-800" as
            // strings and won't emit those variables — see the note in colors.ts.
            background: expired ? 'oklch(93.6% 0.032 17.717)' : 'oklch(92.3% 0.003 48.717)',
            color: expired ? 'oklch(44.4% 0.177 26.899)' : 'oklch(44.4% 0.011 73.639)',
          }}
        >
          {expired ? 'VENCIDA' : 'VIGENTE'}
        </div>
      </div>
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          aria-label="Acciones"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={handleMenuToggle}
          className="w-8 h-8 flex items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 cursor-pointer bg-transparent border-none text-lg"
        >
          <MoreVerticalIcon />
        </button>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-9 z-10 min-w-[160px] bg-white border border-stone-200 rounded-[10px] shadow-lg py-1"
          >
            <button
              type="button"
              role="menuitem"
              onClick={(e) => void handleCopy(e)}
              disabled={copying}
              className="w-full text-left px-3.5 py-2 text-[13px] font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer bg-transparent border-none disabled:opacity-60"
            >
              {copying ? 'Copiando…' : 'Copiar'}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleNewVersionClick}
              className="w-full text-left px-3.5 py-2 text-[13px] font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer bg-transparent border-none"
            >
              Nueva versión
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleDeleteClick}
              className="w-full text-left px-3.5 py-2 text-[13px] font-semibold text-red-700 hover:bg-stone-50 cursor-pointer bg-transparent border-none"
            >
              Eliminar
            </button>
          </div>
        ) : null}
      </div>
      <div className="text-stone-400 text-lg shrink-0">&gt;</div>
    </div>
  );
}
