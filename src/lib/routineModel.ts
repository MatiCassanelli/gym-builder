import { newId } from './ids';
import { WARMUP_PHASES } from '../types';
import type {
  Exercise,
  Routine,
  RoutineEntry,
  RoutineInput,
  RoutineWarmup,
  SetSpec,
  WarmupItem,
  WarmupItems,
  WarmupPhaseKey,
} from '../types';

// Five columns is what fits the set matrix across an A4 page without shrinking the numbers
// past legibility, in the editor and in the PDF alike.
export const MAX_SETS = 5;

export const SET_COUNT_OPTIONS = [1, 2, 3, 4, 5];

export const DEFAULT_SET: SetSpec = { reps: '10', rir: '2', pause: '90"' };

// The set-matrix rows, in order — same table drawn by the editor, the preview and the PDF.
export const SET_FIELD_ROWS: Array<{ field: keyof SetSpec; label: string }> = [
  { field: 'reps', label: 'Reps' },
  { field: 'rir', label: 'RIR' },
  { field: 'pause', label: 'Pausa' },
];

// The 25/50/25 exercise-row split — name / set matrix / video+note — shared by the editor,
// the preview and the PDF export.
export const ROW_COLUMN_RATIOS = { left: 0.25, mid: 0.5, right: 0.25 } as const;
export const ROW_COLUMNS_CSS = `${ROW_COLUMN_RATIOS.left * 100}% ${ROW_COLUMN_RATIOS.mid * 100}% ${ROW_COLUMN_RATIOS.right * 100}%`;

export function makeSets(count: number, from: Partial<SetSpec> = {}): SetSpec[] {
  const n = Math.max(1, Math.min(count || 3, MAX_SETS));
  return Array.from({ length: n }, () => ({ ...DEFAULT_SET, ...from }));
}

export function normalizeEntry(entry: RoutineEntry): RoutineEntry {
  return {
    id: entry.id,
    exerciseId: entry.exerciseId ?? null,
    sets: (entry.sets ?? []).slice(0, MAX_SETS).map((s) => ({ ...s })),
    supersetId: entry.supersetId ?? null,
    note: entry.note ?? '',
  };
}

export const DEFAULT_WARMUP_LABELS: Record<WarmupPhaseKey, string> = {
  movilidad: '4 min · sin pausa, ritmo controlado',
  activacion: '4 min · 2 rondas',
  especifica: 'antes del primer ejercicio de cada bloque',
};

export const DEFAULT_WARMUP_NOTE =
  'Entrada en calor específica: antes de la primera serie de cada ejercicio grande ' +
  '(sentadilla, press, peso muerto, remo) hacé 2 series de aproximación — una con ~50% del ' +
  'peso de trabajo por 8 repeticiones y otra con ~75% por 4 repeticiones, con pausa breve. ' +
  'No cuentan como series del plan y se hacen lejos del fallo. En los accesorios alcanza con ' +
  'una serie liviana.';

function emptyWarmupItems(): WarmupItems {
  return WARMUP_PHASES.reduce((items, phase) => {
    items[phase.key] = [];
    return items;
  }, {} as WarmupItems);
}

export function blankWarmup(): RoutineWarmup {
  return { labels: { ...DEFAULT_WARMUP_LABELS }, note: DEFAULT_WARMUP_NOTE, items: emptyWarmupItems() };
}

export interface WarmupPhaseView {
  key: WarmupPhaseKey;
  header: string;
  items: Array<{ id: string; name: string; dose: string; note: string; videoUrl?: string }>;
}

// Same phase headers + item lookup used by both the on-screen preview and the PDF export.
export function buildWarmupPhases(
  warmup: RoutineWarmup,
  exercisesMap: Map<string, Exercise>,
): WarmupPhaseView[] {
  return WARMUP_PHASES.map((phase, index) => {
    const label = warmup.labels[phase.key];
    return {
      key: phase.key,
      header: `${index + 1} · ${phase.title}${label ? ` — ${label}` : ''}`,
      items: warmup.items[phase.key].map((it) => {
        const ex = it.exerciseId ? exercisesMap.get(it.exerciseId) : undefined;
        return { id: it.id, name: ex?.name ?? '—', dose: it.dose, note: it.note, videoUrl: ex?.videoUrl };
      }),
    };
  }).filter((phase) => phase.items.length > 0);
}

function normalizeWarmupItem(it: Partial<WarmupItem>): WarmupItem {
  return {
    id: it.id || newId(),
    exerciseId: it.exerciseId ?? null,
    dose: it.dose ?? '',
    note: it.note ?? '',
  };
}

export function normalizeWarmup(warmup: RoutineWarmup | undefined): RoutineWarmup {
  const rawItems = warmup?.items;
  const items = emptyWarmupItems();
  if (Array.isArray(rawItems)) {
    // Routines saved before items were grouped by phase carried a `phase` field per item.
    for (const it of rawItems as Array<Partial<WarmupItem> & { phase?: WarmupPhaseKey }>) {
      if (it.phase && items[it.phase]) items[it.phase].push(normalizeWarmupItem(it));
    }
  } else if (rawItems) {
    for (const phase of WARMUP_PHASES) {
      items[phase.key] = (rawItems[phase.key] ?? []).map(normalizeWarmupItem);
    }
  }
  return {
    labels: { ...DEFAULT_WARMUP_LABELS, ...(warmup?.labels ?? {}) },
    note: warmup?.note ?? DEFAULT_WARMUP_NOTE,
    items,
  };
}

// Everything downstream (editor, preview, PDF) works on the normalized shape, so routines are
// run through this once on the way out of Firestore and never checked for legacy fields again.
export function normalizeRoutineInput(routine: Partial<RoutineInput>): RoutineInput {
  return {
    student: routine.student ?? '',
    startDate: routine.startDate ?? '',
    endDate: routine.endDate ?? '',
    periodicity: routine.periodicity ?? 3,
    objective: routine.objective ?? '',
    days: (routine.days ?? []).map((d) => ({
      id: d.id,
      entries: d.entries.map(normalizeEntry),
    })),
    warmup: normalizeWarmup(routine.warmup),
  };
}

export function normalizeRoutine(routine: Routine): Routine {
  return { ...routine, ...normalizeRoutineInput(routine) };
}

export function blankRoutineInput(): RoutineInput {
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
    warmup: blankWarmup(),
  };
}
