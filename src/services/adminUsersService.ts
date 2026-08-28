import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { firebaseConfig, usingEmulators } from '../firebase/client';
import { createGym, deleteGym } from './gymsService';
import { createProfesorDoc } from './profesoresService';
import type { GymInput, NuevoProfesorInput } from '../types';

// Firebase's client SDK has no "create a user without signing in as them" call: doing this
// on the default app would swap the admin's own session for the brand-new account. A second,
// throwaway app instance has its own isolated auth state, so the admin's session on the
// default app is untouched — and the instance is torn down right afterwards.
const SECONDARY_APP_NAME = 'alta-profesor';

// The admin never picks a password: a throwaway one is set here and immediately invalidated
// in practice by the reset email, so the trainer is the only one who ever knows their own.
function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('');
}

export class AltaProfesorError extends Error {
  /** True once the Auth account exists — i.e. retrying the same email would now collide. */
  readonly cuentaCreada: boolean;

  constructor(message: string, cuentaCreada: boolean) {
    super(message);
    this.name = 'AltaProfesorError';
    this.cuentaCreada = cuentaCreada;
  }
}

function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  if (code === 'auth/email-already-in-use') {
    return 'Ese email ya tiene una cuenta en la plataforma.';
  }
  if (code === 'auth/invalid-email') return 'El email no es válido.';
  if (code === 'auth/operation-not-allowed') {
    return 'El alta por email y contraseña está deshabilitada en Firebase Auth.';
  }
  return 'No pudimos crear la cuenta. Probá de nuevo.';
}

/**
 * Creates the Auth account, writes its profesores/{uid} doc into `gymId`, and emails the
 * trainer a link to set their own password. Returns the new uid.
 */
export async function altaProfesor(
  input: NuevoProfesorInput,
  gymId: string,
): Promise<string> {
  const secondary = initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  const secondaryAuth = getAuth(secondary);
  // The default app is pointed at the emulators in firebase/client; this one is created
  // here, so it needs the same treatment or an alta would hit real Firebase Auth.
  if (usingEmulators) {
    connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }

  try {
    const mail = input.mail.trim().toLowerCase();
    let uid: string;
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, mail, randomPassword());
      uid = cred.user.uid;
    } catch (error) {
      throw new AltaProfesorError(authErrorMessage(error), false);
    }

    // Written from the *admin's* session (the default app), which is what firestore.rules
    // authorises to create another trainer's doc — the secondary session has no such right.
    try {
      await createProfesorDoc(uid, {
        nombre: input.nombre.trim(),
        apellido: input.apellido.trim(),
        mail,
        gymId,
        rol: input.rol,
      });
    } catch {
      throw new AltaProfesorError(
        `Se creó la cuenta de ${mail} pero no pudimos guardar su ficha de profesor. ` +
          'Volvé a intentar el alta; si el email figura como ya usado, borralo desde la consola de Firebase.',
        true,
      );
    }

    try {
      await sendPasswordResetEmail(secondaryAuth, mail);
    } catch {
      throw new AltaProfesorError(
        `${mail} quedó dado de alta, pero no pudimos enviarle el mail para definir su contraseña. ` +
          'Puede pedirlo desde "Olvidé mi contraseña" en el login.',
        true,
      );
    }

    return uid;
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondary).catch(() => {});
  }
}

/**
 * Creates a gym together with the coordinador who will run it — the two go in as a unit,
 * since a gym with nobody able to staff it is useless and only an admin can appoint a
 * coordinador. If the account can't be created, the just-created (and necessarily empty)
 * gym is removed again rather than left behind as an orphan for the admin to notice later.
 */
export async function altaGimnasio(
  gym: GymInput,
  coordinador: Omit<NuevoProfesorInput, 'rol'>,
): Promise<string> {
  const gymId = await createGym(gym);
  try {
    await altaProfesor({ ...coordinador, rol: 'coordinador' }, gymId);
  } catch (error) {
    await deleteGym(gymId).catch(() => {});
    throw error;
  }
  return gymId;
}
