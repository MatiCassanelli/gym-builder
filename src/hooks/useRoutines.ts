import { useEffect, useState } from 'react';
import { subscribeRoutines } from '../services/routinesService';
import type { Routine } from '../types';

// The scope each snapshot arrived for is stored alongside the data: switching gyms is then
// "loading" by derivation, with no setState in the effect body, and the previous gym's
// routines are never shown under the new gym's name while the new query is in flight.
interface RoutinesSnapshot {
  scope: string | null | undefined;
  routines: Routine[];
  error: boolean;
}

// `gymId: null` is the site admin's "all gyms" scope; any other value scopes the query to
// that gym, which is what firestore.rules requires of a non-admin.
export function useRoutines(
  enabled: boolean,
  gymId: string | null,
): { routines: Routine[]; loading: boolean; error: boolean } {
  const [snapshot, setSnapshot] = useState<RoutinesSnapshot>({
    scope: undefined,
    routines: [],
    error: false,
  });

  useEffect(() => {
    if (!enabled) return;
    return subscribeRoutines(
      gymId,
      (routines) => setSnapshot({ scope: gymId, routines, error: false }),
      () => setSnapshot({ scope: gymId, routines: [], error: true }),
    );
  }, [enabled, gymId]);

  const scopeMatches = snapshot.scope === gymId;
  const loading = !scopeMatches;
  const error = scopeMatches && snapshot.error;
  return { routines: loading || error ? [] : snapshot.routines, loading, error };
}
