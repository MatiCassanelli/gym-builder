#!/usr/bin/env node
/**
 * ADDITIVE production data script: links existing routines into plan versions (planId/version).
 *
 * Two phases, both reading routines only (no write happens without --apply):
 *   1. No flags: groups routines that are not yet linked (no `planId`, or a single-version plan of their own) by gymId + normalized student name,
 *      drops single-routine groups, and writes the proposal to scripts/plan-links.json with
 *      `"link": false` on every group. A JSON backup of all routines goes to
 *      scripts/.backup-<timestamp>/ first.
 *   2. --apply: after you set `"link": true` (and optionally prune/reorder `routineIds`) on the
 *      groups you want, patches each routine with updateMask limited to `planId` and `version`.
 *      planId = id of the first routine in the group, version = its 1-based position.
 *      No other field is ever written.
 *
 *   node scripts/link-plan-versions.mjs                       # propose groups (dry run)
 *   node scripts/link-plan-versions.mjs --apply               # writes planId/version for approved groups
 *   node scripts/link-plan-versions.mjs --emulator            # same, against the local emulator
 *
 * --apply is the only flag that writes. Without it the second phase does not run at all.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROJECT = 'gym-builder-mati';
const APPLY = process.argv.includes('--apply');
const EMULATOR = process.argv.includes('--emulator');
const BASE = EMULATOR
  ? `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`
  : `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const here = dirname(fileURLToPath(import.meta.url));
const LINKS_FILE = join(here, 'plan-links.json');

let TOKEN;

const token = () =>
  // The emulator accepts "owner" as an admin token and bypasses security rules.
  EMULATOR ? 'owner' : execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();

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

const idOf = (doc) => doc.name.split('/').pop();

const normalizeName = (name) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(copia\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const summarize = (doc) => {
  const f = doc.fields ?? {};
  return {
    id: idOf(doc),
    gymId: f.gymId?.stringValue ?? '',
    student: f.student?.stringValue ?? '',
    startDate: f.startDate?.stringValue ?? '',
    endDate: f.endDate?.stringValue ?? '',
    createdAt: Number(f.createdAt?.integerValue ?? f.createdAt?.doubleValue ?? 0),
    createdBy: f.createdBy?.mapValue?.fields?.email?.stringValue ?? '',
  };
};

// startDate is an ISO yyyy-mm-dd string, so string comparison orders it correctly.
const byDate = (a, b) => a.startDate.localeCompare(b.startDate) || a.createdAt - b.createdAt;

// A routine is "unlinked" when it has no planId (legacy) or is a single-version plan of its own
// (created by the new app: planId = own id and nobody else shares it). Only those may be linked.
const planIdOf = (doc) => doc.fields?.planId?.stringValue;

const unlinkedChecker = (routines) => {
  const planSizes = new Map();
  for (const doc of routines) {
    const planId = planIdOf(doc);
    if (planId) planSizes.set(planId, (planSizes.get(planId) ?? 0) + 1);
  }
  return (doc) => {
    const planId = planIdOf(doc);
    return !planId || (planId === idOf(doc) && planSizes.get(planId) === 1);
  };
};

function proposeGroups(routines) {
  const buckets = new Map();
  const isUnlinked = unlinkedChecker(routines);
  for (const doc of routines) {
    if (!isUnlinked(doc)) continue;
    const r = summarize(doc);
    const key = `${r.gymId}\u0000${normalizeName(r.student)}`;
    buckets.set(key, [...(buckets.get(key) ?? []), r]);
  }
  return [...buckets.values()]
    .filter((rs) => rs.length > 1)
    .map((rs) => {
      const sorted = rs.sort(byDate);
      return {
        link: false,
        gymId: sorted[0].gymId,
        name: normalizeName(sorted[0].student),
        routineIds: sorted.map((r) => r.id),
        routines: sorted.map(({ id, student, startDate, endDate, createdBy }) => ({
          id,
          student,
          startDate,
          endDate,
          createdBy,
        })),
      };
    });
}

function planPatches(groups, routines) {
  const byId = new Map(routines.map((doc) => [idOf(doc), doc]));
  const isUnlinked = unlinkedChecker(routines);
  const patches = [];
  const seen = new Set();
  for (const group of groups.filter((g) => g.link === true)) {
    const ids = group.routineIds;
    if (!Array.isArray(ids) || ids.length < 2) {
      throw new Error(`group "${group.name}": needs at least 2 routineIds`);
    }
    for (const id of ids) {
      const doc = byId.get(id);
      if (!doc) throw new Error(`group "${group.name}": routines/${id} does not exist`);
      if (!isUnlinked(doc)) throw new Error(`routines/${id} already belongs to a linked plan, refusing to relink`);
      if (seen.has(id)) throw new Error(`routines/${id} appears in more than one approved group`);
      if (doc.fields?.gymId?.stringValue !== byId.get(ids[0]).fields?.gymId?.stringValue) {
        throw new Error(`group "${group.name}": routines from different gyms`);
      }
      seen.add(id);
    }
    ids.forEach((id, i) => patches.push({ id, planId: ids[0], version: i + 1 }));
  }
  return patches;
}

const patchLink = ({ id, planId, version }) =>
  req(
    'PATCH',
    `routines/${id}?updateMask.fieldPaths=planId&updateMask.fieldPaths=version&currentDocument.exists=true`,
    { fields: { planId: { stringValue: planId }, version: { integerValue: String(version) } } },
  );

async function main() {
  TOKEN = token();
  const target = EMULATOR ? 'EMULATOR' : 'PRODUCTION';
  console.log(`Target: ${target}. ${APPLY ? 'APPLY MODE — will write planId/version.' : 'Nothing will be written to Firestore.'}`);

  const routines = await listAll('routines');
  const backupDir = join(here, `.backup-${Date.now()}`);
  mkdirSync(backupDir, { recursive: true });
  writeFileSync(join(backupDir, 'routines.json'), JSON.stringify(routines, null, 2));
  console.log(`Backed up ${routines.length} routines to ${backupDir}`);

  if (!APPLY) {
    const groups = proposeGroups(routines);
    writeFileSync(LINKS_FILE, JSON.stringify(groups, null, 2));
    console.log(`Wrote ${groups.length} proposed groups to ${LINKS_FILE}.`);
    console.log('Set "link": true on the ones to combine, then re-run with --apply.');
    return;
  }

  if (!existsSync(LINKS_FILE)) throw new Error(`${LINKS_FILE} not found; run without --apply first`);
  const patches = planPatches(JSON.parse(readFileSync(LINKS_FILE, 'utf8')), routines);
  for (const p of patches) {
    console.log(`   writing routines/${p.id}  planId=${p.planId} version=${p.version}`);
    await patchLink(p);
  }
  console.log(`Linked ${patches.length} routines.`);
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
