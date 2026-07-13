import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import RoutineListItem from './RoutineListItem';
import { deleteRoutine } from '../../services/routinesService';
import type { Profesor, Routine, UserRef } from '../../types';

interface RoutinesListPageProps {
  routines: Routine[];
  loading: boolean;
  currentUser: UserRef;
  profesores: Profesor[];
}

function profesorName(p: Profesor): string {
  return `${p.nombre} ${p.apellido}`.trim();
}

function titleFor(
  selectedProfesorId: string,
  currentUserUid: string,
  selectedProfesor: Profesor | undefined,
): string {
  if (selectedProfesorId === 'all') return 'Todas las rutinas';
  if (selectedProfesorId === currentUserUid) return 'Mis rutinas';
  if (selectedProfesor) return `Rutinas de ${profesorName(selectedProfesor)}`;
  return 'Rutinas';
}

export default function RoutinesListPage({
  routines,
  loading,
  currentUser,
  profesores,
}: RoutinesListPageProps) {
  const navigate = useNavigate();
  const [routineToDelete, setRoutineToDelete] = useState<Routine | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedProfesorId, setSelectedProfesorId] = useState<string>(currentUser.uid);
  const [search, setSearch] = useState('');

  // Own profile pinned first (labeled "(yo)"), the rest of the shared profesores table
  // follows alphabetically — chips reflect the trainer roster in Firestore, not just
  // whoever happens to have authored a routine. Profesores flagged skipFromFilters are
  // left out of the chip list entirely (e.g. shared/admin accounts).
  const profesorChips = useMemo(() => {
    const visible = profesores.filter((p) => !p.skipFromFilters);
    const others = visible
      .filter((p) => p.id !== currentUser.uid)
      .sort((a, b) => profesorName(a).localeCompare(profesorName(b)));
    const mine = visible.find((p) => p.id === currentUser.uid);
    const ordered = mine ? [mine, ...others] : others;
    return ordered.map((p) => ({
      id: p.id,
      label: p.id === currentUser.uid ? `${profesorName(p)} (yo)` : profesorName(p),
      count: routines.filter((r) => r.createdBy.uid === p.id).length,
    }));
  }, [profesores, routines, currentUser.uid]);

  const selectedProfesor = profesores.find((p) => p.id === selectedProfesorId);
  const title = titleFor(selectedProfesorId, currentUser.uid, selectedProfesor);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return routines
      .filter((r) => selectedProfesorId === 'all' || r.createdBy.uid === selectedProfesorId)
      .filter((r) => !term || r.student.toLowerCase().includes(term));
  }, [routines, selectedProfesorId, search]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (a.endDate || '9999').localeCompare(b.endDate || '9999')),
    [filtered],
  );

  async function handleConfirmDelete() {
    if (!routineToDelete) return;
    setDeleting(true);
    try {
      await deleteRoutine(routineToDelete.id);
      setRoutineToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  let listContent: ReactNode;
  if (loading) {
    listContent = <div className="py-16 text-center text-stone-500 text-sm">Cargando…</div>;
  } else if (sorted.length === 0) {
    const emptyMessage =
      search.trim() || selectedProfesorId !== 'all'
        ? 'No se encontraron rutinas con ese filtro.'
        : 'Todavía no creaste ninguna rutina.';
    listContent = (
      <div className="py-16 text-center text-stone-500 text-sm border-[1.5px] border-dashed border-stone-300 rounded-xl">
        {emptyMessage}
      </div>
    );
  } else {
    listContent = (
      <div className="flex flex-col gap-2.5">
        {sorted.map((r) => (
          <RoutineListItem
            key={r.id}
            routine={r}
            currentUser={currentUser}
            onRequestDelete={setRoutineToDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 max-w-[1180px] w-full mx-auto">
      <div className="flex items-end justify-between mb-[22px] gap-4 flex-wrap">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">{title}</div>
          <div className="text-stone-500 text-sm mt-1">
            Ordenadas por vencimiento — las que están por vencer aparecen primero.
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/routines/new')}
          className="bg-red-600 text-white font-semibold text-sm px-[18px] py-2.75 rounded-lg cursor-pointer whitespace-nowrap border-none"
        >
          + Nueva rutina
        </button>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre de alumno..."
        className="w-full mb-3.5 px-4 py-2.75 rounded-lg border border-stone-300 text-sm bg-white outline-none focus:border-stone-500"
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setSelectedProfesorId('all')}
          className={`px-3.5 py-1.75 rounded-full text-[13px] font-semibold cursor-pointer border ${
            selectedProfesorId === 'all'
              ? 'bg-red-600 border-red-600 text-white'
              : 'bg-white border-stone-300 text-stone-700'
          }`}
        >
          Todos ({routines.length})
        </button>
        {profesorChips.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedProfesorId(p.id)}
            className={`px-3.5 py-1.75 rounded-full text-[13px] font-semibold cursor-pointer border whitespace-nowrap ${
              selectedProfesorId === p.id
                ? 'bg-red-600 border-red-600 text-white'
                : 'bg-white border-stone-300 text-stone-700'
            }`}
          >
            {p.label} ({p.count})
          </button>
        ))}
      </div>

      {listContent}

      {routineToDelete ? (
        <div
          className="fixed inset-0 bg-[rgba(20,15,10,0.45)] flex items-center justify-center z-50"
          onClick={() => setRoutineToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-[420px] max-w-[92vw] p-[26px] flex flex-col gap-3.5"
          >
            <div className="text-[17px] font-extrabold">Eliminar rutina</div>
            <div className="text-sm text-stone-700">
              ¿Seguro que querés eliminar la rutina de{' '}
              <strong>{routineToDelete.student || 'este alumno'}</strong>? Esta acción no se puede
              deshacer.
            </div>
            <div className="flex gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setRoutineToDelete(null)}
                className="flex-1 text-center py-2.75 rounded-lg border border-stone-300 font-semibold text-sm cursor-pointer bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={deleting}
                className="flex-1 text-center py-2.75 rounded-lg bg-red-700 text-white font-semibold text-sm cursor-pointer border-none disabled:opacity-60"
              >
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
