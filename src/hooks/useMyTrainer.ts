import { useEffect, useState } from 'react';
import { subscribeMyTrainer } from '../services/trainersService';
import type { Trainer } from '../types';

export interface MyTrainerState {
  trainer: Trainer | null;
  loading: boolean;
}

// The snapshot remembers whose doc it is, so switching accounts reads as loading instead of
// briefly handing the new user the previous one's role.
interface MyTrainerSnapshot {
  uid: string | null;
  trainer: Trainer | null;
}

// The signed-in user's own access record: it decides both what they can see (gymId) and
// what they can do (role), so everything else in the app waits on it.
export function useMyTrainer(uid: string): MyTrainerState {
  const [snapshot, setSnapshot] = useState<MyTrainerSnapshot>({ uid: null, trainer: null });

  useEffect(() => {
    return subscribeMyTrainer(uid, (trainer) => setSnapshot({ uid, trainer }));
  }, [uid]);

  const loading = snapshot.uid !== uid;
  return { trainer: loading ? null : snapshot.trainer, loading };
}
