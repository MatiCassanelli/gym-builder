import type { DragEvent } from 'react';
import { supersetVisual } from '../../lib/blocks';
import type { Exercise, ExerciseBlock as BlockType, RoutineDay, RoutineEntry } from '../../types';

interface EntryRowProps {
  entry: RoutineEntry;
  day: RoutineDay;
  exercises: Map<string, Exercise>;
  onUpdateField: (entryId: string, field: 'series' | 'reps' | 'note', value: string) => void;
  onSetSupersetPartner: (entryId: string, partnerValue: string) => void;
  onDelete: (entryId: string) => void;
  rowClass: string;
}

function EntryRow({
  entry,
  day,
  exercises,
  onUpdateField,
  onSetSupersetPartner,
  onDelete,
  rowClass,
}: EntryRowProps) {
  const exerciseName = entry.exerciseId
    ? (exercises.get(entry.exerciseId)?.name ?? 'Ejercicio eliminado')
    : 'Ejercicio eliminado';
  const others = day.entries.filter((e) => e.id !== entry.id);
  const supersetPartner = entry.supersetId
    ? others.find((o) => o.supersetId === entry.supersetId)
    : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`grid gap-2.5 items-center ${rowClass}`}
        style={{ gridTemplateColumns: '1.8fr 0.7fr 0.9fr 1.4fr 0.3fr' }}
      >
        <div className="font-semibold text-[13.5px]">{exerciseName}</div>
        <input
          value={entry.series}
          onChange={(e) => onUpdateField(entry.id, 'series', e.target.value)}
          placeholder="Series"
          className="px-2.25 py-2 rounded-md border border-stone-300 text-[13px] w-full"
        />
        <input
          value={entry.reps}
          onChange={(e) => onUpdateField(entry.id, 'reps', e.target.value)}
          placeholder="Reps"
          className="px-2.25 py-2 rounded-md border border-stone-300 text-[13px] w-full"
        />
        <select
          value={supersetPartner?.id ?? ''}
          onChange={(e) => onSetSupersetPartner(entry.id, e.target.value)}
          className="px-2.25 py-2 rounded-md border border-stone-300 text-[12.5px] bg-white"
        >
          <option value="">Sin superserie</option>
          {others.map((o) => (
            <option key={o.id} value={o.id}>
              {o.exerciseId ? (exercises.get(o.exerciseId)?.name ?? '...') : '...'}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="text-center text-red-700 cursor-pointer font-bold bg-transparent border-none"
        >
          ✕
        </button>
      </div>
      <input
        value={entry.note}
        onChange={(e) => onUpdateField(entry.id, 'note', e.target.value)}
        placeholder="Nota para el alumno (opcional)"
        className="px-2.25 py-1.5 rounded-md border border-dashed border-stone-300 text-xs bg-stone-50 text-stone-700"
      />
    </div>
  );
}

interface ExerciseBlockProps {
  block: BlockType;
  blockIndex: number;
  day: RoutineDay;
  exercises: Map<string, Exercise>;
  isDragOver: boolean;
  onUpdateField: (entryId: string, field: 'series' | 'reps' | 'note', value: string) => void;
  onSetSupersetPartner: (entryId: string, partnerValue: string) => void;
  onDelete: (entryId: string) => void;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
}

export default function ExerciseBlock({
  block,
  blockIndex,
  day,
  exercises,
  isDragOver,
  onUpdateField,
  onSetSupersetPartner,
  onDelete,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
}: ExerciseBlockProps) {
  const dragProps = {
    draggable: true,
    onDragStart: () => onDragStart(blockIndex),
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDragEnter: () => onDragEnter(blockIndex),
    onDrop: () => onDrop(blockIndex),
    onDragEnd: () => onDragEnd(),
  };
  const dragHandle = (
    <div
      className="cursor-grab text-sm text-stone-400 tracking-[-1px] select-none shrink-0 px-0.5"
      title="Arrastrar para reordenar"
    >
      ⠿⠿
    </div>
  );

  if (block.type === 'superset') {
    const visual = supersetVisual(block.letter);
    return (
      <div
        {...dragProps}
        className={`${visual.containerClass} ${isDragOver ? 'outline-2 outline-dashed outline-red-600 outline-offset-[3px]' : ''}`}
      >
        <div className="flex items-center gap-1.5">
          {dragHandle}
          <div className={visual.headerClass}>{visual.headerLabel}</div>
        </div>
        {block.entries.map((entry, i) => (
          <div key={entry.id} className="flex flex-col">
            {i > 0 ? (
              <div className="flex items-center gap-2 px-3.5 bg-red-50 my-1">
                <div className="flex-1 h-px bg-red-200" />
                <div className="text-[16px] font-extrabold text-red-600 shrink-0">
                  {visual.connectorLabel}
                </div>
                <div className="flex-1 h-px bg-red-200" />
              </div>
            ) : null}
            <EntryRow
              entry={entry}
              day={day}
              exercises={exercises}
              onUpdateField={onUpdateField}
              onSetSupersetPartner={onSetSupersetPartner}
              onDelete={onDelete}
              rowClass={visual.rowClass}
            />
          </div>
        ))}
      </div>
    );
  }

  const entry = block.entries[0];
  return (
    <div
      {...dragProps}
      className={`flex items-center gap-2 ${isDragOver ? 'outline-2 outline-dashed outline-red-600 outline-offset-2' : ''}`}
    >
      {dragHandle}
      <div className="flex-1">
        <EntryRow
          entry={entry}
          day={day}
          exercises={exercises}
          onUpdateField={onUpdateField}
          onSetSupersetPartner={onSetSupersetPartner}
          onDelete={onDelete}
          rowClass="bg-white rounded-lg p-3 border border-stone-200"
        />
      </div>
    </div>
  );
}
