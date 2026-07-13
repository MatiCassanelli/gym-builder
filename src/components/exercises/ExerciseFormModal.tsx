import { useState, type FormEvent } from 'react';
import { MUSCLE_GROUPS, type MuscleGroup } from '../../types';
import type { Exercise, ExerciseInput } from '../../types';

interface ExerciseFormModalProps {
  exercise: Exercise | null;
  onCancel: () => void;
  onSave: (input: ExerciseInput) => void;
}

export default function ExerciseFormModal({ exercise, onCancel, onSave }: ExerciseFormModalProps) {
  const [name, setName] = useState(exercise?.name ?? '');
  const [group, setGroup] = useState<MuscleGroup>(exercise?.group ?? 'Cuadriceps');
  const [videoUrl, setVideoUrl] = useState(exercise?.videoUrl ?? '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      name: trimmed,
      group,
      videoUrl:
        videoUrl.trim() || `https://youtube.com/results?search_query=${encodeURIComponent(trimmed)}`,
    });
  }

  return (
    <div
      className="fixed inset-0 bg-[rgba(20,15,10,0.45)] flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-[420px] max-w-[92vw] p-[26px] flex flex-col gap-3.5"
      >
        <div className="text-[17px] font-extrabold">
          {exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-stone-500">
            Nombre del ejercicio
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Sentadilla libre"
            className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-stone-500">
            Grupo muscular
          </label>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value as MuscleGroup)}
            className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm bg-white"
          >
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-stone-500">
            Link de YouTube
          </label>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtu.be/..."
            className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
          />
        </div>

        <div className="flex gap-2.5 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 text-center py-2.75 rounded-lg border border-stone-300 font-semibold text-sm cursor-pointer bg-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 text-center py-2.75 rounded-lg bg-red-600 text-white font-semibold text-sm cursor-pointer border-none"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
