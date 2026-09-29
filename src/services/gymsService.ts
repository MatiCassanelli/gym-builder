import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/client';
import type { Gym, GymInput } from '../types';

const gymsCol = collection(db, 'gyms');

// Admins only — firestore.rules allows listing the whole collection to them alone, so a
// coordinator/trainer must use subscribeGym with their own gymId instead.
export function subscribeGyms(callback: (gyms: Gym[]) => void): () => void {
  const q = query(gymsCol, orderBy('name'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Gym));
  });
}

// Single-doc read, which is all a non-admin is ever allowed: they can see their own gym
// and have no way to learn that any other gym exists.
export function subscribeGym(gymId: string, callback: (gym: Gym | null) => void): () => void {
  return onSnapshot(doc(gymsCol, gymId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Gym) : null);
  });
}

export async function createGym(input: GymInput): Promise<string> {
  const now = Date.now();
  const { logo, ...rest } = input;
  const ref = await addDoc(gymsCol, {
    ...rest,
    ...(logo ? { logo } : {}),
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateGym(id: string, input: GymInput): Promise<void> {
  const { logo, ...rest } = input;
  await updateDoc(doc(gymsCol, id), {
    ...rest,
    // deleteField (rather than null) so a cleared logo leaves no field behind and `Gym.logo`
    // stays `string | undefined` on read.
    logo: logo ?? deleteField(),
    updatedAt: Date.now(),
  });
}

export async function deleteGym(id: string): Promise<void> {
  await deleteDoc(doc(gymsCol, id));
}

/**
 * Removes a gym along with the access records of everyone in it — every gym has a
 * coordinator by construction, so "delete only when empty" would mean never.
 *
 * Their Auth accounts survive (the client SDK can't delete those) but have nothing left to
 * read, and their routines are deliberately left in place: erasing a gym's whole training
 * history on a single click is not a call this should make. One batch, so a gym is never
 * left half-staffed if the write fails partway.
 */
export async function deleteGymWithTrainers(id: string, trainerIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  trainerIds.forEach((uid) => batch.delete(doc(db, 'trainers', uid)));
  batch.delete(doc(gymsCol, id));
  await batch.commit();
}
