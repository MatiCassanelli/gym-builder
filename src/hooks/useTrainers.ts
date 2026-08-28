import { useEffect, useState } from 'react';
import { subscribeTrainers } from '../services/trainersService';
import type { Trainer } from '../types';

// See useRoutines: the snapshot carries the scope it belongs to, so a gym switch reads as
// loading without touching state from inside the effect.
interface TrainersSnapshot {
  scope: string | null | undefined;
  trainers: Trainer[];
  error: boolean;
}

// `gymId: null` is the site admin's "all gyms" scope; any other value scopes the query to
// that gym, which is what firestore.rules requires of a non-admin.
export function useTrainers(
  enabled: boolean,
  gymId: string | null,
): { trainers: Trainer[]; loading: boolean; error: boolean } {
  const [snapshot, setSnapshot] = useState<TrainersSnapshot>({
    scope: undefined,
    trainers: [],
    error: false,
  });

  useEffect(() => {
    if (!enabled) return;
    return subscribeTrainers(
      gymId,
      (trainers) => setSnapshot({ scope: gymId, trainers, error: false }),
      () => setSnapshot({ scope: gymId, trainers: [], error: true }),
    );
  }, [enabled, gymId]);

  const scopeMatches = snapshot.scope === gymId;
  const loading = !scopeMatches;
  const error = scopeMatches && snapshot.error;
  return { trainers: loading || error ? [] : snapshot.trainers, loading, error };
}
