#!/usr/bin/env node
/**
 * Fills the local Firebase emulators with a realistic, throwaway copy of the app:
 *
 *   - the real exercise library and a sample of real routines, read (read-only!) from the
 *     production project so the UI has believable data to render;
 *   - two gyms, so cross-gym isolation is actually testable rather than theoretical;
 *   - one account per role, with known passwords, in Auth.
 *
 * Nothing here ever writes to production. Run the emulators first:
 *
 *   npm run emulators       # terminal 1
 *   npm run seed            # terminal 2
 *   npm run dev:emulator    # terminal 3
 */
import { execFileSync } from 'node:child_process';

const PROJECT = 'gym-builder-mati';
const PROD = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const EMU = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const EMU_AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';

const FORGE = 'forge';
const OTHER = 'ironhouse';
const PASSWORD = 'test1234';

// One account per role, so every permission path can be exercised by logging in.
const ACCOUNTS = [
  { email: 'admin@test.com', name: 'Mati', lastName: 'Admin', gymId: null, role: 'admin' },
  { email: 'coord.forge@test.com', name: 'Rosario', lastName: 'Medina', gymId: FORGE, role: 'coordinator' },
  { email: 'profe.forge@test.com', name: 'Alex', lastName: 'Ortega', gymId: FORGE, role: 'trainer' },
  { email: 'coord.iron@test.com', name: 'Carla', lastName: 'Duarte', gymId: OTHER, role: 'coordinator' },
  { email: 'profe.iron@test.com', name: 'Nico', lastName: 'Ferrer', gymId: OTHER, role: 'trainer' },
];

function prodToken() {
  return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
}

async function readProd(path, token) {
  const res = await fetch(`${PROD}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`producción ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// The emulator accepts the literal token "owner" as full admin, so no credentials are needed.
async function writeEmu(path, fields) {
  const res = await fetch(`${EMU}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`emulador ${path}: ${res.status} ${await res.text()}`);
}

// Idempotent: re-seeding a still-running emulator reuses the account instead of failing on
// EMAIL_EXISTS, so `npm run seed` can be re-run to reset the Firestore side at any time.
async function createUser(email) {
  const signUp = await fetch(`${EMU_AUTH}/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  if (signUp.ok) return (await signUp.json()).localId;

  const detail = await signUp.text();
  if (!detail.includes('EMAIL_EXISTS')) {
    throw new Error(`auth ${email}: ${signUp.status} ${detail}`);
  }
  const signIn = await fetch(`${EMU_AUTH}/accounts:signInWithPassword?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  if (!signIn.ok) throw new Error(`auth ${email}: ya existe con otra contraseña`);
  return (await signIn.json()).localId;
}

async function assertEmulators() {
  try {
    await fetch(`${EMU}/gyms`, { headers: { Authorization: 'Bearer owner' } });
  } catch {
    console.error('No encuentro los emuladores en 127.0.0.1:8080. Corré `npm run emulators` primero.');
    process.exit(1);
  }
}

const str = (v) => ({ stringValue: v });
const int = (v) => ({ integerValue: String(v) });

async function main() {
  await assertEmulators();
  const token = prodToken();
  const now = Date.now();

  // 1. Gyms. Forge keeps its real name and logo; the second one has no logo on purpose, so
  //    the initials fallback gets exercised too.
  console.log('1. gimnasios');
  const forgeDoc = await readProd(`gyms/${FORGE}`, token);
  await writeEmu(`gyms/${FORGE}`, {
    name: str('Forge Gym & Box'),
    logo: forgeDoc.fields.logo,
    createdAt: int(now),
    updatedAt: int(now),
  });
  await writeEmu(`gyms/${OTHER}`, {
    name: str('Iron House'),
    createdAt: int(now),
    updatedAt: int(now),
  });
  console.log(`   ${FORGE} (con logo real) + ${OTHER} (sin logo)`);

  // 2. Accounts, one per role.
  console.log('2. cuentas');
  const uids = {};
  for (const c of ACCOUNTS) {
    const uid = await createUser(c.email);
    uids[c.email] = uid;
    await writeEmu(`trainers/${uid}`, {
      name: str(c.name),
      lastName: str(c.lastName),
      email: str(c.email),
      role: str(c.role),
      gymId: c.gymId ? str(c.gymId) : { nullValue: null },
    });
    console.log(`   ${c.email.padEnd(22)} ${c.role.padEnd(12)} ${c.gymId ?? '(sin gimnasio)'}`);
  }

  // 3. The real exercise library, so the picker and the PDF look like the real thing.
  console.log('3. ejercicios');
  let count = 0;
  let page;
  do {
    const url = `exercises?pageSize=300${page ? `&pageToken=${page}` : ''}`;
    const data = await readProd(url, token);
    for (const doc of data.documents ?? []) {
      const id = doc.name.split('/').pop();
      await writeEmu(`exercises/${id}`, doc.fields);
      count += 1;
    }
    page = data.nextPageToken;
  } while (page);
  console.log(`   ${count} ejercicios copiados de producción`);

  // 4. A sample of real routines, split across both gyms so the isolation is visible: half
  //    stay in Forge, half are re-stamped as Iron House and re-credited to its trainers.
  console.log('4. rutinas');
  const routines = (await readProd('routines?pageSize=12', token)).documents ?? [];
  const otherAuthors = ['coord.iron@test.com', 'profe.iron@test.com'];
  const forgeAuthors = ['coord.forge@test.com', 'profe.forge@test.com'];
  for (const [i, doc] of routines.entries()) {
    const id = doc.name.split('/').pop();
    const inOther = i % 2 === 1;
    const authors = inOther ? otherAuthors : forgeAuthors;
    const email = authors[Math.floor(i / 2) % authors.length];
    const author = {
      mapValue: { fields: { uid: str(uids[email]), email: str(email) } },
    };
    await writeEmu(`routines/${id}`, {
      ...doc.fields,
      gymId: str(inOther ? OTHER : FORGE),
      createdBy: author,
      updatedBy: author,
    });
  }
  console.log(`   ${routines.length} rutinas repartidas entre ${FORGE} e ${OTHER}`);

  console.log(`\nListo. Entrá con cualquiera de esas cuentas, contraseña: ${PASSWORD}`);
  console.log('UI de los emuladores: http://127.0.0.1:4000');
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
