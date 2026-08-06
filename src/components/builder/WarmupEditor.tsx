import { useState } from 'react';
import { WARMUP_PHASES } from '../../types';
import { WARMUP_PALETTE, chipBg, chipText } from '../../lib/colors';
import type { Exercise, RoutineWarmup, WarmupPhaseKey } from '../../types';

interface WarmupEditorProps {
  warmup: RoutineWarmup;
  exercises: Map<string, Exercise>;
  onLabelChange: (phase: WarmupPhaseKey, value: string) => void;
  onNoteChange: (value: string) => void;
  onItemFieldChange: (
    phase: WarmupPhaseKey,
    itemId: string,
    field: 'dose' | 'note',
    value: string,
  ) => void;
  onReorderItem: (phase: WarmupPhaseKey, fromIdx: number, toIdx: number) => void;
  onRemoveItem: (phase: WarmupPhaseKey, itemId: string) => void;
  onAddToPhase: (phase: WarmupPhaseKey) => void;
}

interface WarmupPhaseCardProps {
  phase: (typeof WARMUP_PHASES)[number];
  phaseIndex: number;
  warmup: RoutineWarmup;
  exercises: Map<string, Exercise>;
  onLabelChange: (phase: WarmupPhaseKey, value: string) => void;
  onItemFieldChange: (
    phase: WarmupPhaseKey,
    itemId: string,
    field: 'dose' | 'note',
    value: string,
  ) => void;
  onReorderItem: (phase: WarmupPhaseKey, fromIdx: number, toIdx: number) => void;
  onRemoveItem: (phase: WarmupPhaseKey, itemId: string) => void;
  onAddToPhase: (phase: WarmupPhaseKey) => void;
}

function WarmupPhaseCard({
  phase,
  phaseIndex,
  warmup,
  exercises,
  onLabelChange,
  onItemFieldChange,
  onReorderItem,
  onRemoveItem,
  onAddToPhase,
}: WarmupPhaseCardProps) {
  const [draggingRow, setDraggingRow] = useState<number | null>(null);
  const [dragOverRow, setDragOverRow] = useState<number | null>(null);
  const items = warmup.items[phase.key];

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <div className="flex items-center gap-2.5 flex-wrap mb-3">
        <div className="w-6 h-6 rounded-full bg-red-600 text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
          {phaseIndex + 1}
        </div>
        <div className="text-[14.5px] font-extrabold">{phase.title}</div>
        <input
          value={warmup.labels[phase.key]}
          onChange={(e) => onLabelChange(phase.key, e.target.value)}
          placeholder="Duración / indicación (ej: 4 min · 2 rondas)"
          className="flex-1 min-w-[220px] px-2.5 py-1.75 rounded-md border border-dashed border-stone-300 text-[12.5px] bg-stone-50"
        />
      </div>

      {items.length === 0 ? (
        <div className="p-4.5 text-center text-stone-500 text-[12.5px] border-[1.5px] border-dashed border-stone-200 rounded-lg">
          Sin ejercicios en este bloque.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => {
            const exercise = item.exerciseId ? exercises.get(item.exerciseId) : undefined;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-1.5 ${dragOverRow === i && draggingRow !== i ? 'outline-2 outline-dashed outline-red-400 outline-offset-2 rounded-lg' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDraggingRow(i);
                }}
                onDragOver={(e) => {
                  if (draggingRow === null) return;
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragEnter={(e) => {
                  if (draggingRow === null) return;
                  e.stopPropagation();
                  setDragOverRow(i);
                }}
                onDrop={(e) => {
                  if (draggingRow === null) return;
                  e.stopPropagation();
                  if (draggingRow !== i) {
                    onReorderItem(phase.key, draggingRow, i);
                  }
                  setDraggingRow(null);
                  setDragOverRow(null);
                }}
                onDragEnd={(e) => {
                  e.stopPropagation();
                  setDraggingRow(null);
                  setDragOverRow(null);
                }}
              >
                <div
                  className="cursor-grab text-sm text-stone-400 tracking-[-1px] select-none shrink-0"
                  title="Arrastrar para reordenar"
                >
                  ⠿⠿
                </div>
                <div
                  className="flex-1 min-w-0 grid gap-2.5 items-center border border-stone-200 rounded-lg px-2.75 py-2.25"
                  style={{ gridTemplateColumns: '1fr 180px 210px auto' }}
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="font-bold text-[13px] leading-tight">
                      {exercise?.name ?? 'Ejercicio eliminado'}
                    </div>
                    {exercise ? (
                      <div
                        className="self-start px-2 py-0.5 rounded text-[10.5px] font-bold"
                        style={{
                          background: chipBg(exercise.group),
                          color: chipText(exercise.group),
                        }}
                      >
                        {exercise.group}
                      </div>
                    ) : null}
                  </div>
                  <input
                    value={item.dose}
                    onChange={(e) => onItemFieldChange(phase.key, item.id, 'dose', e.target.value)}
                    placeholder="Ej: 8 repeticiones"
                    className="px-2.25 py-1.75 rounded-md border border-stone-300 text-[12.5px] w-full"
                  />
                  <input
                    value={item.note}
                    onChange={(e) => onItemFieldChange(phase.key, item.id, 'note', e.target.value)}
                    placeholder="Nota (opcional)"
                    className="px-2.25 py-1.75 rounded-md border border-dashed border-stone-300 text-xs bg-stone-50 w-full"
                  />
                  <div className="flex items-center gap-2.25">
                    {exercise?.videoUrl ? (
                      <a
                        href={exercise.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold no-underline px-2 py-0.5 rounded whitespace-nowrap"
                        style={{ background: WARMUP_PALETTE.inner, color: WARMUP_PALETTE.ink }}
                      >
                        Ver video
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onRemoveItem(phase.key, item.id)}
                      title="Quitar"
                      className="cursor-pointer text-xs font-bold text-red-700 bg-transparent border-none"
                    >
                      X
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => onAddToPhase(phase.key)}
        className="mt-2.5 px-3.75 py-2.25 rounded-lg border-[1.5px] border-dashed border-red-600 text-red-700 font-bold text-[12.5px] cursor-pointer bg-transparent"
      >
        + Agregar a {phase.title}
      </button>
    </div>
  );
}

export default function WarmupEditor({
  warmup,
  exercises,
  onLabelChange,
  onNoteChange,
  onItemFieldChange,
  onReorderItem,
  onRemoveItem,
  onAddToPhase,
}: WarmupEditorProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[13px] text-stone-500">
        Este bloque se imprime en la primera hoja del PDF, antes de los días de entrenamiento.
        Es propio de esta rutina: podés ajustarlo para cada alumno.
      </div>

      {WARMUP_PHASES.map((phase, phaseIndex) => (
        <WarmupPhaseCard
          key={phase.key}
          phase={phase}
          phaseIndex={phaseIndex}
          warmup={warmup}
          exercises={exercises}
          onLabelChange={onLabelChange}
          onItemFieldChange={onItemFieldChange}
          onReorderItem={onReorderItem}
          onRemoveItem={onRemoveItem}
          onAddToPhase={onAddToPhase}
        />
      ))}

      <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-1.75">
        <label className="text-[12.5px] font-semibold text-stone-500">
          Indicación general (se imprime al pie del bloque en el PDF)
        </label>
        <textarea
          value={warmup.note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={4}
          placeholder="Ej: series de aproximación antes de cada ejercicio principal..."
          className="px-3 py-2.5 rounded-lg border border-stone-300 text-[13px] leading-relaxed resize-y font-sans"
        />
      </div>
    </div>
  );
}
