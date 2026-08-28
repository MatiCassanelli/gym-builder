import { useEffect, useState } from 'react';
import { subscribeGym, subscribeGyms } from '../services/gymsService';
import type { Gym } from '../types';

// See useRoutines: the snapshot carries the scope it belongs to, so a scope change reads as
// loading without touching state from inside the effect.
interface GymsSnapshot {
  scope: string | undefined;
  gyms: Gym[];
}

function scopeKey(gymId: string | null, isAdmin: boolean): string {
  return isAdmin ? 'admin' : `gym:${gymId ?? ''}`;
}

/**
 * Every gym the signed-in user is allowed to see: the whole list for a site admin, and the
 * single gym they belong to for everyone else. Non-admins go through a by-id read rather
 * than a filtered list, so they never even learn how many other gyms exist.
 */
export function useGyms(gymId: string | null, isAdmin: boolean): { gyms: Gym[]; loading: boolean } {
  const [snapshot, setSnapshot] = useState<GymsSnapshot>({ scope: undefined, gyms: [] });
  const scope = scopeKey(gymId, isAdmin);

  // A non-admin with no gym assigned has nothing to subscribe to, and nothing to wait for.
  const nadaQueCargar = !isAdmin && !gymId;

  useEffect(() => {
    if (isAdmin) {
      return subscribeGyms((gyms) => setSnapshot({ scope: scopeKey(null, true), gyms }));
    }
    if (!gymId) return;
    return subscribeGym(gymId, (gym) =>
      setSnapshot({ scope: scopeKey(gymId, false), gyms: gym ? [gym] : [] }),
    );
  }, [gymId, isAdmin]);

  const loading = !nadaQueCargar && snapshot.scope !== scope;
  return { gyms: loading || nadaQueCargar ? [] : snapshot.gyms, loading };
}
