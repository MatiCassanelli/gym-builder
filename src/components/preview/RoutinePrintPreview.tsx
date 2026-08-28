import { useMemo } from 'react';
import { computeBlocks, supersetHeaderText } from '../../lib/blocks';
import { ACCENT, NEUTRAL, WARMUP_PALETTE, dayPalette } from '../../lib/colors';
import type { DayPalette } from '../../lib/colors';
import { ROW_COLUMNS_CSS, SET_FIELD_ROWS, buildWarmupPhases } from '../../lib/routineModel';
import { formatDateEs, todayIso } from '../../lib/format';
import {
  PLAN_FOOTER_NOTE,
  PLAN_GUIDE_ITEMS,
  PLAN_GUIDE_SUBTITLE,
  PLAN_GUIDE_TITLE,
  RIR_EXAMPLES,
  RIR_HOWTO_ITEMS,
  RIR_HOWTO_TITLE,
  RIR_INTRO,
  RIR_SCALE_NOTE,
  RIR_TITLE,
  WARMUP_SUBTITLE,
  WARMUP_TITLE,
} from '../../lib/planGuide';
import type { Branding } from '../../lib/branding';
import type { Exercise, RoutineInput, SetSpec } from '../../types';

interface RoutinePrintPreviewProps {
  routine: RoutineInput;
  exercisesMap: Map<string, Exercise>;
  authorName?: string;
  /** Logo and name of the gym this routine belongs to — printed on the plan's header. */
  gym: Branding;
}

interface PreviewRow {
  id: string;
  name: string;
  group?: string;
  sets: SetSpec[];
  videoUrl?: string;
  note: string;
}

