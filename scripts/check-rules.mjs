#!/usr/bin/env node
/**
 * Exercises firestore.rules against the local emulator, signed in as each role, and asserts
 * that every cross-gym access is refused. The UI hides those paths, but the rules are what
 * actually stops someone typing into the browser console — so they get checked here.
 *
 *   npm run emulators   # terminal 1
 *   npm run seed        # terminal 2
 *   npm run check:rules # terminal 2
 */
const PROJECT = 'gym-builder-mati';
const DB = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const PASSWORD = 'test1234';

let pass = 0;
let fail = 0;

async function signIn(email) {
  const res = await fetch(`${AUTH}/accounts:signInWithPassword?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(`no pude entrar como ${email}: ${await res.text()}`);
  return (await res.json()).idToken;
}

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function getDoc(token, path) {
  return (await fetch(`${DB}/${path}`, { headers: headers(token) })).ok;
}

async function query(token, collection, filters = []) {
  const where = filters.length
    ? {
        compositeFilter: {
          op: 'AND',
          filters: filters.map(([field, value]) => ({
            fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } },
          })),
        },
      }
    : undefined;
  const res = await fetch(`${DB}:runQuery`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: collection }], ...(where ? { where } : {}) },
    }),
  });
  return res.ok;
}

async function write(token, path, fields, mask) {
  const qs = mask.map((m) => `updateMask.fieldPaths=${m}`).join('&');
  const res = await fetch(`${DB}/${path}?${qs}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ fields }),
  });
  return res.ok;
}

async function del(token, path) {
  const res = await fetch(`${DB}/${path}`, { method: 'DELETE', headers: headers(token) });
  return res.ok;
}

function uidOf(idToken) {
  return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString()).user_id;
}

async function check(label, expected, run) {
  let actual;
  try {
    actual = await run();
  } catch {
    actual = false;
  }
  const ok = actual === expected;
  if (ok) pass += 1;
  else fail += 1;
  const verb = expected ? 'PUEDE' : 'NO PUEDE';
  console.log(`  ${ok ? '✓' : '✗'} ${verb.padEnd(9)} ${label}`);
}

async function firstRoutineOf(ownerToken, gymId) {
  const res = await fetch(`${DB}:runQuery`, {
    method: 'POST',
    headers: headers(ownerToken),
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'routines' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'gymId' },
            op: 'EQUAL',
            value: { stringValue: gymId },
          },
        },
        limit: 1,
      },
    }),
  });
  const rows = await res.json();
  const doc = rows.find((r) => r.document)?.document;
  if (!doc) throw new Error(`no hay rutinas en ${gymId}; corré \`npm run seed\``);
  return doc.name.split('/documents/')[1];
}

