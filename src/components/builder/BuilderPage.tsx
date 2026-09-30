import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../layout/Breadcrumb';
import DayTabs from './DayTabs';
import ExerciseBlock, { type SetField } from './ExerciseBlock';
import ExercisePickerModal, { type PickerTarget } from './ExercisePickerModal';
import WarmupEditor from './WarmupEditor';
import VersionSelect from './VersionSelect';
import RoutinePrintPreview from '../preview/RoutinePrintPreview';
import { cleanSupersets, computeBlocks, reorderBlocks, reorderWithinSuperset } from '../../lib/blocks';
import { MAX_PERIODICITY, WARMUP_DAY_ID, dayPalette } from '../../lib/colors';
import { nextDayIso } from '../../lib/format';
import { newId } from '../../lib/ids';
import { latestVersions, versionsOf } from '../../lib/planVersions';
import {
  MAX_SETS,
  blankRoutineInput,
  makeSets,
  normalizeRoutineInput,
  DEFAULT_SET,
} from '../../lib/routineModel';
import { createRoutine, updateRoutine } from '../../services/routinesService';
import { exportRoutinePdf } from '../../lib/pdfExport';
import { gymBranding } from '../../lib/branding';
import { routinesListPath } from '../../lib/routinesListLocation';
import type {
  Exercise,
  Gym,
  Trainer,
  Routine,
  RoutineDay,
  RoutineInput,
  UserRef,
  WarmupPhaseKey,
} from '../../types';
import { ChevronLeftIcon } from '../layout/icons';

interface BuilderPageProps {
  routines: Routine[];
  exercises: Exercise[];
  trainers: Trainer[];
  currentUser: UserRef;
  gyms: Gym[];
  /** null only for a site admin looking across every gym at once. */
  activeGymId: string | null;
  /** Route /routines/:id/new-version: prefill from the plan's current version, save as the next one. */
  newVersion: boolean;
}

type Mode = 'builder' | 'preview';

// The routine a new version continues from: the plan's current version, whichever version id
// the URL happens to carry.
function currentVersionOf(id: string | undefined, routines: Routine[]): Routine | undefined {
  const found = routines.find((r) => r.id === id);
  if (!found) return undefined;
  return latestVersions(routines).find((r) => r.planId === found.planId);
}

function initialDraft(
  id: string | undefined,
  routines: Routine[],
  exercises: Exercise[],
  newVersion: boolean,
): RoutineInput {
  if (!id) return blankRoutineInput(exercises);
  if (newVersion) {
    const current = currentVersionOf(id, routines);
    if (!current) return blankRoutineInput(exercises);
    // Nothing is written until "Guardar": the new version starts the day after the old one ends.
    return {
      ...normalizeRoutineInput(current),
      startDate: nextDayIso(current.endDate),
      endDate: '',
    };
  }
  const found = routines.find((r) => r.id === id);
  if (!found) return blankRoutineInput(exercises);
  return normalizeRoutineInput(found);
}

