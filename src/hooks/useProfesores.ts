import { useEffect, useState } from 'react';
import { subscribeProfesores } from '../services/profesoresService';
import type { Profesor } from '../types';

// See useRoutines: the snapshot carries the scope it belongs to, so a gym switch reads as
// loading without touching state from inside the effect.
interface ProfesoresSnapshot {
  scope: string | null | undefined;
  profesores: Profesor[];
  error: boolean;
}

// `gymId: null` is the site admin's "all gyms" scope; any other value scopes the query to
// that gym, which is what firestore.rules requires of a non-admin.
export function useProfesores(
  enabled: boolean,
  gymId: string | null,
): { profesores: Profesor[]; loading: boolean; error: boolean } {
  const [snapshot, setSnapshot] = useState<ProfesoresSnapshot>({
    scope: undefined,
    profesores: [],
    error: false,
  });

  useEffect(() => {
    if (!enabled) return;
    return subscribeProfesores(
      gymId,
      (profesores) => setSnapshot({ scope: gymId, profesores, error: false }),
      () => setSnapshot({ scope: gymId, profesores: [], error: true }),
    );
  }, [enabled, gymId]);

  const scopeMatches = snapshot.scope === gymId;
  const loading = !scopeMatches;
  const error = scopeMatches && snapshot.error;
  return { profesores: loading || error ? [] : snapshot.profesores, loading, error };
}