async function main() {
  const admin = await signIn('admin@test.com');
  const coordForge = await signIn('coord.forge@test.com');
  const profeForge = await signIn('profe.forge@test.com');
  const profeIron = await signIn('profe.iron@test.com');
  const uidCoordForge = uidOf(coordForge);
  const uidProfeForge = uidOf(profeForge);
  const uidProfeIron = uidOf(profeIron);

  // Throwaway docs for the staffing tests, cleaned up as they go.
  const draft = (gymId, role) => ({
    name: { stringValue: 'Test' },
    lastName: { stringValue: 'Alta' },
    email: { stringValue: 'test.alta@test.com' },
    gymId: { stringValue: gymId },
    role: { stringValue: role },
  });
  const fields = ['name', 'lastName', 'email', 'gymId', 'role'];

  const routineForge = await firstRoutineOf(admin, 'forge');
  const routineIron = await firstRoutineOf(admin, 'ironhouse');

  console.log('\nProfesor de Forge');
  await check('leer las rutinas de su gimnasio', true, () =>
    query(profeForge, 'routines', [['gymId', 'forge']]),
  );
  await check('listar rutinas sin filtrar por gimnasio', false, () => query(profeForge, 'routines'));
  await check('leer una rutina de Iron House', false, () => getDoc(profeForge, routineIron));
  await check('listar todos los gimnasios', false, () => query(profeForge, 'gyms'));
  await check('ver el doc de su propio gimnasio', true, () => getDoc(profeForge, 'gyms/forge'));
  await check('ver el doc de Iron House', false, () => getDoc(profeForge, 'gyms/ironhouse'));
  await check('listar los profesores de su gimnasio', true, () =>
    query(profeForge, 'trainers', [['gymId', 'forge']]),
  );
  await check('listar los profesores de Iron House', false, () =>
    query(profeForge, 'trainers', [['gymId', 'ironhouse']]),
  );
  await check('renombrar su gimnasio (no es coordinador)', false, () =>
    write(profeForge, 'gyms/forge', { name: { stringValue: 'Hackeado' } }, ['name']),
  );
  await check('borrar un ejercicio de la biblioteca', false, () =>
    del(profeForge, 'exercises/no-existe'),
  );
  await check('dar de alta un profesor en su gimnasio', false, () =>
    write(profeForge, 'trainers/alta-por-profe', draft('forge', 'trainer'), fields),
  );

  console.log('\nProfesor de Iron House');
  await check('leer una rutina de Forge', false, () => getDoc(profeIron, routineForge));
  await check('leer las rutinas de su gimnasio', true, () =>
    query(profeIron, 'routines', [['gymId', 'ironhouse']]),
  );

  console.log('\nCoordinador de Forge');
  await check('renombrar su propio gimnasio', true, () =>
    write(coordForge, 'gyms/forge', { name: { stringValue: 'Forge Gym & Box' } }, ['name']),
  );
  await check('renombrar Iron House', false, () =>
    write(coordForge, 'gyms/ironhouse', { name: { stringValue: 'Hackeado' } }, ['name']),
  );
  await check('crear un gimnasio nuevo', false, () =>
    write(coordForge, 'gyms/inventado', { name: { stringValue: 'Mío' } }, ['name']),
  );
  await check('leer rutinas de Iron House', false, () =>
    query(coordForge, 'routines', [['gymId', 'ironhouse']]),
  );

  console.log('\nCoordinador de Forge — armar su equipo');
  await check('dar de alta un profesor en su gimnasio', true, () =>
    write(coordForge, 'trainers/alta-forge', draft('forge', 'trainer'), fields),
  );
  await check('quitar a ese profesor', true, () => del(coordForge, 'trainers/alta-forge'));
  await check('dar de alta un profesor en Iron House', false, () =>
    write(coordForge, 'trainers/alta-iron', draft('ironhouse', 'trainer'), fields),
  );
  await check('nombrar otro coordinador en su gimnasio', false, () =>
    write(coordForge, 'trainers/alta-coord', draft('forge', 'coordinator'), fields),
  );
  await check('crear un admin', false, () =>
    write(coordForge, 'trainers/alta-admin', draft('forge', 'admin'), fields),
  );
  await check('quitarse a sí mismo', false, () => del(coordForge, `trainers/${uidCoordForge}`));
  await check('quitar a otro coordinador de su gimnasio', false, async () => {
    // A stand-in peer, planted by the admin so the coordinator has someone to try it on.
    await write(admin, 'trainers/par-coord', draft('forge', 'coordinator'), fields);
    const ok = await del(coordForge, 'trainers/par-coord');
    await del(admin, 'trainers/par-coord');
    return ok;
  });
  await check('quitar a un profesor de Iron House', false, () =>
    del(coordForge, `trainers/${uidProfeIron}`),
  );
  await check('quitar a un profesor de su gimnasio', true, async () => {
    // Restored right after, so the rest of the run still has its Forge trainer.
    const ok = await del(coordForge, `trainers/${uidProfeForge}`);
    await write(
      admin,
      `trainers/${uidProfeForge}`,
      {
        name: { stringValue: 'Alex' },
        lastName: { stringValue: 'Ortega' },
        email: { stringValue: 'profe.forge@test.com' },
        gymId: { stringValue: 'forge' },
        role: { stringValue: 'trainer' },
      },
      fields,
    );
    return ok;
  });

  console.log('\nCoordinador de Forge — ascensos, una sola dirección');
  await check('ascender a un profesor de su gimnasio a coordinador', true, async () => {
    const ok = await write(
      coordForge,
      `trainers/${uidProfeForge}`,
      { role: { stringValue: 'coordinator' } },
      ['role'],
    );
    return ok;
  });
  await check('degradar a ese coordinador de vuelta a profesor', false, () =>
    write(coordForge, `trainers/${uidProfeForge}`, { role: { stringValue: 'trainer' } }, ['role']),
  );
  await check('(admin) sí puede degradarlo', true, () =>
    write(admin, `trainers/${uidProfeForge}`, { role: { stringValue: 'trainer' } }, ['role']),
  );
  await check('ascender a alguien de Iron House', false, () =>
    write(coordForge, `trainers/${uidProfeIron}`, { role: { stringValue: 'coordinator' } }, [
      'role',
    ]),
  );
  await check('ascender a alguien directo a admin', false, () =>
    write(coordForge, `trainers/${uidProfeForge}`, { role: { stringValue: 'admin' } }, ['role']),
  );
  await check('cambiarle el mail a un profesor con la excusa del rol', false, () =>
    write(
      coordForge,
      `trainers/${uidProfeForge}`,
      { role: { stringValue: 'coordinator' }, email: { stringValue: 'robado@test.com' } },
      ['role', 'email'],
    ),
  );
  await check('mudar a un profesor a otro gimnasio', false, () =>
    write(coordForge, `trainers/${uidProfeForge}`, { gymId: { stringValue: 'ironhouse' } }, [
      'gymId',
    ]),
  );
  await check('borrar su propio gimnasio', false, () => del(coordForge, 'gyms/forge'));

  console.log('\nEscalada de privilegios');
  await check('un profesor se asciende a admin', false, () =>
    write(profeForge, `trainers/${uidProfeForge}`, { role: { stringValue: 'admin' } }, ['role']),
  );
  await check('un profesor se muda a otro gimnasio', false, () =>
    write(profeForge, `trainers/${uidProfeForge}`, { gymId: { stringValue: 'ironhouse' } }, [
      'gymId',
    ]),
  );
  await check('un coordinador se asciende a admin', false, () =>
    write(coordForge, `trainers/${uidCoordForge}`, { role: { stringValue: 'admin' } }, ['role']),
  );

  console.log('\nAdmin del sitio');
  await check('listar todos los gimnasios', true, () => query(admin, 'gyms'));
  await check('leer todas las rutinas de una', true, () => query(admin, 'routines'));
  await check('leer una rutina de cualquier gimnasio', true, () => getDoc(admin, routineIron));
  await check('hacer tareas de coordinador: editar cualquier gimnasio', true, () =>
    write(admin, 'gyms/ironhouse', { name: { stringValue: 'Iron House' } }, ['name']),
  );
  await check('hacer tareas de coordinador: dar de alta en cualquier gimnasio', true, async () => {
    const ok = await write(admin, 'trainers/alta-admin', draft('ironhouse', 'trainer'), fields);
    await del(admin, 'trainers/alta-admin');
    return ok;
  });
  await check('cambiarle el rol a un profesor', true, () =>
    write(admin, `trainers/${uidProfeForge}`, { role: { stringValue: 'trainer' } }, ['role']),
  );
  await check('crear un gimnasio', true, () =>
    write(admin, 'gyms/alta-admin-test', { name: { stringValue: 'Test' } }, ['name']),
  );
  await check('borrarlo', true, () => del(admin, 'gyms/alta-admin-test'));

  console.log(`\n${pass} ok, ${fail} fallidas`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
