import { useEffect, useState } from 'react';
import { seedExercisesIfEmpty, subscribeExercises } from '../services/exercisesService';
import type { Exercise } from '../types';

export function useExercises(
  enabled: boolean,
  uid: string | null,
  email: string | null,
): { exercises: Exercise[]; loading: boolean } {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !uid) return;
    seedExercisesIfEmpty({ uid, email: email ?? '' });
    return subscribeExercises((e) => {
      setExercises(e);
      setLoading(false);
    });
  }, [enabled, uid, email]);

  return { exercises, loading };
}
