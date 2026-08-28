import { useEffect, useState } from 'react';
import { subscribeMyProfesor } from '../services/profesoresService';
import type { Profesor } from '../types';

export interface MyProfesorState {
  profesor: Profesor | null;
  loading: boolean;
}

// The snapshot remembers whose doc it is, so switching accounts reads as loading instead of
// briefly handing the new user the previous one's role.
interface MyProfesorSnapshot {
  uid: string | null;
  profesor: Profesor | null;
}

// The signed-in user's own access record: it decides both what they can see (gymId) and
// what they can do (rol), so everything else in the app waits on it.
export function useMyProfesor(uid: string): MyProfesorState {
  const [snapshot, setSnapshot] = useState<MyProfesorSnapshot>({ uid: null, profesor: null });

  useEffect(() => {
    return subscribeMyProfesor(uid, (profesor) => setSnapshot({ uid, profesor }));
  }, [uid]);

  const loading = snapshot.uid !== uid;
  return { profesor: loading ? null : snapshot.profesor, loading };
}
