import { useState, type DragEvent } from 'react';
import { supersetHeaderText } from '../../lib/blocks';
import { ROW_COLUMNS_CSS, SET_COUNT_OPTIONS, SET_FIELD_ROWS } from '../../lib/routineModel';
import type { DayPalette } from '../../lib/colors';
import type {
  Exercise,
  ExerciseBlock as BlockType,
  RoutineDay,
  RoutineEntry,
  SetSpec,
} from '../../types';

export type SetField = keyof SetSpec;

interface EntryRowProps {
  entry: RoutineEntry;
  day: RoutineDay;
  exercises: Map<string, Exercise>;
  palette: DayPalette;
  onUpdateNote: (entryId: string, value: string) => void;
  onUpdateSet: (entryId: string, setIndex: number, field: SetField, value: string) => void;
  onSetCount: (entryId: string, count: number) => void;
  onSetSupersetPartner: (entryId: string, partnerValue: string) => void;
  onDelete: (entryId: string) => void;
}

function EntryRow({
  entry,
  day,
  exercises,
  palette,
  onUpdateNote,
  onUpdateSet,
  onSetCount,
  onSetSupersetPartner,
  onDelete,
}: EntryRowProps) {
  const exercise = entry.exerciseId ? exercises.get(entry.exerciseId) : undefined;
  const sets = entry.sets;
  const others = day.entries.filter((e) => e.id !== entry.id);
  const supersetPartner = entry.supersetId
    ? others.find((o) => o.supersetId === entry.supersetId)
    : undefined;

  const columns = Array.from({ length: sets.length }, (_, i) => i);
  const cellBorder = `1px solid ${palette.inner}`;

  return (
    <div
      className="grid rounded-lg overflow-hidden bg-white"
      style={{ gridTemplateColumns: ROW_COLUMNS_CSS, border: `1px solid ${palette.border}` }}
    >
      <div
        className="px-3 py-2.5 flex flex-col gap-1.75"
        style={{ borderRight: `1px solid ${palette.border}` }}
      >
        <div className="font-bold text-[13px] leading-tight">
          {exercise?.name ?? 'Ejercicio eliminado'}
        </div>
        {exercise ? (
          <div
            className="self-start px-2 py-0.5 rounded text-[10.5px] font-bold"
            style={{ background: palette.inner, color: palette.ink }}
          >
            {exercise.group}
          </div>
        ) : null}
        <div className="flex items-center gap-1.5 mt-auto">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
            Series
          </span>
          <select
            value={sets.length}
            onChange={(e) => onSetCount(entry.id, parseInt(e.target.value, 10))}
            className="px-1.5 py-1 rounded-md border border-stone-300 text-xs bg-white"
            aria-label="Cantidad de series"
          >
            {SET_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="grid content-start"
        style={{
          gridTemplateColumns: `repeat(${sets.length + 1}, 1fr)`,
          borderRight: `1px solid ${palette.border}`,
        }}
      >
        <div
          className="px-2 py-1.5 text-[9.5px] font-extrabold uppercase tracking-wider text-stone-500"
          style={{ background: palette.faint, borderBottom: `1px solid ${palette.border}` }}
        >
          Serie
        </div>
        {columns.map((i) => (
          <div
            key={i}
            className="px-1.5 py-1.5 text-center text-[10px] font-extrabold"
            style={{
              background: palette.faint,
              borderBottom: `1px solid ${palette.border}`,
              borderLeft: cellBorder,
              color: palette.ink,
            }}
          >
            S{i + 1}
          </div>
        ))}

        {SET_FIELD_ROWS.map(({ field, label }, rowIndex) => {
          const isLastRow = rowIndex === SET_FIELD_ROWS.length - 1;
          const rowBorderBottom = isLastRow ? undefined : cellBorder;
          return (
            <div key={field} className="contents">
              <div
                className="px-2 py-1.5 text-[10.5px] font-bold text-stone-600 flex items-center"
                style={{ borderBottom: rowBorderBottom }}
              >
                {label}
              </div>
              {columns.map((i) => (
                <input
                  key={i}
                  value={sets[i][field]}
                  onChange={(e) => onUpdateSet(entry.id, i, field, e.target.value)}
                  placeholder="—"
                  aria-label={`${label} serie ${i + 1}`}
                  className="px-1 py-1.5 text-center text-[12.5px] font-semibold w-full min-w-0 outline-none bg-white border-0"
                  style={{ borderLeft: cellBorder, borderBottom: rowBorderBottom }}
                />
              ))}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          {exercise?.videoUrl ? (
            <a
              href={exercise.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold no-underline px-2 py-0.5 rounded"
              style={{ background: palette.inner, color: palette.ink }}
            >
              Ver video
            </a>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            title="Quitar ejercicio"
            className="cursor-pointer text-red-700 font-bold text-xs bg-transparent border-none"
          >
            X
          </button>
        </div>
        <input
          value={entry.note}
          onChange={(e) => onUpdateNote(entry.id, e.target.value)}
          placeholder="Nota adicional"
          className="px-2 py-1.5 rounded-md border border-dashed border-stone-300 text-[11.5px] bg-stone-50 w-full"
        />
        <select
          value={supersetPartner?.id ?? ''}
          onChange={(e) => onSetSupersetPartner(entry.id, e.target.value)}
          className="px-1.75 py-1.25 rounded-md text-[11px] bg-white w-full"
          style={{ border: `1px solid ${palette.border}` }}
          aria-label="Superserie con"
        >
          <option value="">Sin superserie</option>
          {others.map((o) => (
            <option key={o.id} value={o.id}>
              {o.exerciseId ? (exercises.get(o.exerciseId)?.name ?? '...') : '...'}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

interface ExerciseBlockProps {
  block: BlockType;
  blockIndex: number;
  day: RoutineDay;
  exercises: Map<string, Exercise>;
  palette: DayPalette;
  isDragOver: boolean;
  onUpdateNote: (entryId: string, value: string) => void;
  onUpdateSet: (entryId: string, setIndex: number, field: SetField, value: string) => void;
  onSetCount: (entryId: string, count: number) => void;
  onSetSupersetPartner: (entryId: string, partnerValue: string) => void;
  onDelete: (entryId: string) => void;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  onReorderEntries: (supersetId: string, fromIdx: number, toIdx: number) => void;
}

export default function ExerciseBlock({
  block,
  blockIndex,
  day,
  exercises,
  palette,
  isDragOver,
  onUpdateNote,
  onUpdateSet,
  onSetCount,
  onSetSupersetPartner,
  onDelete,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
  onReorderEntries,
}: ExerciseBlockProps) {
  const [draggingRow, setDraggingRow] = useState<number | null>(null);
  const [dragOverRow, setDragOverRow] = useState<number | null>(null);
  const dragProps = {
    draggable: true,
    onDragStart: () => onDragStart(blockIndex),
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDragEnter: () => {
      if (draggingRow !== null) return;
      onDragEnter(blockIndex);
    },
    onDrop: () => {
      if (draggingRow !== null) return;
      onDrop(blockIndex);
    },
    onDragEnd: () => onDragEnd(),
  };
  const dragOverOutline = isDragOver
    ? 'outline-2 outline-dashed outline-red-600 outline-offset-[3px]'
    : '';

  const rowProps = {
    day,
    exercises,
    palette,
    onUpdateNote,
    onUpdateSet,
    onSetCount,
    onSetSupersetPartner,
    onDelete,
  };

  if (block.type === 'superset') {
    return (
      <div
        {...dragProps}
        className={`rounded-xl p-3 flex flex-col gap-2 ${dragOverOutline}`}
        style={{ border: `1.5px solid ${palette.border}`, background: palette.wash }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="cursor-grab text-sm text-stone-500 tracking-[-1px] select-none shrink-0"
            title="Arrastrar para reordenar"
          >
            ⠿⠿
          </div>
          <div
            className="text-[11.5px] font-extrabold uppercase tracking-wide"
            style={{ color: palette.ink }}
          >
            {supersetHeaderText(block.letter)}
          </div>
        </div>
        {block.entries.map((entry, i) => (
          <div
            key={entry.id}
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
                onReorderEntries(block.supersetId, draggingRow, i);
              }
              setDraggingRow(null);
              setDragOverRow(null);
              onDragEnd();
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              setDraggingRow(null);
              setDragOverRow(null);
              onDragEnd();
            }}
          >
            <div
              className="cursor-grab text-xs text-stone-400 tracking-[-1px] select-none shrink-0"
              title="Arrastrar para reordenar dentro de la superserie"
            >
              ⠿
            </div>
            <div className="flex-1 min-w-0">
              <EntryRow entry={entry} {...rowProps} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div {...dragProps} className={`flex items-center gap-2 ${dragOverOutline}`}>
      <div
        className="cursor-grab text-sm text-stone-400 tracking-[-1px] select-none shrink-0 px-0.5"
        title="Arrastrar para reordenar"
      >
        ⠿⠿
      </div>
      <div className="flex-1 min-w-0">
        <EntryRow entry={block.entries[0]} {...rowProps} />
      </div>
    </div>
  );
}
