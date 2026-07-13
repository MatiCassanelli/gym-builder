import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/client';
import type { Routine, RoutineInput, UserRef } from '../types';

const routinesCol = collection(db, 'routines');

export function subscribeRoutines(callback: (routines: Routine[]) => void): () => void {
  const q = query(routinesCol, orderBy('endDate'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Routine));
  });
}

export async function createRoutine(input: RoutineInput, by: UserRef): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(routinesCol, {
    ...input,
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
    student: `${routine.student} (copia)`,
    startDate: routine.startDate,
    endDate: routine.endDate,
    periodicity: routine.periodicity,
    objective: routine.objective,
    days: routine.days.map((d) => ({ id: d.id, entries: d.entries.map((e) => ({ ...e })) })),
  };
}
