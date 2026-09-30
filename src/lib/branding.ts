import type { Gym } from '../types';

// Shown wherever no single gym is in scope: the login screen (nobody is signed in yet, so
// there's no gym to brand with) and the admin's "every gym" view.
export const APP_NAME = 'Gym Builder';

export interface Branding {
  name: string;
  logo: string | null;
}

export function gymBranding(gym: Gym | null | undefined): Branding {
  if (!gym) return { name: APP_NAME, logo: null };
  return { name: gym.name, logo: gym.logo ?? null };
}

// Fallback mark for a gym with no logo uploaded yet: up to two initials from its name.
export function gymInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
