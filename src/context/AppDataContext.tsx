import { createContext, useContext } from 'react';
import type { Exercise, Profesor, Routine, UserRef } from '../types';

export interface AppData {
  routines: Routine[];
  routinesLoading: boolean;
  exercises: Exercise[];
  exercisesLoading: boolean;
  profesores: Profesor[];
  myProfesor: Profesor | null;
  currentUser: UserRef;
  userLabel: string;
}

export const AppDataContext = createContext<AppData | null>(null);

// The router (see App.tsx) is created once at module scope so live Firestore updates to
// routines/exercises don't recreate it — route components pull the latest data from this
// context instead of receiving it as router-supplied element props.
export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataContext.Provider');
  return ctx;
}
