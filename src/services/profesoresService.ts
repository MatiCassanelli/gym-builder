import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase/client';
import type { Profesor, ProfesorInput } from '../types';

const profesoresCol = collection(db, 'profesores');

export function subscribeProfesores(callback: (profesores: Profesor[]) => void): () => void {
  return onSnapshot(profesoresCol, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Profesor));
  });
}

// Document id is the professor's own auth uid — set (not add) so it always maps 1:1.
export async function upsertProfesor(uid: string, input: ProfesorInput): Promise<void> {
  const { foto, ...rest } = input;
  await setDoc(doc(profesoresCol, uid), foto ? { ...rest, foto } : rest, { merge: true });
}
