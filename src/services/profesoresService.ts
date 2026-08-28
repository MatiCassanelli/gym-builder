import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/client';
import type { Profesor, ProfesorInput, Rol } from '../types';

const profesoresCol = collection(db, 'profesores');

/**
 * Watches just the signed-in user's own doc. This has to resolve before any list query:
 * every other subscription is scoped by the gymId this doc carries, and firestore.rules
 * only lets a non-admin list profesores once the query pins gymId to their own. Live
 * rather than one-shot so an admin moving someone between gyms — or revoking them —
 * takes effect without the trainer reloading.
 */
export function subscribeMyProfesor(
  uid: string,
  callback: (profesor: Profesor | null) => void,
): () => void {
  return onSnapshot(doc(profesoresCol, uid), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Profesor) : null);
  });
}

/**
 * Live roster. `gymId: null` means "every gym" and is only permitted for site admins —
 * for anyone else the unfiltered query is rejected by the rules rather than silently
 * returning a trimmed list.
 */
export function subscribeProfesores(
  gymId: string | null,
  callback: (profesores: Profesor[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = gymId === null ? profesoresCol : query(profesoresCol, where('gymId', '==', gymId));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Profesor));
    },
    onError,
  );
}

// Document id is the professor's own auth uid — set (not add) so it always maps 1:1.
// Only the profile fields are written: `gymId` and `rol` are deliberately absent so a
// trainer saving their own profile can never touch their own access level.
export async function upsertProfesor(uid: string, input: ProfesorInput): Promise<void> {
  const { foto, ...rest } = input;
  await setDoc(doc(profesoresCol, uid), foto ? { ...rest, foto } : rest, { merge: true });
}

interface CreateProfesorDocInput {
  nombre: string;
  apellido: string;
  mail: string;
  gymId: string;
  rol: Rol;
}

/** Admin-only: seeds the doc for a freshly created account (see adminUsersService). */
export async function createProfesorDoc(
  uid: string,
  input: CreateProfesorDocInput,
): Promise<void> {
  await setDoc(doc(profesoresCol, uid), input);
}

/**
 * Changes what someone is allowed to do inside the gym they already belong to.
 *
 * A coordinador may only ever call this to promote a profesor to coordinador — the rules
 * refuse the other direction for them, so nobody can take sole control of a gym by demoting
 * their peers. Demotion is an admin-only move.
 */
export async function updateProfesorRol(uid: string, rol: Rol): Promise<void> {
  await updateDoc(doc(profesoresCol, uid), { rol });
}

/**
 * Removes the access record, which locks the trainer out on their next load — their routines
 * stay in the gym, credited to them. A coordinador can only do this to a `rol: 'profesor'`
 * row (so never to a peer, and never to themselves); an admin can do it to anyone.
 *
 * The Firebase Auth account itself can only be deleted from the Firebase console; without
 * this doc it can't reach any data.
 */
export async function deleteProfesor(uid: string): Promise<void> {
  await deleteDoc(doc(profesoresCol, uid));
}
