import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../layout/Breadcrumb';
import DayTabs from './DayTabs';
import ExerciseBlock from './ExerciseBlock';
import ExercisePickerModal from './ExercisePickerModal';
import RoutinePrintPreview from '../preview/RoutinePrintPreview';
import { cleanSupersets, computeBlocks, reorderBlocks, reorderWithinSuperset } from '../../lib/blocks';
import { newId } from '../../lib/ids';
import { createRoutine, updateRoutine } from '../../services/routinesService';
import type { Exercise, Profesor, Routine, RoutineDay, RoutineInput, UserRef } from '../../types';

interface BuilderPageProps {
  routines: Routine[];
  exercises: Exercise[];
  profesores: Profesor[];
  currentUser: UserRef;
}

type Mode = 'builder' | 'preview';

function blankRoutine(): RoutineInput {
  return {
    student: '',
    startDate: '',
    endDate: '',
    periodicity: 3,
    objective: '',
    days: [
      { id: 1, entries: [] },
      { id: 2, entries: [] },
      { id: 3, entries: [] },
    ],
  };
}

function initialDraft(id: string | undefined, routines: Routine[]): RoutineInput {
  if (!id) return blankRoutine();
  const found = routines.find((r) => r.id === id);
  if (!found) return blankRoutine();
  return {
    student: found.student,
    startDate: found.startDate,
    endDate: found.endDate,
    periodicity: found.periodicity,
    objective: found.objective,
    days: found.days.map((d) => ({ id: d.id, entries: d.entries.map((e) => ({ ...e })) })),
  };
}

