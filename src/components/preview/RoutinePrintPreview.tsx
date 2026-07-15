import { useMemo } from 'react';
import { computeBlocks, supersetHeaderText } from '../../lib/blocks';
import { accentBar, chipBg, chipText } from '../../lib/muscleGroups';
import { formatDateEs, todayIso } from '../../lib/format';
import type { Exercise, RoutineInput } from '../../types';

interface RoutinePrintPreviewProps {
  routine: RoutineInput;
  exercisesMap: Map<string, Exercise>;
  authorName?: string;
}

// Pure presentational: renders the printable #print-area card for whatever routine-shaped
// data it's given — an in-memory draft being edited, or (in principle) a saved Routine.
export default function RoutinePrintPreview({
  routine,
  exercisesMap,
  authorName,
}: RoutinePrintPreviewProps) {
  const previewDays = useMemo(() => {
    return routine.days.map((day) => {
      const blocks = computeBlocks(day);
      return {
        number: day.id,
        blocks: blocks.map((block) => ({
          isSuperset: block.type === 'superset',
          letter: block.type === 'superset' ? block.letter : undefined,
          rows: block.entries.map((e) => {
            const ex = e.exerciseId ? exercisesMap.get(e.exerciseId) : undefined;
            return {
              id: e.id,
              name: ex?.name ?? '—',
              group: ex?.group,
              series: e.series,
              reps: e.reps,
              accentBar: ex ? accentBar(ex.group) : 'var(--color-stone-300)',
              chipBg: ex ? chipBg(ex.group) : 'var(--color-stone-200)',
              chipText: ex ? chipText(ex.group) : 'var(--color-stone-700)',
              videoUrl: ex?.videoUrl,
              note: e.note,
            };
          }),
        })),
      };
    });
  }, [routine.days, exercisesMap]);

  return (
    <div
      id="print-area"
      className="w-[800px] max-w-full bg-white p-12"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
    >
      <div className="flex justify-between items-start border-b-2 border-stone-900 pb-4 mb-5">
        <img src="/forge-logo.png" alt="Forge Gym & Box" className="h-16 w-16 object-contain" />
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

      {previewDays.map((day) => (
        <div key={day.number} className="mb-5 break-inside-avoid">
          <div className="text-sm font-extrabold bg-stone-950 text-white px-3 py-2 rounded-t-[5px]">
            DÍA {day.number}
          </div>
          <div className="border border-stone-300 border-t-0 rounded-b-[5px] p-3 flex flex-col gap-2.5">
            {day.blocks.map((block) =>
              block.isSuperset ? (
                <div
                  key={block.rows[0].id}
                  className="border-[1.5px] border-red-600 rounded-lg overflow-hidden break-inside-avoid"
                >
                  <div className="bg-red-700 text-white text-[11.5px] font-extrabold tracking-wide uppercase px-3 py-2">
                    🔗 {supersetHeaderText(block.letter ?? '?')}
                  </div>
                  {block.rows.map((row, i) => (
                    <div key={row.id}>
                      {i > 0 ? (
                        <div className="flex items-center gap-2 px-3 bg-red-50">
                          <div className="flex-1 h-px bg-red-200" />
                          <div className="text-[13px] font-extrabold text-red-600">
                            +
                          </div>
                          <div className="flex-1 h-px bg-red-200" />
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2.5 px-3 py-2.25 bg-red-50">
                        <div
                          className="w-[5px] self-stretch rounded-sm"
                          style={{ background: row.accentBar }}
                        />
                        <div className="flex-1">
                          <div className="text-[12.5px] font-bold">
                            {row.name}
                            {row.videoUrl ? (
                              <a
                                href={row.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-1.5 text-[10.5px] font-bold text-red-600 no-underline border-b border-red-600"
                              >
                                ▶ Video
                              </a>
                            ) : null}
                          </div>
                          {row.group ? (
                            <div
                              className="inline-block mt-1 px-1.75 py-px rounded text-[10px] font-bold"
                              style={{ background: row.chipBg, color: row.chipText }}
                            >
                              {row.group}
                            </div>
                          ) : null}
                          {row.note ? (
                            <div className="text-[11px] text-stone-600 italic mt-0.5">
                              📝 {row.note}
                            </div>
                          ) : null}
                        </div>
                        <div className="font-bold text-[12.5px]">
                          {row.series} x {row.reps}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  key={block.rows[0].id}
                  className="flex items-center gap-2.5 px-2.5 py-2.25 border-b border-stone-200 break-inside-avoid"
                >
                  <div
                    className="w-[5px] self-stretch rounded-sm"
                    style={{ background: block.rows[0].accentBar }}
                  />
                  <div className="flex-1">
                    <div className="text-[12.5px] font-bold">
                      {block.rows[0].name}
                      {block.rows[0].videoUrl ? (
                        <a
                          href={block.rows[0].videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-1.5 text-[10.5px] font-bold text-red-600 no-underline border-b border-red-600"
                        >
                          ▶ Video
                        </a>
                      ) : null}
                    </div>
                    {block.rows[0].group ? (
                      <div
                        className="inline-block mt-1 px-1.75 py-px rounded text-[10px] font-bold"
                        style={{ background: block.rows[0].chipBg, color: block.rows[0].chipText }}
                      >
                        {block.rows[0].group}
                      </div>
                    ) : null}
                    {block.rows[0].note ? (
                      <div className="text-[11px] text-stone-600 italic mt-0.5">
                        📝 {block.rows[0].note}
                      </div>
                    ) : null}
                  </div>
                  <div className="font-bold text-[12.5px]">
                    {block.rows[0].series} x {block.rows[0].reps}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      ))}

      <div className="text-[10.5px] text-stone-500 mt-2.5 border-t border-stone-200 pt-2.5">
        El color indica el grupo muscular de cada ejercicio. Los ejercicios agrupados bajo
        "Superserie" se realizan uno tras otro, sin pausa entre ellos.
      </div>
    </div>
  );
}
