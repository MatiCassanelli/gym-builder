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