export default function BuilderPage({
  routines,
  exercises,
  profesores,
  currentUser,
}: BuilderPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // `routines` is guaranteed loaded before this component mounts (see BuilderRoute in App.tsx),
  // and this component remounts (via `key`) whenever `id` changes, so a lazy initializer is
  // enough here — no effect needed to sync the draft from async data.
  const [draft, setDraft] = useState<RoutineInput>(() => initialDraft(id, routines));
  const [mode, setMode] = useState<Mode>('builder');
  const [activeDay, setActiveDay] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Plain ref (not state) so it's always current the instant it's set — including right
  // before an imperative `navigate()` call, with no risk of the blocker below reading a
  // stale value from a not-yet-committed render (see `handleSave`).
  const dirtyRef = useRef(false);

  const exercisesMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  // Whoever created the routine gets credited on the preview/PDF — not whoever happens to
  // be viewing it. For a brand-new (unsaved) routine that's necessarily the current user,
  // since they're the one `createRoutine` will stamp as its author on save.
  const originalRoutine = id ? routines.find((r) => r.id === id) : undefined;
  const authorUid = originalRoutine ? originalRoutine.createdBy.uid : currentUser.uid;
  const authorEmail = originalRoutine ? originalRoutine.createdBy.email : currentUser.email;
  const authorProfesor = profesores.find((p) => p.id === authorUid);
  const authorName = authorProfesor
    ? `${authorProfesor.nombre} ${authorProfesor.apellido}`.trim()
    : authorEmail;

  const currentDay: RoutineDay | undefined = draft.days.find((d) => d.id === activeDay);
  const blocks = useMemo(() => (currentDay ? computeBlocks(currentDay) : []), [currentDay]);

  const totalEntries = draft.days.reduce((acc, d) => acc + d.entries.length, 0);
  const previewAvailable = !!draft.student && !!draft.startDate && !!draft.endDate && totalEntries > 0;
  const builderTitle = id ? `Editar rutina — ${draft.student || 'Alumno'}` : 'Crear rutina';

  // Any in-app navigation away from this route (breadcrumb, top nav tabs, browser back)
  // while there are unsaved edits gets intercepted here instead of silently discarding them.
  const shouldBlock = useCallback(() => dirtyRef.current, []);
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  function updateDraft(updater: (d: RoutineInput) => RoutineInput) {
    setDraft(updater);
    dirtyRef.current = true;
  }

  function updateField<K extends keyof RoutineInput>(field: K, value: RoutineInput[K]) {
    updateDraft((d) => ({ ...d, [field]: value }));
  }

  function onPeriodicityChange(n: number) {
    updateDraft((d) => {
      const days = [...d.days];
      while (days.length < n) days.push({ id: days.length + 1, entries: [] });
      while (days.length > n) days.pop();
      return { ...d, periodicity: n, days };
    });
    setActiveDay((a) => Math.min(a, n));
  }

  function addEntryToDay(exerciseId: string) {
    updateDraft((d) => {
      const days = d.days.map((day) =>
        day.id === activeDay
          ? {
              ...day,
              entries: [
                ...day.entries,
                { id: newId(), exerciseId, series: '3', reps: '10', supersetId: null, note: '' },
              ],
            }
          : day,
      );
      return { ...d, days };
    });
    setPickerOpen(false);
  }

  function removeEntry(dayId: number, entryId: string) {
    updateDraft((d) => {
      const days = d.days.map((day) =>
        day.id !== dayId
          ? day
          : { ...day, entries: cleanSupersets(day.entries.filter((e) => e.id !== entryId)) },
      );
      return { ...d, days };
    });
  }

  function updateEntryField(
    dayId: number,
    entryId: string,
    field: 'series' | 'reps' | 'note',
    value: string,
  ) {
    updateDraft((d) => {
      const days = d.days.map((day) =>
        day.id !== dayId
          ? day
          : {
              ...day,
              entries: day.entries.map((e) => (e.id === entryId ? { ...e, [field]: value } : e)),
            },
      );
      return { ...d, days };
    });
  }

  function setSupersetPartner(dayId: number, entryId: string, partnerValue: string) {
    updateDraft((d) => {
      const days = d.days.map((day) => {
        if (day.id !== dayId) return day;
        let entries = [...day.entries];
        const idx = entries.findIndex((e) => e.id === entryId);
        if (idx === -1) return day;
        if (partnerValue === '') {
          entries[idx] = { ...entries[idx], supersetId: null };
        } else {
          const partnerIdx = entries.findIndex((e) => e.id === partnerValue);
          if (partnerIdx === -1) return day;
          const groupId = entries[partnerIdx].supersetId || entries[idx].supersetId || newId();
          entries[idx] = { ...entries[idx], supersetId: groupId };
          entries[partnerIdx] = { ...entries[partnerIdx], supersetId: groupId };
        }
        entries = cleanSupersets(entries);
        return { ...day, entries };
      });
      return { ...d, days };
    });
  }

  function reorderEntriesInSuperset(
    dayId: number,
    supersetId: string,
    fromIdx: number,
    toIdx: number,
  ) {
    updateDraft((d) => {
      const days = d.days.map((day) =>
        day.id !== dayId
          ? day
          : { ...day, entries: reorderWithinSuperset(day, supersetId, fromIdx, toIdx) },
      );
      return { ...d, days };
    });
  }

  function onBlockDrop(dayId: number, dropIndex: number) {
    if (draggingIndex !== null && draggingIndex !== dropIndex) {
      updateDraft((d) => {
        const days = d.days.map((day) =>
          day.id !== dayId ? day : { ...day, entries: reorderBlocks(day, draggingIndex, dropIndex) },
        );
        return { ...d, days };
      });
    }
    setDraggingIndex(null);
    setDragOverIndex(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (id) {
        await updateRoutine(id, draft, currentUser);
      } else {
        await createRoutine(draft, currentUser);
      }
      dirtyRef.current = false;
      navigate('/');
    } finally {
      setSaving(false);
    }
  }

  const saveButton = (
    <button
      type="button"
      onClick={() => void handleSave()}
      disabled={saving}
      className="bg-red-600 text-white font-bold text-sm px-5 py-2.75 rounded-lg cursor-pointer whitespace-nowrap border-none disabled:opacity-60"
    >
      💾 {saving ? 'Guardando…' : 'Guardar rutina'}
    </button>
  );

  const unsavedChangesModal =
    blocker.state === 'blocked' ? (
      <div className="fixed inset-0 bg-[rgba(20,15,10,0.45)] flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl w-[420px] max-w-[92vw] p-[26px] flex flex-col gap-3.5">
          <div className="text-[17px] font-extrabold">Cambios sin guardar</div>
          <div className="text-sm text-stone-700">
            Tenés cambios en esta rutina que todavía no guardaste. Si salís ahora se van a
            perder.
          </div>
          <div className="flex gap-2.5 mt-2">
            <button
              type="button"
              onClick={() => blocker.reset()}
              className="flex-1 text-center py-2.75 rounded-lg border border-stone-300 font-semibold text-sm cursor-pointer bg-white"
            >
              Seguir editando
            </button>
            <button
              type="button"
              onClick={() => blocker.proceed()}
              className="flex-1 text-center py-2.75 rounded-lg bg-red-700 text-white font-semibold text-sm cursor-pointer border-none"
            >
              Salir sin guardar
            </button>
          </div>
        </div>
      </div>
    ) : null;

  if (mode === 'preview') {
    return (
      <>
        <Breadcrumb title={builderTitle} isPreview onBuilderClick={() => setMode('builder')} />
        <div className="flex-1 p-8 max-w-[1180px] w-full mx-auto flex flex-col gap-5">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="text-2xl font-extrabold tracking-tight">
                Vista previa y exportación
              </div>
              <div className="text-stone-500 text-sm mt-1">
                Así se verá el PDF que recibe {draft.student || 'el alumno'}. Se muestra lo que
                tenés cargado ahora mismo, aunque todavía no lo hayas guardado.
              </div>
            </div>
            <div className="flex gap-2.5 items-center">
              <button
                type="button"
                onClick={() => setMode('builder')}
                className="bg-white border-[1.5px] border-red-600 text-red-600 font-bold text-sm px-[18px] py-2.5 rounded-lg cursor-pointer whitespace-nowrap"
              >
                ← Volver a la rutina
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-red-600 text-white font-bold text-sm px-5 py-3 rounded-lg cursor-pointer border-none"
              >
                ⬇ Exportar PDF
              </button>
              {saveButton}
            </div>
          </div>

          {!previewAvailable ? (
            <div className="px-[18px] py-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-[13.5px] font-semibold">
              Completá alumno, fechas y agregá ejercicios para ver el PDF final.
            </div>
          ) : null}

          <div className="bg-stone-200 rounded-2xl p-7 flex justify-center">
            <RoutinePrintPreview routine={draft} exercisesMap={exercisesMap} authorName={authorName} />
          </div>
        </div>
        {unsavedChangesModal}
      </>
    );
  }

  return (
    <>
      <Breadcrumb title={builderTitle} />
      <div className="flex-1 p-8 max-w-[1180px] w-full mx-auto flex flex-col gap-6">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">{builderTitle}</div>
            <div className="text-stone-500 text-sm mt-1">
              Definí los datos del alumno y armá cada día de entrenamiento.
            </div>
          </div>
          <div className="flex gap-2.5 items-center">
            {previewAvailable ? (
              <button
                type="button"
                onClick={() => setMode('preview')}
                className="bg-white border-[1.5px] border-red-600 text-red-600 font-bold text-sm px-[18px] py-2.5 rounded-lg cursor-pointer whitespace-nowrap"
              >
                Vista previa / PDF
              </button>
            ) : (
              <div
                title='Completá alumno, fechas y agregá ejercicios cargados para poder previsualizarla'
                className="bg-stone-100 border-[1.5px] border-stone-200 text-stone-400 font-bold text-sm px-[18px] py-2.5 rounded-lg cursor-not-allowed whitespace-nowrap"
              >
                Vista previa / PDF
              </div>
            )}
            {saveButton}
          </div>
        </div>

        <div
          className="bg-white border border-stone-200 rounded-2xl p-[22px] grid gap-4"
          style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr' }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-stone-500">
              Alumno *
            </label>
            <input
              value={draft.student}
              onChange={(e) => updateField('student', e.target.value)}
              placeholder="Nombre y apellido"
              className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-stone-500">
              Fecha de inicio *
            </label>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => updateField('startDate', e.target.value)}
              className="px-3 py-2.25 rounded-lg border border-stone-300 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-stone-500">
              Fecha de fin *
            </label>
            <input
              type="date"
              value={draft.endDate}
              onChange={(e) => updateField('endDate', e.target.value)}
              className="px-3 py-2.25 rounded-lg border border-stone-300 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-stone-500">
              Días por semana *
            </label>
            <select
              value={draft.periodicity}
              onChange={(e) => onPeriodicityChange(parseInt(e.target.value, 10))}
              className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm bg-white"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                <option key={p} value={p}>
                  {p} día(s)
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5" style={{ gridColumn: '1 / 3' }}>
            <label className="text-[12.5px] font-semibold text-stone-500">
              Objetivo (opcional)
            </label>
            <input
              value={draft.objective}
              onChange={(e) => updateField('objective', e.target.value)}
              placeholder="Ej: Hipertrofia, pérdida de grasa..."
              className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
            />
          </div>
        </div>

        <div>
          <DayTabs
            dayIds={draft.days.map((d) => d.id)}
            activeDay={activeDay}
            onSelect={setActiveDay}
          />

          <div className="flex flex-col gap-2.5">
            {currentDay && currentDay.entries.length === 0 ? (
              <div className="py-10 px-5 text-center text-stone-500 text-sm border-[1.5px] border-dashed border-stone-300 rounded-xl">
                Todavía no agregaste ejercicios a este día.
              </div>
            ) : null}

            {currentDay &&
              blocks.map((block, blockIndex) => (
                <div key={block.entries[0].id}>
                  {blockIndex > 0 ? (
                    <div className="flex items-center gap-2.5 my-0.5">
                      <div className="flex-1 h-px border-t border-dashed border-stone-300" />
                      <div className="text-[10.5px] font-bold text-stone-500 uppercase tracking-wide whitespace-nowrap">
                        Descanso
                      </div>
                      <div className="flex-1 h-px border-t border-dashed border-stone-300" />
                    </div>
                  ) : null}
                  <ExerciseBlock
                    block={block}
                    blockIndex={blockIndex}
                    day={currentDay}
                    exercises={exercisesMap}
                    isDragOver={dragOverIndex === blockIndex && draggingIndex !== blockIndex}
                    onUpdateField={(entryId, field, value) =>
                      updateEntryField(currentDay.id, entryId, field, value)
                    }
                    onSetSupersetPartner={(entryId, partnerValue) =>
                      setSupersetPartner(currentDay.id, entryId, partnerValue)
                    }
                    onDelete={(entryId) => removeEntry(currentDay.id, entryId)}
                    onReorderEntries={(supersetId, fromIdx, toIdx) =>
                      reorderEntriesInSuperset(currentDay.id, supersetId, fromIdx, toIdx)
                    }
                    onDragStart={setDraggingIndex}
                    onDragEnter={setDragOverIndex}
                    onDrop={(idx) => onBlockDrop(currentDay.id, idx)}
                    onDragEnd={() => {
                      setDraggingIndex(null);
                      setDragOverIndex(null);
                    }}
                  />
                </div>
              ))}

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="self-start mt-1.5 px-[18px] py-2.75 rounded-lg border-[1.5px] border-dashed border-red-600 text-red-700 font-bold text-[13.5px] cursor-pointer bg-transparent"
            >
              + Agregar ejercicio a este día
            </button>
          </div>
        </div>
      </div>

      {pickerOpen ? (
        <ExercisePickerModal
          exercises={exercises}
          activeDay={activeDay}
          onAdd={addEntryToDay}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
      {unsavedChangesModal}
    </>
  );
}
