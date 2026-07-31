import { useEffect, useState } from 'react';
import { subscribeExercises } from '../services/exercisesService';
import type { Exercise } from '../types';

export function useExercises(
  enabled: boolean,
  uid: string | null,
): { exercises: Exercise[]; loading: boolean } {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !uid) return;
    return subscribeExercises((e) => {
      setExercises(e);
      setLoading(false);
    });
  }, [enabled, uid]);

  return { exercises, loading };
}
