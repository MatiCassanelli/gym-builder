import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/client';
import { normalizeRoutine, normalizeRoutineInput } from '../lib/routineModel';
import type { Routine, RoutineInput, UserRef } from '../types';

export interface PlanLineage {
  planId: string;
  version: number;
}

const routinesCol = collection(db, 'routines');

/**
 * Live routines for one gym. `gymId: null` means "every gym" and is only permitted for site
 * admins: firestore.rules rejects the unfiltered query for anyone else, so a trainer can
 * never widen their own scope by dropping the filter.
 */
export function subscribeRoutines(
  gymId: string | null,
  callback: (routines: Routine[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q =
    gymId === null
      ? query(routinesCol, orderBy('endDate'))
      : query(routinesCol, where('gymId', '==', gymId), orderBy('endDate'));
  return onSnapshot(
    q,
    (snap) => {
      // Normalizing here (rather than at each call site) means the rest of the app only ever
      // sees the current entry shape — legacy "series x reps" docs are converted once, on read.
      callback(snap.docs.map((d) => normalizeRoutine({ id: d.id, ...d.data() } as Routine)));
    },
    onError,
  );
}

// gymId is passed separately from the editable draft: it's assigned once, at creation, and
// is never something the builder form can change afterwards.
// Without a lineage the routine starts a new plan: it is version 1 and its own id is the planId.
export async function createRoutine(
  input: RoutineInput,
  gymId: string,
  by: UserRef,
  lineage?: PlanLineage,
): Promise<string> {
  const now = Date.now();
  const ref = doc(routinesCol);
  await setDoc(ref, {
    ...input,
    gymId,
    planId: lineage?.planId ?? ref.id,
    version: lineage?.version ?? 1,
    createdBy: by,
    createdAt: now,
    updatedBy: by,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateRoutine(
  id: string,
  input: RoutineInput,
  by: UserRef,
): Promise<void> {
  await updateDoc(doc(routinesCol, id), {
    ...input,
    updatedBy: by,
    updatedAt: Date.now(),
  });
}

export async function deleteRoutine(id: string): Promise<void> {
  await deleteDoc(doc(routinesCol, id));
}

// "(copia)" is appended to the student name (there's no separate routine-title field —
// the student name is what identifies a routine in the list) so the duplicate is easy to
// tell apart from the original it was based on.
export function buildRoutineCopy(routine: Routine): RoutineInput {
  return {
    ...normalizeRoutineInput(routine),
    student: `${routine.student} (copia)`,
  };
}