function ExerciseRow({
  row,
  palette,
  background,
}: {
  row: PreviewRow;
  palette: DayPalette;
  background: string;
}) {
  const cellBorder = `1px solid ${palette.border}`;
  const columns = Array.from({ length: row.sets.length }, (_, i) => i);

  return (
    <div className="grid" style={{ gridTemplateColumns: ROW_COLUMNS_CSS, background }}>
      <div className="px-2.5 py-2" style={{ borderRight: cellBorder }}>
        <div className="text-xs font-bold leading-tight">{row.name}</div>
        {row.group ? (
          <div
            className="inline-block mt-0.75 px-1.75 py-px rounded text-[9.5px] font-bold"
            style={{ background: palette.inner, color: palette.ink }}
          >
            {row.group}
          </div>
        ) : null}
      </div>

      <div
        className="grid content-start"
        style={{ gridTemplateColumns: `repeat(${row.sets.length + 1}, 1fr)`, borderRight: cellBorder }}
      >
        <div
          className="px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-stone-500"
          style={{ background: palette.faint, borderBottom: cellBorder }}
        >
          Serie
        </div>
        {columns.map((i) => (
          <div
            key={i}
            className="px-1 py-1 text-center text-[9.5px] font-extrabold"
            style={{
              background: palette.faint,
              borderBottom: cellBorder,
              borderLeft: cellBorder,
              color: palette.ink,
            }}
          >
            S{i + 1}
          </div>
        ))}
        {SET_FIELD_ROWS.map(({ field, label }, rowIndex) => {
          const borderBottom = rowIndex === SET_FIELD_ROWS.length - 1 ? undefined : cellBorder;
          return (
            <div key={field} className="contents">
              <div
                className="px-2 py-1 text-[9.5px] font-bold text-stone-600"
                style={{ borderBottom }}
              >
                {label}
              </div>
              {columns.map((i) => (
                <div
                  key={i}
                  className="px-1 py-1 text-center text-[11.5px] font-semibold"
                  style={{ borderLeft: cellBorder, borderBottom }}
                >
                  {row.sets[i][field] || '—'}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="px-2.5 py-2 flex flex-col gap-1">
        {row.videoUrl ? (
          <a
            href={row.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10.5px] font-bold no-underline px-2 py-0.5 rounded self-start"
            style={{ background: palette.inner, color: palette.ink }}
          >
            Ver video
          </a>
        ) : null}
        {row.note ? (
          <div className="text-[10.5px] text-stone-600 italic leading-snug">{row.note}</div>
        ) : null}
      </div>
    </div>
  );
}

// Pure presentational: renders the printable #print-area card for whatever routine-shaped
// data it's given — an in-memory draft being edited, or (in principle) a saved Routine.
export default function RoutinePrintPreview({
  routine,
  exercisesMap,
  authorName,
  gym,
}: RoutinePrintPreviewProps) {
  const previewDays = useMemo(() => {
    return routine.days.map((day) => ({
      number: day.id,
      note: day.note,
      palette: dayPalette(day.id),
      blocks: computeBlocks(day).map((block) => ({
        isSuperset: block.type === 'superset',
        letter: block.type === 'superset' ? block.letter : undefined,
        rows: block.entries.map((e): PreviewRow => {
          const ex = e.exerciseId ? exercisesMap.get(e.exerciseId) : undefined;
          return {
            id: e.id,
            name: ex?.name ?? '—',
            group: ex?.group,
            sets: e.sets,
            videoUrl: ex?.videoUrl,
            note: e.note,
          };
        }),
      })),
    }));
  }, [routine.days, exercisesMap]);

  const warmupPhases = useMemo(
    () => buildWarmupPhases(routine.warmup, exercisesMap),
    [routine.warmup, exercisesMap],
  );

  return (
    <div
      id="print-area"
      className="w-[800px] max-w-full bg-white p-12"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
    >
      <div className="flex justify-between items-start border-b-2 border-stone-900 pb-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          {gym.logo ? (
            <img src={gym.logo} alt={gym.nombre} className="h-16 w-16 object-contain" />
          ) : null}
          <div className="font-extrabold text-lg tracking-tight truncate">{gym.nombre}</div>
        </div>
        <div className="text-right text-xs text-stone-500">
          <div>Emitido: {formatDateEs(todayIso())}</div>
          {authorName ? (
            <div className="mt-0.5">
              Profesor: <span className="font-semibold text-stone-700">{authorName}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3.5 mb-[26px] text-[12.5px]">
        <div>
          <div className="text-stone-500 font-semibold">ALUMNO</div>
          <div className="font-bold text-sm mt-0.5">{routine.student || '—'}</div>
        </div>
        <div>
          <div className="text-stone-500 font-semibold">INICIO DEL PLAN</div>
          <div className="font-bold text-sm mt-0.5">{formatDateEs(routine.startDate)}</div>
        </div>
        <div>
          <div className="text-stone-500 font-semibold">FIN DEL PLAN</div>
          <div className="font-bold text-sm mt-0.5">{formatDateEs(routine.endDate)}</div>
        </div>
        <div>
          <div className="text-stone-500 font-semibold">FRECUENCIA</div>
          <div className="font-bold text-sm mt-0.5">{routine.periodicity}x por semana</div>
        </div>
      </div>

      {routine.objective ? (
        <div className="text-[12.5px] mb-5">
          <span className="text-stone-500 font-semibold">OBJETIVO: </span>
          <span className="font-semibold">{routine.objective}</span>
        </div>
      ) : null}

      <div className="border-t border-stone-200 pt-5">
        <div className="text-base font-extrabold tracking-tight mb-0.75">{PLAN_GUIDE_TITLE}</div>
        <div className="text-[11.5px] text-stone-500 mb-4">{PLAN_GUIDE_SUBTITLE}</div>

        <div className="grid grid-cols-2 gap-x-4.5 gap-y-2.5 mb-5">
          {PLAN_GUIDE_ITEMS.map((item) => (
            <div
              key={item.title}
              className="pl-2.5 py-0.5"
              style={{ borderLeft: `3px solid ${ACCENT.base}` }}
            >
              <div className="text-xs font-extrabold">{item.title}</div>
              <div className="text-[11px] leading-snug text-stone-700">{item.body}</div>
            </div>
          ))}
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-[10px] px-4.5 py-4 mb-5">
          <div className="text-[13.5px] font-extrabold mb-2">{RIR_TITLE}</div>
          <div className="text-[11px] leading-relaxed text-stone-700">{RIR_INTRO}</div>
          <div className="flex gap-2.5 my-2.5 flex-wrap">
            {RIR_EXAMPLES.map((example) => (
              <div
                key={example}
                className="flex-1 min-w-[180px] bg-white border border-stone-200 rounded-[7px] px-2.75 py-2 text-[11px] leading-snug"
              >
                {example}
              </div>
            ))}
          </div>
          <div className="text-[11px] leading-relaxed text-stone-700">{RIR_SCALE_NOTE}</div>
          <div className="text-xs font-extrabold mt-3.5 mb-1.5">{RIR_HOWTO_TITLE}</div>
          <div className="flex flex-col gap-1.75 text-[11px] leading-relaxed text-stone-700">
            {RIR_HOWTO_ITEMS.map((item) => (
              <div key={item.title}>
                <strong>{item.title}</strong> {item.body}
              </div>
            ))}
          </div>
        </div>

        <div className="text-[13.5px] font-extrabold mb-0.75">{WARMUP_TITLE}</div>
        <div className="text-[11px] text-stone-500 mb-3">{WARMUP_SUBTITLE}</div>

        <div className="flex flex-col gap-2.25">
          {warmupPhases.map((phase) => (
            <div
              key={phase.key}
              className="rounded-lg overflow-hidden"
              style={{ border: `1px solid ${WARMUP_PALETTE.border}` }}
            >
              <div
                className="px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-wider"
                style={{ background: WARMUP_PALETTE.base, color: WARMUP_PALETTE.ink }}
              >
                {phase.header}
              </div>
              <div className="px-3 py-2.5 grid grid-cols-2 gap-x-4.5 gap-y-1.5 text-[11px] leading-snug">
                {phase.items.map((item) => (
                  <div key={item.id}>
                    <strong>{item.name}</strong>
                    {item.dose ? ` — ${item.dose}` : ''}
                    {item.videoUrl ? (
                      <a
                        href={item.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1 text-[10.5px] font-bold no-underline px-1.75 py-px rounded whitespace-nowrap"
                        style={{ background: WARMUP_PALETTE.inner, color: WARMUP_PALETTE.ink }}
                      >
                        Ver video
                      </a>
                    ) : null}
                    {item.note ? (
                      <span className="text-stone-500 italic"> · {item.note}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {routine.warmup.note ? (
            <div className="border border-stone-200 rounded-lg px-3 py-2.5 text-[11px] leading-relaxed">
              {routine.warmup.note}
            </div>
          ) : null}
        </div>
      </div>

      <div className="my-6 border-t border-dashed border-stone-300 break-after-page" />

      <div className="text-base font-extrabold tracking-tight mb-3.5">
        Plan de entrenamiento — {routine.student || '—'}
      </div>

      {previewDays.map((day) => (
        <div key={day.number} className="mb-5 break-inside-avoid">
          <div
            className="text-sm font-extrabold px-3 py-2 rounded-t-[5px] tracking-wide"
            style={{ background: day.palette.base, color: day.palette.ink }}
          >
            DÍA {day.number}
          </div>
          <div
            className="border-t-0 rounded-b-[5px] p-3 flex flex-col gap-2.25"
            style={{ border: `1px solid ${day.palette.border}`, borderTop: 'none' }}
          >
            {day.note ? (
              <div
                className="rounded-lg px-3 py-2 text-[11px] leading-relaxed text-stone-700 italic"
                style={{ border: `1px solid ${day.palette.border}` }}
              >
                {day.note}
              </div>
            ) : null}
            {day.blocks.map((block) =>
              block.isSuperset ? (
                <div
                  key={block.rows[0].id}
                  className="rounded-[9px] overflow-hidden break-inside-avoid"
                  style={{
                    border: `1.5px solid ${day.palette.border}`,
                    background: day.palette.wash,
                  }}
                >
                  <div
                    className="px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-wider"
                    style={{ background: day.palette.border, color: day.palette.ink }}
                  >
                    {supersetHeaderText(block.letter ?? '?')}
                  </div>
                  {block.rows.map((row, i) => (
                    <div key={row.id}>
                      {i > 0 ? (
                        <div
                          className="flex items-center gap-2 px-3 py-0.75"
                          style={{ background: day.palette.wash }}
                        >
                          <div className="flex-1 h-px" style={{ background: day.palette.inner }} />
                          <div
                            className="text-xs font-extrabold"
                            style={{ color: day.palette.ink }}
                          >
                            +
                          </div>
                          <div className="flex-1 h-px" style={{ background: day.palette.inner }} />
                        </div>
                      ) : null}
                      <div style={{ borderTop: `1px solid ${day.palette.border}` }}>
                        <ExerciseRow
                          row={row}
                          palette={day.palette}
                          background={day.palette.wash}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  key={block.rows[0].id}
                  className="rounded-md overflow-hidden break-inside-avoid"
                  style={{ border: `1px solid ${day.palette.border}` }}
                >
                  <ExerciseRow
                    row={block.rows[0]}
                    palette={day.palette}
                    background={NEUTRAL.white}
                  />
                </div>
              ),
            )}
          </div>
        </div>
      ))}

      <div className="text-[10.5px] text-stone-500 mt-2.5 border-t border-stone-200 pt-2.5">
        {PLAN_FOOTER_NOTE}
      </div>
    </div>
  );
}
