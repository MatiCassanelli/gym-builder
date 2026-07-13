import { chipBg, chipText } from '../../lib/muscleGroups';
import type { Exercise } from '../../types';

interface ExerciseCardProps {
  exercise: Exercise;
  onEdit: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
}

export default function ExerciseCard({ exercise, onEdit, onDelete }: ExerciseCardProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-[13px] overflow-hidden flex flex-col">
      <a
        href={exercise.videoUrl}
        target="_blank"
        rel="noreferrer"
        className="block h-[110px] bg-stone-950 relative no-underline"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-0 h-0 border-y-[9px] border-y-transparent border-l-[15px] border-l-white ml-1" />
        </div>
        <div className="absolute bottom-1.5 right-2 font-mono text-[10px] font-semibold text-white/60 tracking-wide">
          VIDEO YOUTUBE
        </div>
      </a>
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <div className="font-bold text-[14.5px] leading-tight">{exercise.name}</div>
        <div
          className="self-start px-2.5 py-0.5 rounded-md text-[11px] font-semibold"
          style={{ background: chipBg(exercise.group), color: chipText(exercise.group) }}
        >
          {exercise.group}
        </div>
        <div className="flex gap-2 mt-auto pt-1.5">
          <button
            type="button"
            onClick={() => onEdit(exercise)}
            className="text-[12.5px] font-semibold text-stone-700 cursor-pointer bg-transparent border-none p-0"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => onDelete(exercise)}
            className="text-[12.5px] font-semibold text-red-700 cursor-pointer bg-transparent border-none p-0"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
