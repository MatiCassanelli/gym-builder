/** Pure helpers to resolve which routines are the current version of their plan. */
import type { Routine } from '../types';

const isNewer = (a: Routine, b: Routine): boolean =>
  a.version !== b.version ? a.version > b.version : a.createdAt > b.createdAt;

const newestFirst = (a: Routine, b: Routine): number => {
  if (isNewer(a, b)) return -1;
  if (isNewer(b, a)) return 1;
  return 0;
};

export const latestVersions = (routines: Routine[]): Routine[] => {
  const latestByPlan = new Map<string, Routine>();
  for (const routine of routines) {
    const current = latestByPlan.get(routine.planId);
    if (!current || isNewer(routine, current)) latestByPlan.set(routine.planId, routine);
  }
  return [...latestByPlan.values()];
};

export const versionsOf = (routines: Routine[], planId: string): Routine[] =>
  routines.filter((r) => r.planId === planId).sort(newestFirst);
