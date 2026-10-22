import { newId } from "./ids";
import { WARMUP_PHASES } from "../types";
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
} from "../types";

// Up to 10 set columns still fit an A4 page legibly, as long as rows with more than
// WIDE_MATRIX_FROM sets give the matrix more of the row (see rowColumnRatios).
export const MAX_SETS = 10;

export const SET_COUNT_OPTIONS = Array.from({ length: MAX_SETS }, (_, i) => i + 1);

export const DEFAULT_SET: SetSpec = { reps: "10", rir: "2", pause: '90"' };

// The set-matrix rows, in order — same table drawn by the editor, the preview and the PDF.
export const SET_FIELD_ROWS: Array<{ field: keyof SetSpec; label: string }> = [
  { field: "reps", label: "Reps" },
  { field: "rir", label: "RIR" },
  { field: "pause", label: "Pausa" },
];

// The 25/50/25 exercise-row split — name / set matrix / video+note — shared by the editor,
// the preview and the PDF export.
export const ROW_COLUMN_RATIOS = { left: 0.25, mid: 0.5, right: 0.25 } as const;

// Rows with many sets trade name/note width for matrix width so each set cell stays readable.
const WIDE_MATRIX_FROM = 8;
const WIDE_ROW_COLUMN_RATIOS = { left: 0.22, mid: 0.62, right: 0.16 } as const;

export const rowColumnRatios = (setCount: number) =>
  setCount >= WIDE_MATRIX_FROM ? WIDE_ROW_COLUMN_RATIOS : ROW_COLUMN_RATIOS;

export const rowColumnsCss = (setCount: number): string => {
  const { left, mid, right } = rowColumnRatios(setCount);
  return `${left * 100}% ${mid * 100}% ${right * 100}%`;
};

export function makeSets(
  count: number,
  from: Partial<SetSpec> = {},
): SetSpec[] {
  const n = Math.max(1, Math.min(count || 3, MAX_SETS));
  return Array.from({ length: n }, () => ({ ...DEFAULT_SET, ...from }));
}

export function normalizeEntry(entry: RoutineEntry): RoutineEntry {
  return {
    id: entry.id,
    exerciseId: entry.exerciseId ?? null,
    sets: (entry.sets ?? []).slice(0, MAX_SETS).map((s) => ({ ...s })),
    supersetId: entry.supersetId ?? null,
    note: entry.note ?? "",
  };
}

export const DEFAULT_WARMUP_LABELS: Record<WarmupPhaseKey, string> = {
  mobility: "2 series · Ritmo controlado",
  activation: "",
  specific: "",
};

export const DEFAULT_WARMUP_NOTE =
  "Entrada en calor específica: antes de la primera serie de cada ejercicio grande " +
  "(sentadilla, press, peso muerto, remo) hacé 2 series de aproximación — una con ~50% del " +
  "peso de trabajo por 8 repeticiones y otra con ~75% por 4 repeticiones, con pausa breve. " +
  "No cuentan como series del plan y se hacen lejos del fallo. En los accesorios alcanza con " +
  "una serie liviana.";

function emptyWarmupItems(): WarmupItems {
  return WARMUP_PHASES.reduce((items, phase) => {
    items[phase.key] = [];
    return items;
  }, {} as WarmupItems);
}

// Every new routine starts with these already in the "mobility" phase — same drills, same
// dosage, every time — so the trainer edits/removes them instead of adding them from scratch.
export const DEFAULT_MOBILITY_EXERCISE_NAMES = [
  "Arm Haulers",
  "Squat to stand",
  "Groiner con rotacion",
  "Ankle mob",
];

export const DEFAULT_MOBILITY_DOSE = "10 a 15 repeticiones";

function defaultMobilityItems(exercises: Exercise[]): WarmupItem[] {
  return DEFAULT_MOBILITY_EXERCISE_NAMES.map((name) =>
    exercises.find((e) => e.name === name),
  )
    .filter((e): e is Exercise => !!e)
    .map((exercise) => ({
      id: newId(),
      exerciseId: exercise.id,
      dose: DEFAULT_MOBILITY_DOSE,
      note: "",
    }));
}

export function blankWarmup(exercises: Exercise[] = []): RoutineWarmup {
  const items = emptyWarmupItems();
  items.mobility = defaultMobilityItems(exercises);
  return {
    labels: { ...DEFAULT_WARMUP_LABELS },
    note: DEFAULT_WARMUP_NOTE,
    items,
  };
}

export interface WarmupPhaseView {
  key: WarmupPhaseKey;
  header: string;
  items: Array<{
    id: string;
    name: string;
    dose: string;
    note: string;
    videoUrl?: string;
  }>;
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
      header: `${index + 1} · ${phase.title}${label ? ` — ${label}` : ""}`,
      items: warmup.items[phase.key].map((it) => {
        const ex = it.exerciseId ? exercisesMap.get(it.exerciseId) : undefined;
        return {
          id: it.id,
          name: ex?.name ?? "—",
          dose: it.dose,
          note: it.note,
          videoUrl: ex?.videoUrl,
        };
      }),
    };
  }).filter((phase) => phase.items.length > 0);
}

function normalizeWarmupItem(it: Partial<WarmupItem>): WarmupItem {
  return {
    id: it.id || newId(),
    exerciseId: it.exerciseId ?? null,
    dose: it.dose ?? "",
    note: it.note ?? "",
  };
}

export function normalizeWarmup(
  warmup: RoutineWarmup | undefined,
): RoutineWarmup {
  const rawItems = warmup?.items;
  const items = emptyWarmupItems();
  if (Array.isArray(rawItems)) {
    // Routines saved before items were grouped by phase carried a `phase` field per item.
    for (const it of rawItems as Array<
      Partial<WarmupItem> & { phase?: WarmupPhaseKey }
    >) {
      if (it.phase && items[it.phase])
        items[it.phase].push(normalizeWarmupItem(it));
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
export function normalizeRoutineInput(
  routine: Partial<RoutineInput>,
): RoutineInput {
  return {
    student: routine.student ?? "",
    startDate: routine.startDate ?? "",
    endDate: routine.endDate ?? "",
    periodicity: routine.periodicity ?? 3,
    objective: routine.objective ?? "",
    days: (routine.days ?? []).map((d) => ({
      id: d.id,
      entries: d.entries.map(normalizeEntry),
      note: d.note ?? "",
    })),
    warmup: normalizeWarmup(routine.warmup),
  };
}

export function normalizeRoutine(routine: Routine): Routine {
  return {
    ...routine,
    ...normalizeRoutineInput(routine),
    // Docs written before versioning have neither field: each is the first version of its own plan.
    planId: routine.planId ?? routine.id,
    version: routine.version ?? 1,
  };
}

export function blankRoutineInput(exercises: Exercise[] = []): RoutineInput {
  return {
    student: "",
    startDate: "",
    endDate: "",
    periodicity: 3,
    objective: "",
    days: [
      { id: 1, entries: [], note: "" },
      { id: 2, entries: [], note: "" },
      { id: 3, entries: [], note: "" },
    ],
    warmup: blankWarmup(exercises),
  };
}
