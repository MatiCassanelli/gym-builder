#!/usr/bin/env node
/**
 * ADDITIVE production data migration for the Spanish -> English rename.
 *
 * Writes the new English shape *alongside* the existing Spanish one — it never deletes or
 * overwrites an old field, so the currently-deployed app (which still reads `profesores`,
 * `nombre`, `rol`, `movilidad`, ...) keeps working exactly as before while this runs. This
 * mirrors the additive strategy used for the 2026-08-28 multi-gym cutover (see
 * project-gym-builder-multitenant memory).
 *
 * What it does:
 *   1. Backs up profesores/gyms/routines (full docs) to scripts/.backup-<timestamp>/ as JSON.
 *   2. profesores/{uid} -> trainers/{uid}, translating field names and role values.
 *   3. gyms/{id}: adds a `name` field (copy of `nombre`), leaves `nombre` untouched.
 *   4. routines/{id}: for any doc with a `warmup` field, adds `mobility`/`activation`/
 *      `specific` keys to `warmup.items` and `warmup.labels`, copying the existing
 *      `movilidad`/`activacion`/`especifica` values byte-for-byte. Docs without a `warmup`
 *      field (saved before that feature existed) are left alone — the app already treats a
 *      missing warmup as blank.
 *
 * Nothing here deletes anything. Cutting the app over to read *only* the new schema is a
 * separate step (deploying the new firestore.rules + hosting build) — do that only after
 * this script's summary confirms every count matches.
 *
 * Dry run by default — prints exactly what it would write. Pass --apply to actually write.
 *
 *   node scripts/migrate-prod-english.mjs            # dry run
 *   node scripts/migrate-prod-english.mjs --apply     # writes for real
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROJECT = 'gym-builder-mati';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const APPLY = process.argv.includes('--apply');

const ROLE_MAP = { admin: 'admin', coordinador: 'coordinator', profesor: 'trainer' };
const PHASE_MAP = { movilidad: 'mobility', activacion: 'activation', especifica: 'specific' };

function token() {
  return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function listAll(collectionId) {
  const out = [];
  let pageToken;
  do {
    const qs = new URLSearchParams({ pageSize: '300', ...(pageToken ? { pageToken } : {}) });
    const data = await req('GET', `${collectionId}?${qs}`);
    out.push(...(data.documents ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return out;
}

function idOf(doc) {
  return doc.name.split('/').pop();
}

// PATCH that only touches the given top-level or dotted field paths — every other field on
// the doc is left exactly as it is.
async function patchFields(path, fields, maskPaths) {
  const qs = maskPaths.map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
  return req('PATCH', `${path}?${qs}`, { fields });
}

let TOKEN;

async function migrateTrainers(profesores) {
  console.log(`\n1. profesores -> trainers (${profesores.length} docs)`);
  const plan = profesores.map((doc) => {
    const uid = idOf(doc);
    const f = doc.fields ?? {};
    const rol = f.rol?.stringValue;
    const role = ROLE_MAP[rol];
    if (!role) throw new Error(`profesores/${uid}: unknown rol "${rol}"`);
    const fields = {
      name: f.nombre ?? { stringValue: '' },
      lastName: f.apellido ?? { stringValue: '' },
      email: f.mail ?? { stringValue: '' },
      gymId: f.gymId ?? { nullValue: null },
      role: { stringValue: role },
      ...(f.foto ? { photo: f.foto } : {}),
      ...(f.skipFromFilters ? { skipFromFilters: f.skipFromFilters } : {}),
    };
    return { uid, fields };
  });

  for (const { uid, fields } of plan) {
    const label = `${fields.name.stringValue} ${fields.lastName.stringValue} <${fields.email.stringValue}> role=${fields.role.stringValue}`;
    console.log(`   ${APPLY ? 'writing' : '[dry run]'} trainers/${uid}  ${label}`);
    if (APPLY) await req('PATCH', `trainers/${uid}`, { fields });
  }
  return plan.length;
}

async function migrateGyms(gyms) {
  console.log(`\n2. gyms: add name field (${gyms.length} docs)`);
  for (const doc of gyms) {
    const id = idOf(doc);
    const nombre = doc.fields?.nombre;
    if (!nombre) {
      console.log(`   ! gyms/${id} has no nombre field, skipping`);
      continue;
    }
    console.log(`   ${APPLY ? 'writing' : '[dry run]'} gyms/${id}.name = ${JSON.stringify(nombre.stringValue)}`);
    if (APPLY) await patchFields(`gyms/${id}`, { name: nombre }, ['name']);
  }
}

async function migrateRoutines(routines) {
  console.log(`\n3. routines: add mobility/activation/specific warmup keys (${routines.length} docs)`);
  let touched = 0;
  let skipped = 0;
  for (const doc of routines) {
    const id = idOf(doc);
    const warmup = doc.fields?.warmup?.mapValue?.fields;
    if (!warmup) {
      skipped += 1;
      continue;
    }
    const items = warmup.items?.mapValue?.fields ?? {};
    const labels = warmup.labels?.mapValue?.fields ?? {};

    const newItems = {};
    const newLabels = {};
    const maskPaths = [];
    for (const [esKey, enKey] of Object.entries(PHASE_MAP)) {
      newItems[enKey] = items[esKey] ?? { arrayValue: {} };
      newLabels[enKey] = labels[esKey] ?? { stringValue: '' };
      maskPaths.push(`warmup.items.${enKey}`, `warmup.labels.${enKey}`);
    }

    console.log(`   ${APPLY ? 'writing' : '[dry run]'} routines/${id} warmup.items/labels.{mobility,activation,specific}`);
    if (APPLY) {
      await patchFields(
        `routines/${id}`,
        { warmup: { mapValue: { fields: { items: { mapValue: { fields: newItems } }, labels: { mapValue: { fields: newLabels } } } } } },
        maskPaths,
      );
    }
    touched += 1;
  }
  console.log(`   ${touched} routines touched, ${skipped} skipped (no warmup field to translate)`);
}

async function verify(expectedTrainers, gyms, routines) {
  console.log('\n4. verifying');
  const trainers = await listAll('trainers');
  console.log(`   trainers: ${trainers.length} (expected ${expectedTrainers})`);
  if (trainers.length !== expectedTrainers) console.log('   ! MISMATCH');

  const gymDocs = await listAll('gyms');
  const gymsMissingName = gymDocs.filter((d) => !d.fields?.name);
  console.log(`   gyms: ${gymDocs.length}, missing name: ${gymsMissingName.length}`);
  if (gymsMissingName.length) console.log('   ! ' + gymsMissingName.map(idOf).join(', '));

  const routineDocs = await listAll('routines');
  const withWarmup = routineDocs.filter((d) => d.fields?.warmup?.mapValue?.fields);
  const missingMobility = withWarmup.filter(
    (d) => !d.fields.warmup.mapValue.fields.items?.mapValue?.fields?.mobility,
  );
  console.log(
    `   routines with warmup: ${withWarmup.length}, missing translated keys: ${missingMobility.length}`,
  );
  if (missingMobility.length) console.log('   ! ' + missingMobility.map(idOf).join(', '));
}

async function main() {
  TOKEN = token();
  console.log(APPLY ? 'APPLY MODE — this will write to production.' : 'DRY RUN — nothing will be written. Pass --apply to write for real.');

  const [profesores, gyms, routines] = await Promise.all([
    listAll('profesores'),
    listAll('gyms'),
    listAll('routines'),
  ]);

  const here = dirname(fileURLToPath(import.meta.url));
  const backupDir = join(here, `.backup-${Date.now()}`);
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(join(backupDir, 'profesores.json'), JSON.stringify(profesores, null, 2));
  writeFileSync(join(backupDir, 'gyms.json'), JSON.stringify(gyms, null, 2));
  writeFileSync(join(backupDir, 'routines.json'), JSON.stringify(routines, null, 2));
  console.log(`Backed up ${profesores.length} profesores, ${gyms.length} gyms, ${routines.length} routines to ${backupDir}`);

  const count = await migrateTrainers(profesores);
  await migrateGyms(gyms);
  await migrateRoutines(routines);

  if (APPLY) await verify(count, gyms, routines);
  else console.log('\n(dry run — re-run with --apply to write, then verify)');
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
