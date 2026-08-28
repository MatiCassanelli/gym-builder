import type { Gym } from '../types';

// Shown wherever no single gym is in scope: the login screen (nobody is signed in yet, so
// there's no gym to brand with) and the admin's "todos los gimnasios" view.
export const APP_NAME = 'Gym Builder';

export interface Branding {
  nombre: string;
  logo: string | null;
}

export function gymBranding(gym: Gym | null | undefined): Branding {
  if (!gym) return { nombre: APP_NAME, logo: null };
  return { nombre: gym.nombre, logo: gym.logo ?? null };
}

// Fallback mark for a gym with no logo uploaded yet: up to two initials from its name.
export function gymInitials(nombre: string): string {
  const words = nombre.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
