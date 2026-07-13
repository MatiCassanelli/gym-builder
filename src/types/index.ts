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

export interface RoutineEntry {
  id: string;
  exerciseId: string | null;
  series: string;
  reps: string;
  supersetId: string | null;
  note: string;
}

export interface RoutineDay {
  id: number;
  entries: RoutineEntry[];
}

export interface Routine {
  id: string;
  student: string;
  startDate: string;
  endDate: string;
  periodicity: number;
  objective: string;
  days: RoutineDay[];
  createdBy: UserRef;
  createdAt: number;
  updatedBy: UserRef;
  updatedAt: number;
}

export type RoutineInput = Pick<
  Routine,
  'student' | 'startDate' | 'endDate' | 'periodicity' | 'objective' | 'days'
>;

export type ExerciseBlock =
  | { type: 'single'; entries: [RoutineEntry] }
  | { type: 'superset'; supersetId: string; letter: string; entries: RoutineEntry[] };

// Document id matches the Firebase Auth uid — one profesor doc per trainer account.
export interface Profesor {
  id: string;
  nombre: string;
  apellido: string;
  mail: string;
  foto?: string;
  // When true, this profesor is excluded from the "filter by profesor" chips on the
  // routines list (e.g. shared/admin accounts that shouldn't show up as a trainer).
  skipFromFilters?: boolean;
}

export type ProfesorInput = Pick<Profesor, 'nombre' | 'apellido' | 'mail' | 'foto'>;
