import { createContext, useContext } from 'react';
import type { Exercise, Gym, Trainer, Routine, UserRef } from '../types';

export interface AppData {
  routines: Routine[];
  routinesLoading: boolean;
  routinesError: boolean;
  exercises: Exercise[];
  exercisesLoading: boolean;
  trainers: Trainer[];
  trainersError: boolean;
  gyms: Gym[];
  gymsLoading: boolean;
  /** The signed-in user's own access record — always present past the session gate. */
  myTrainer: Trainer;
  isAdmin: boolean;
  /**
   * Which gym the app is currently showing. Fixed to their own gym for a coordinator or
   * trainer; for a site admin it's switchable, and `null` there means "every gym at once".
   */
  activeGymId: string | null;
  setActiveGymId: (gymId: string | null) => void;
  activeGym: Gym | null;
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
