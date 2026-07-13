import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/client';
import { SEED_EXERCISES } from '../lib/muscleGroups';
import type { Exercise, ExerciseInput, UserRef } from '../types';

const exercisesCol = collection(db, 'exercises');

export function subscribeExercises(callback: (exercises: Exercise[]) => void): () => void {
  const q = query(exercisesCol, orderBy('name'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Exercise));
  });
}

export async function createExercise(input: ExerciseInput, by: UserRef): Promise<void> {
  const now = Date.now();
  await addDoc(exercisesCol, {
    ...input,
    createdBy: by,
    createdAt: now,
    updatedBy: by,
    updatedAt: now,
  });
}

export async function updateExercise(
  id: string,
  input: ExerciseInput,
  by: UserRef,
): Promise<void> {
  await updateDoc(doc(exercisesCol, id), {
    ...input,
    updatedBy: by,
    updatedAt: Date.now(),
  });
}

export async function deleteExercise(id: string): Promise<void> {
  await deleteDoc(doc(exercisesCol, id));
}

// Claims a one-time seed lock via a sentinel doc inside a transaction, so concurrent
// callers (React StrictMode's double-mount, or two trainers opening the empty app at
// the same time) can't race the old "check empty, then batch-write" approach into
// writing the seed list twice.
export async function seedExercisesIfEmpty(by: UserRef): Promise<void> {
  const sentinelRef = doc(db, 'meta', 'exercisesSeed');
  const alreadySeeded = await runTransaction(db, async (tx) => {
    const snap = await tx.get(sentinelRef);
    if (snap.exists()) return true;
    tx.set(sentinelRef, { seededAt: Date.now(), seededBy: by });
    return false;
  });
  if (alreadySeeded) return;

  const now = Date.now();
  const batch = writeBatch(db);
  for (const [name, group, videoUrl] of SEED_EXERCISES) {
    const ref = doc(exercisesCol);
    batch.set(ref, {
      name,
      group,
      videoUrl,
      createdBy: by,
      createdAt: now,
      updatedBy: by,
      updatedAt: now,
    });
  }
  await batch.commit();
}
