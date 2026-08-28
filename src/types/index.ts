export const MUSCLE_GROUPS = [
  'Biceps',
  'Espalda',
  'Pecho',
  'Triceps',
  'Hombro',
  'Aductores y abductores',
  'Gluteo',
  'Gemelos',
  'Isquios',
  'Cuadriceps',
  'Cardio',
  'Movilidad',
  'Activacion',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

// Groups the exercise picker lists first when opened from a warm-up phase — the rest of the
// library stays reachable, since some phases legitimately borrow strength movements (puente de
// glúteo, face pull) as activation work. Typed against MuscleGroup so removing/renaming a group
// above is a compile error here too, instead of this list silently going stale.
export const WARMUP_MUSCLE_GROUPS: readonly MuscleGroup[] = ['Movilidad', 'Activacion'];

export interface UserRef {
  uid: string;
  email: string;
}

export interface Exercise {
  id: string;
  name: string;
  group: MuscleGroup;
  videoUrl: string;
  createdBy: UserRef;
  createdAt: number;
  updatedBy: UserRef;
  updatedAt: number;
}

export type ExerciseInput = Pick<Exercise, 'name' | 'group' | 'videoUrl'>;

// One prescribed set of an exercise. Every value is free text on purpose: trainers write
// ranges ("8-10"), time ("40s") and pauses ("90\"") as often as plain numbers.
export interface SetSpec {
  reps: string;
  /** Repeticiones en reserva — how many reps should be left in the tank. */
  rir: string;
  pause: string;
}

export interface RoutineEntry {
  id: string;
  exerciseId: string | null;
  sets: SetSpec[];
  supersetId: string | null;
  note: string;
}

export interface RoutineDay {
  id: number;
  entries: RoutineEntry[];
  /** Optional trainer note for this specific day, printed before its first exercise. */
  note: string;
}

export const WARMUP_PHASES = [
  { key: 'mobility', title: 'Movilidad' },
  { key: 'activation', title: 'Activación' },
  { key: 'specific', title: 'Entrada en calor específica' },
] as const;

export type WarmupPhaseKey = (typeof WARMUP_PHASES)[number]['key'];

export interface WarmupItem {
  id: string;
  exerciseId: string | null;
  /** Duration or volume for this drill, e.g. "8 repeticiones lentas". */
  dose: string;
  note: string;
}

// Items grouped by phase, rather than one flat list carrying its own phase per item — reordering
// or looking up "this phase's items" is then a plain array operation instead of a filter/scan.
export type WarmupItems = Record<WarmupPhaseKey, WarmupItem[]>;

// Warm-up is per routine, not global: the same three phases are printed on the first page of
// every PDF, but each student's drills and doses can be tuned individually.
export interface RoutineWarmup {
  labels: Record<WarmupPhaseKey, string>;
  note: string;
  items: WarmupItems;
}

export interface Routine {
  id: string;
  /** Owning gym. Routines are never visible outside it (see firestore.rules). */
  gymId: string;
  student: string;
  startDate: string;
  endDate: string;
  periodicity: number;
  objective: string;
  days: RoutineDay[];
  warmup: RoutineWarmup;
  createdBy: UserRef;
  createdAt: number;
  updatedBy: UserRef;
  updatedAt: number;
}

export type RoutineInput = Pick<
  Routine,
  'student' | 'startDate' | 'endDate' | 'periodicity' | 'objective' | 'days' | 'warmup'
>;

export type ExerciseBlock =
  | { type: 'single'; entries: [RoutineEntry] }
  | { type: 'superset'; supersetId: string; letter: string; entries: RoutineEntry[] };

// A gym is the tenant boundary: its trainers and routines are invisible to every other
// gym. The logo rides on the doc as a data URL (same trade-off as trainer photos — no
// Firebase Storage bucket to provision, and it stays well under the 1MB doc limit once
// resized by resizeLogoToDataUrl).
export interface Gym {
  id: string;
  name: string;
  logo?: string;
  createdAt: number;
  updatedAt: number;
}

export type GymInput = Pick<Gym, 'name' | 'logo'>;

// 'admin' is site-wide (sees and edits every gym); 'coordinator' and 'trainer' are both
// scoped to their own gymId, the coordinator additionally being allowed to edit the gym's
// own name and logo. Enforced in firestore.rules, not just in the UI.
export const ROLES = ['admin', 'coordinator', 'trainer'] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  coordinator: 'Coordinador',
  trainer: 'Profesor',
};

// Document id matches the Firebase Auth uid — one trainer doc per trainer account.
// The doc doubles as the access-control record: no doc (or no gym) means no access, and
// `role`/`gymId` can only ever be written by an admin.
export interface Trainer {
  id: string;
  name: string;
  lastName: string;
  email: string;
  photo?: string;
  /** null only for site admins, who aren't tied to any single gym. */
  gymId: string | null;
  role: Role;
  // When true, this trainer is excluded from the "filter by trainer" chips on the
  // routines list (e.g. shared/admin accounts that shouldn't show up as a trainer).
  skipFromFilters?: boolean;
}

export type TrainerInput = Pick<Trainer, 'name' | 'lastName' | 'email' | 'photo'>;

/** What an admin fills in to create a brand-new trainer account (see adminUsersService). */
export interface NewTrainerInput {
  email: string;
  name: string;
  lastName: string;
  role: Role;
}
