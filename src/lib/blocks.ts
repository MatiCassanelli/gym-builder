import type { ExerciseBlock, RoutineDay, RoutineEntry } from '../types';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function computeBlocks(day: RoutineDay): ExerciseBlock[] {
  const seen = new Set<string>();
  const blocks: ExerciseBlock[] = [];
  let letterIndex = 0;
  for (const entry of day.entries) {
    if (seen.has(entry.id)) continue;
    if (entry.supersetId) {
      const group = day.entries.filter((e) => e.supersetId === entry.supersetId);
      group.forEach((g) => seen.add(g.id));
      blocks.push({
        type: 'superset',
        supersetId: entry.supersetId,
        letter: LETTERS[letterIndex++] ?? '?',
        entries: group,
      });
    } else {
      seen.add(entry.id);
      blocks.push({ type: 'single', entries: [entry] });
    }
  }
  return blocks;
}

export function cleanSupersets(entries: RoutineEntry[]): RoutineEntry[] {
  const counts: Record<string, number> = {};
  entries.forEach((e) => {
    if (e.supersetId) counts[e.supersetId] = (counts[e.supersetId] ?? 0) + 1;
  });
  return entries.map((e) =>
    e.supersetId && (counts[e.supersetId] ?? 0) < 2 ? { ...e, supersetId: null } : e,
  );
}

export function reorderBlocks(day: RoutineDay, fromIdx: number, toIdx: number): RoutineEntry[] {
  const blocks = computeBlocks(day);
  if (
    fromIdx < 0 ||
    fromIdx >= blocks.length ||
    toIdx < 0 ||
    toIdx >= blocks.length ||
    fromIdx === toIdx
  ) {
    return day.entries;
  }
  const newBlocks = [...blocks];
  const [moved] = newBlocks.splice(fromIdx, 1);
  newBlocks.splice(toIdx, 0, moved);
  return newBlocks.reduce<RoutineEntry[]>((acc, b) => acc.concat(b.entries), []);
}

export function reorderWithinSuperset(
  day: RoutineDay,
  supersetId: string,
  fromIdx: number,
  toIdx: number,
): RoutineEntry[] {
  const groupIndices: number[] = [];
  day.entries.forEach((e, i) => {
    if (e.supersetId === supersetId) groupIndices.push(i);
  });
  if (
    fromIdx < 0 ||
    fromIdx >= groupIndices.length ||
    toIdx < 0 ||
    toIdx >= groupIndices.length ||
    fromIdx === toIdx
  ) {
    return day.entries;
  }
  const group = groupIndices.map((i) => day.entries[i]);
  const [moved] = group.splice(fromIdx, 1);
  group.splice(toIdx, 0, moved);
  const entries = [...day.entries];
  groupIndices.forEach((entriesIdx, groupPos) => {
    entries[entriesIdx] = group[groupPos];
  });
  return entries;
}

export interface SupersetVisual {
  containerClass: string;
  headerText: string;
  headerClass: string;
  rowClass: string;
  connectorLabel: string;
}

export function supersetHeaderText(letter: string): string {
  return `Superserie ${letter} — sin pausa entre ejercicios`;
}

export function supersetVisual(letter: string): SupersetVisual {
  return {
    containerClass: 'border-[1.5px] border-red-400 rounded-xl overflow-hidden bg-red-50 flex flex-col',
    headerText: supersetHeaderText(letter),
    headerClass:
      'flex items-center gap-1.5 bg-red-700 text-white text-[11.5px] font-extrabold tracking-wide uppercase px-3 py-2',
    rowClass: 'bg-white rounded-lg p-2.5 border border-stone-200',
    connectorLabel: '+',
  };
}

export interface SingleVisual {
  outerClass: string;
  badgeClass: string;
  rowClass: string;
}

export function singleVisual(): SingleVisual {
  return {
    outerClass: 'flex items-center gap-2',
    badgeClass: 'hidden',
    rowClass: 'bg-white rounded-lg p-3 border border-stone-200',
  };
}

export const REST_DIVIDER_LABEL = 'Descanso';
