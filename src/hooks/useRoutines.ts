import { useEffect, useState } from 'react';
import { subscribeRoutines } from '../services/routinesService';
import type { Routine } from '../types';

export function useRoutines(enabled: boolean): { routines: Routine[]; loading: boolean } {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    return subscribeRoutines((r) => {
      setRoutines(r);
      setLoading(false);
    });
  }, [enabled]);

  return { routines, loading };
}
