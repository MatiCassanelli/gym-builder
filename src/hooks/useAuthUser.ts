import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { subscribeAuth } from '../services/authService';

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuthUser(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    return subscribeAuth((user) => setState({ user, loading: false }));
  }, []);

  return state;
}
