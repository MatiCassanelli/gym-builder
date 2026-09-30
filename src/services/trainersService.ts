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
import type { Trainer, TrainerInput, Role } from '../types';

const trainersCol = collection(db, 'trainers');

/**
 * Watches just the signed-in user's own doc. This has to resolve before any list query:
 * every other subscription is scoped by the gymId this doc carries, and firestore.rules
 * only lets a non-admin list trainers once the query pins gymId to their own. Live
 * rather than one-shot so an admin moving someone between gyms — or revoking them —
 * takes effect without the trainer reloading.
 */
export function subscribeMyTrainer(
  uid: string,
  callback: (trainer: Trainer | null) => void,
): () => void {
  return onSnapshot(doc(trainersCol, uid), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Trainer) : null);
  });
}

/**
 * Live roster. `gymId: null` means "every gym" and is only permitted for site admins —
 * for anyone else the unfiltered query is rejected by the rules rather than silently
 * returning a trimmed list.
 */
export function subscribeTrainers(
  gymId: string | null,
  callback: (trainers: Trainer[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = gymId === null ? trainersCol : query(trainersCol, where('gymId', '==', gymId));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Trainer));
    },
    onError,
  );
}

// Document id is the trainer's own auth uid — set (not add) so it always maps 1:1.
// Only the profile fields are written: `gymId` and `role` are deliberately absent so a
// trainer saving their own profile can never touch their own access level.
export async function upsertTrainer(uid: string, input: TrainerInput): Promise<void> {
  const { photo, ...rest } = input;
  await setDoc(doc(trainersCol, uid), photo ? { ...rest, photo } : rest, { merge: true });
}

interface CreateTrainerDocInput {
  name: string;
  lastName: string;
  email: string;
  gymId: string;
  role: Role;
}

/** Admin-only: seeds the doc for a freshly created account (see adminUsersService). */
export async function createTrainerDoc(
  uid: string,
  input: CreateTrainerDocInput,
): Promise<void> {
  await setDoc(doc(trainersCol, uid), input);
}

/**
 * Changes what someone is allowed to do inside the gym they already belong to.
 *
 * A coordinator may only ever call this to promote a trainer to coordinator — the rules
 * refuse the other direction for them, so nobody can take sole control of a gym by demoting
 * their peers. Demotion is an admin-only move.
 */
export async function updateTrainerRole(uid: string, role: Role): Promise<void> {
  await updateDoc(doc(trainersCol, uid), { role });
}

/**
 * Removes the access record, which locks the trainer out on their next load — their routines
 * stay in the gym, credited to them. A coordinator can only do this to a `role: 'trainer'`
 * row (so never to a peer, and never to themselves); an admin can do it to anyone.
 *
 * The Firebase Auth account itself can only be deleted from the Firebase console; without
 * this doc it can't reach any data.
 */
export async function deleteTrainer(uid: string): Promise<void> {
  await deleteDoc(doc(trainersCol, uid));
}
