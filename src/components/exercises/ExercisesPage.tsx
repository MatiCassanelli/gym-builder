import { useMemo, useState } from 'react';
import ExerciseCard from './ExerciseCard';
import ExerciseFormModal from './ExerciseFormModal';
import { MUSCLE_GROUPS } from '../../types';
import type { Exercise, ExerciseInput, UserRef } from '../../types';
import { createExercise, deleteExercise, updateExercise } from '../../services/exercisesService';

interface ExercisesPageProps {
  exercises: Exercise[];
  loading: boolean;
  currentUser: UserRef;
}

export default function ExercisesPage({ exercises, loading, currentUser }: ExercisesPageProps) {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('Todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: exercises.length };
    MUSCLE_GROUPS.forEach((g) => {
      counts[g] = exercises.filter((e) => e.group === g).length;
    });
    return counts;
  }, [exercises]);

  const visibleExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((e) => {
      const matchGroup = groupFilter === 'Todos' || e.group === groupFilter;
      const matchSearch = !q || e.name.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
  }, [exercises, search, groupFilter]);

  function openNew() {
    setEditingExercise(null);
    setFormOpen(true);
  }

  function openEdit(exercise: Exercise) {
    setEditingExercise(exercise);
    setFormOpen(true);
  }

  async function handleSave(input: ExerciseInput) {
    if (editingExercise) {
      await updateExercise(editingExercise.id, input, currentUser);
    } else {
      await createExercise(input, currentUser);
    }
    setFormOpen(false);
  }

  async function handleDelete(exercise: Exercise) {
    if (!window.confirm(`¿Eliminar "${exercise.name}" de la biblioteca?`)) return;
    await deleteExercise(exercise.id);
  }

  return (
    <div className="flex-1 p-8 max-w-[1180px] w-full mx-auto">
      <div className="flex items-end justify-between mb-[22px] gap-4 flex-wrap">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">Biblioteca de ejercicios</div>
          <div className="text-stone-500 text-sm mt-1">
            Cargá movimientos una vez y reutilizalos en todas las rutinas.
          </div>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="bg-red-600 text-white font-semibold text-sm px-[18px] py-2.75 rounded-lg cursor-pointer whitespace-nowrap border-none"
        >
          + Nuevo ejercicio
        </button>
      </div>

      <div className="flex gap-2.5 mb-5 flex-wrap items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ejercicio por nombre..."
          className="flex-1 min-w-[240px] px-3.5 py-2.75 rounded-lg border border-stone-300 text-sm bg-white"
        />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['Todos', ...MUSCLE_GROUPS].map((g) => {
          const active = groupFilter === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setGroupFilter(g)}
              className="px-3.25 py-1.75 rounded-lg text-[12.5px] font-semibold cursor-pointer border"
              style={{
                borderColor: active ? 'transparent' : 'var(--color-stone-200)',
                background: active ? 'var(--color-red-600)' : '#fff',
                color: active ? '#fff' : 'var(--color-stone-700)',
              }}
            >
              {g} ({groupCounts[g] ?? 0})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-16 text-center text-stone-500 text-sm">Cargando…</div>
      ) : visibleExercises.length === 0 ? (
        <div className="py-16 text-center text-stone-500 text-sm">
          No se encontraron ejercicios con ese filtro.
        </div>
      ) : (
        <div className="grid [content-visibility:auto] gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {visibleExercises.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {formOpen ? (
        <ExerciseFormModal
          exercise={editingExercise}
          onCancel={() => setFormOpen(false)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