export default function BuilderPage({
  routines,
  exercises,
  trainers,
  currentUser,
  gyms,
  activeGymId,
  newVersion,
}: BuilderPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // `routines` is guaranteed loaded before this component mounts (see BuilderRoute in App.tsx),
  // and this component remounts (via `key`) whenever `id` changes, so a lazy initializer is
  // enough here — no effect needed to sync the draft from async data.
  const [draft, setDraft] = useState<RoutineInput>(() => initialDraft(id, routines, exercises, newVersion));
  const [mode, setMode] = useState<Mode>('builder');
  const [activeDay, setActiveDay] = useState(1);
  // Which list the exercise picker is filling: the active day, or one warm-up phase.
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Plain ref (not state) so it's always current the instant it's set — including right
  // before an imperative `navigate()` call, with no risk of the blocker below reading a
  // stale value from a not-yet-committed render (see `handleSave`).
  const dirtyRef = useRef(false);

  const exercisesMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  // Whoever created the routine gets credited on the preview/PDF — not whoever happens to
  // be viewing it. For a brand-new (unsaved) routine that's necessarily the current user,
  // since they're the one `createRoutine` will stamp as its author on save.
  const editingId = newVersion ? undefined : id;
  const originalRoutine = editingId ? routines.find((r) => r.id === editingId) : undefined;
  const previousVersion = newVersion ? currentVersionOf(id, routines) : undefined;
  const authorUid = originalRoutine ? originalRoutine.createdBy.uid : currentUser.uid;
  const authorEmail = originalRoutine ? originalRoutine.createdBy.email : currentUser.email;
  const authorTrainer = trainers.find((p) => p.id === authorUid);
  const authorName = authorTrainer
    ? `${authorTrainer.name} ${authorTrainer.lastName}`.trim()
    : authorEmail;

  // An existing routine keeps the gym it was created in — editing it from an admin's other
  // scope must never move it. A new one lands in whichever gym is currently in view.
  const routineGymId = (originalRoutine ?? previousVersion)?.gymId ?? activeGymId;
  const planVersions = originalRoutine ? versionsOf(routines, originalRoutine.planId) : [];
  const versionSelect = originalRoutine ? (
    <VersionSelect versions={planVersions} selectedId={originalRoutine.id} trainers={trainers} />
  ) : null;
  const routineGym = gyms.find((g) => g.id === routineGymId) ?? null;

  const showWarmup = activeDay === WARMUP_DAY_ID;
  const currentDay: RoutineDay | undefined = draft.days.find((d) => d.id === activeDay);
  const blocks = useMemo(() => (currentDay ? computeBlocks(currentDay) : []), [currentDay]);
  const palette = useMemo(() => dayPalette(activeDay), [activeDay]);
  const dayIds = useMemo(() => draft.days.map((d) => d.id), [draft.days]);

  const totalEntries = draft.days.reduce((acc, d) => acc + d.entries.length, 0);
  const previewAvailable = !!draft.student && !!draft.startDate && !!draft.endDate && totalEntries > 0;
  let builderTitle = 'Crear rutina';
  if (newVersion) builderTitle = `Nueva versión — ${draft.student || 'Alumno'}`;
  else if (id) builderTitle = `Editar rutina — ${draft.student || 'Alumno'}`;

  // Any in-app navigation away from this route (breadcrumb, top nav tabs, browser back)
  // while there are unsaved edits gets intercepted here instead of silently discarding them.
  const shouldBlock = useCallback(() => dirtyRef.current, []);
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
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
      while (days.length < n) days.push({ id: days.length + 1, entries: [], note: '' });
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
                { id: newId(), exerciseId, sets: makeSets(3), supersetId: null, note: '' },
              ],
            }
          : day,
      );
      return { ...d, days };
    });
    setPickerTarget(null);
  }

  function addWarmupItem(exerciseId: string, phase: WarmupPhaseKey) {
    updateDraft((d) => ({
      ...d,
      warmup: {
        ...d.warmup,
        items: {
          ...d.warmup.items,
          [phase]: [...d.warmup.items[phase], { id: newId(), exerciseId, dose: '', note: '' }],
        },
      },
    }));
    setPickerTarget(null);
  }

  function handlePickerAdd(exerciseId: string) {
    if (pickerTarget === null) return;
    if (pickerTarget.kind === 'day') addEntryToDay(exerciseId);
    else addWarmupItem(exerciseId, pickerTarget.phase);
  }

  function updateWarmupItem(
    phase: WarmupPhaseKey,
    itemId: string,
    field: 'dose' | 'note',
    value: string,
  ) {
    updateDraft((d) => ({
      ...d,
      warmup: {
        ...d.warmup,
        items: {
          ...d.warmup.items,
          [phase]: d.warmup.items[phase].map((it) =>
            it.id === itemId ? { ...it, [field]: value } : it,
          ),
        },
      },
    }));
  }

  function removeWarmupItem(phase: WarmupPhaseKey, itemId: string) {
    updateDraft((d) => ({
      ...d,
      warmup: {
        ...d.warmup,
        items: { ...d.warmup.items, [phase]: d.warmup.items[phase].filter((it) => it.id !== itemId) },
      },
    }));
  }

  // Drag-and-drop reorder within a phase's item list — a plain splice since each phase's
  // items are their own flat array.
  function reorderWarmupItem(phase: WarmupPhaseKey, fromIdx: number, toIdx: number) {
    updateDraft((d) => {
      const items = [...d.warmup.items[phase]];
      if (
        fromIdx < 0 ||
        fromIdx >= items.length ||
        toIdx < 0 ||
        toIdx >= items.length ||
        fromIdx === toIdx
      ) {
        return d;
      }
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      return { ...d, warmup: { ...d.warmup, items: { ...d.warmup.items, [phase]: items } } };
    });
  }

  function setWarmupLabel(phase: WarmupPhaseKey, value: string) {
    updateDraft((d) => ({
      ...d,
      warmup: { ...d.warmup, labels: { ...d.warmup.labels, [phase]: value } },
    }));
  }

  function setWarmupNote(value: string) {
    updateDraft((d) => ({ ...d, warmup: { ...d.warmup, note: value } }));
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

  function updateDayNote(dayId: number, value: string) {
    updateDraft((d) => {
      const days = d.days.map((day) => (day.id !== dayId ? day : { ...day, note: value }));
      return { ...d, days };
    });
  }

  function updateEntryNote(dayId: number, entryId: string, value: string) {
    updateDraft((d) => {
      const days = d.days.map((day) =>
        day.id !== dayId
          ? day
          : {
              ...day,
              entries: day.entries.map((e) => (e.id === entryId ? { ...e, note: value } : e)),
            },
      );
      return { ...d, days };
    });
  }

  function updateSetValue(
    dayId: number,
    entryId: string,
    setIndex: number,
    field: SetField,
    value: string,
  ) {
    updateDraft((d) => {
      const days = d.days.map((day) =>
        day.id !== dayId
          ? day
          : {
              ...day,
              entries: day.entries.map((e) =>
                e.id !== entryId
                  ? e
                  : {
                      ...e,
                      sets: e.sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s)),
                    },
              ),
            },
      );
      return { ...d, days };
    });
  }

  // Growing the set count repeats the last set (the usual case: same prescription across
  // series), shrinking just drops the trailing ones.
  function setEntrySetCount(dayId: number, entryId: string, count: number) {
    const target = Math.max(1, Math.min(count || 1, MAX_SETS));
    updateDraft((d) => {
      const days = d.days.map((day) =>
        day.id !== dayId
          ? day
          : {
              ...day,
              entries: day.entries.map((e) => {
                if (e.id !== entryId) return e;
                const next = e.sets.slice(0, target);
                while (next.length < target) {
                  next.push({ ...(next[next.length - 1] ?? DEFAULT_SET) });
                }
                return { ...e, sets: next };
              }),
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
      if (editingId) {
        await updateRoutine(editingId, draft, currentUser);
      } else if (routineGymId) {
        const lineage = previousVersion
          ? { planId: previousVersion.planId, version: previousVersion.version + 1 }
          : undefined;
        await createRoutine(draft, routineGymId, currentUser, lineage);
      }
      dirtyRef.current = false;
      navigate(routinesListPath());
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    try {
      await exportRoutinePdf(draft, exercisesMap, authorName, gymBranding(routineGym));
    } finally {
      setExporting(false);
    }
  }

  // A routine has to belong to exactly one gym, and the admin's cross-gym scope doesn't name
  // one — so creating from there is blocked until they pick a gym in the top bar.
  const noGym = !editingId && !routineGymId;

  // Dates are ISO yyyy-mm-dd strings, so string comparison orders them correctly.
  const canSave =
    !!draft.student.trim() && !!draft.startDate && !!draft.endDate && draft.endDate > draft.startDate;

  const saveButton = (
    <button
      type="button"
      onClick={() => void handleSave()}
      disabled={saving || !canSave}
      title={canSave ? undefined : 'Completá alumno, fecha de inicio y fecha de fin (posterior al inicio)'}
      className="bg-red-600 text-white font-bold text-sm px-5 py-2.75 rounded-lg cursor-pointer whitespace-nowrap border-none disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {saving ? 'Guardando…' : 'Guardar rutina'}
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
        <Breadcrumb
          title={builderTitle}
          isPreview
          onBuilderClick={() => setMode('builder')}
          right={versionSelect}
        />
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
                className="inline-flex items-center gap-1.5 bg-white border-[1.5px] border-red-600 text-red-600 font-bold text-sm px-[18px] py-2.5 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <ChevronLeftIcon /> Volver a la rutina
              </button>
              <button
                type="button"
                onClick={() => void handleExportPdf()}
                disabled={exporting || !previewAvailable}
                className="bg-red-600 text-white font-bold text-sm px-5 py-3 rounded-lg cursor-pointer border-none disabled:opacity-60"
              >
                {exporting ? 'Generando…' : 'Exportar PDF'}
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
            <RoutinePrintPreview
              routine={draft}
              exercisesMap={exercisesMap}
              authorName={authorName}
              gym={gymBranding(routineGym)}
            />
          </div>
        </div>
        {unsavedChangesModal}
      </>
    );
  }

  if (noGym) {
    return (
      <>
        <Breadcrumb title={builderTitle} />
        <div className="flex-1 p-8 max-w-[720px] w-full mx-auto">
          <div className="px-[18px] py-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-[13.5px] font-semibold">
            Elegí un gimnasio en la barra de arriba antes de crear la rutina: cada rutina
            pertenece a un único gimnasio.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumb title={builderTitle} right={versionSelect} />
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
            {originalRoutine ? (
              <button
                type="button"
                onClick={() => navigate(`/routines/${originalRoutine.id}/new-version`)}
                className="bg-white border-[1.5px] border-red-600 text-red-600 font-bold text-sm px-[18px] py-2.5 rounded-lg cursor-pointer whitespace-nowrap"
              >
                Nueva versión
              </button>
            ) : null}
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
              {Array.from({ length: MAX_PERIODICITY }, (_, i) => i + 1).map((p) => (
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
            dayIds={dayIds}
            activeDay={activeDay}
            onSelect={setActiveDay}
          />

          {showWarmup ? (
            <WarmupEditor
              warmup={draft.warmup}
              exercises={exercisesMap}
              onLabelChange={setWarmupLabel}
              onNoteChange={setWarmupNote}
              onItemFieldChange={updateWarmupItem}
              onReorderItem={reorderWarmupItem}
              onRemoveItem={removeWarmupItem}
              onAddToPhase={(phase) => setPickerTarget({ kind: 'warmup', phase })}
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {currentDay ? (
                <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-1.75">
                  <label className="text-[12.5px] font-semibold text-stone-500">
                    Nota del profesor para este día (opcional)
                  </label>
                  <textarea
                    value={currentDay.note}
                    onChange={(e) => updateDayNote(currentDay.id, e.target.value)}
                    rows={2}
                    placeholder="Ej: hoy priorizamos técnica, bajá el peso si sentís molestia..."
                    className="px-3 py-2.5 rounded-lg border border-stone-300 text-[13px] leading-relaxed resize-y font-sans"
                  />
                </div>
              ) : null}

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
                      palette={palette}
                      isDragOver={dragOverIndex === blockIndex && draggingIndex !== blockIndex}
                      onUpdateNote={(entryId, value) =>
                        updateEntryNote(currentDay.id, entryId, value)
                      }
                      onUpdateSet={(entryId, setIndex, field, value) =>
                        updateSetValue(currentDay.id, entryId, setIndex, field, value)
                      }
                      onSetCount={(entryId, count) =>
                        setEntrySetCount(currentDay.id, entryId, count)
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
                onClick={() => setPickerTarget({ kind: 'day' })}
                className="self-start mt-1.5 px-[18px] py-2.75 rounded-lg border-[1.5px] border-dashed border-red-600 text-red-700 font-bold text-[13.5px] cursor-pointer bg-transparent"
              >
                + Agregar ejercicio a este día
              </button>
            </div>
          )}
        </div>
      </div>

      {pickerTarget !== null ? (
        <ExercisePickerModal
          exercises={exercises}
          target={pickerTarget}
          activeDay={activeDay}
          onAdd={handlePickerAdd}
          onClose={() => setPickerTarget(null)}
        />
      ) : null}
      {unsavedChangesModal}
    </>
  );
}
