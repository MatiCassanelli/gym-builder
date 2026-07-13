import { useEffect, useState } from 'react';
import { subscribeProfesores } from '../services/profesoresService';
import type { Profesor } from '../types';

export function useProfesores(enabled: boolean): { profesores: Profesor[]; loading: boolean } {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    return subscribeProfesores((p) => {
      setProfesores(p);
      setLoading(false);
    });
  }, [enabled]);

  return { profesores, loading };
}
