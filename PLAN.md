# PLAN — Versionado de planes

## Objetivo

Hoy cada rutina es un documento suelto: cuando un plan vence y el profesor arma el siguiente,
el listado muestra las dos (VENCIDA + VIGENTE) para el mismo alumno sin relación entre sí.
Se agrega un **versionado**: el plan nuevo se asocia al anterior como una nueva versión, el
listado muestra solo la última, y las anteriores se consultan (solo lectura) desde el detalle.

Restricción dura: 14 profesores en 3 gimnasios lo usan a diario. Todo el cambio es aditivo y
convive con los datos y el flujo actuales.

## Decisiones tomadas (2026-09-29)

| Tema | Decisión |
|---|---|
| Alumno / fechas de la versión actual | Siguen siendo editables. Se confía en que el profesor cree una versión nueva en vez de estirar fechas. Sin cambios de reglas. |
| Pares ya existentes (vencida + vigente) | Script que propone grupos por nombre de alumno; Matías decide grupo por grupo si se combinan. |
| Dueño del plan en los filtros | El profesor que creó la **última** versión. |
| Versiones anteriores | Solo lectura: vista previa + PDF, sin edición. |

## Modelo de datos

Dos campos nuevos en `routines/{id}`:

- `planId: string` — id de la primera versión; compartido por todas las versiones del plan.
- `version: number` — 1, 2, 3…

Documentos sin estos campos (todos los actuales, y los que cree una pestaña con la app vieja
abierta) se leen como `planId = id`, `version = 1` en `normalizeRoutine`. **Sin migración
obligatoria.**

La versión vigente se **calcula** (mayor `version` dentro del `planId`, desempate por
`createdAt`), no se guarda como flag. Consecuencias:
- Borrar la versión vigente hace que la anterior vuelva a aparecer sola en el listado.
- Nunca hay que escribir dos documentos a la vez, así que no hay estado que desincronizar.
- Si dos profesores crean la v3 del mismo plan a la vez, gana la más reciente por `createdAt`;
  con este volumen no justifica una transacción.

`planId`/`version` **no** forman parte de `RoutineInput`: el builder nunca los edita, y
"Copiar" (que parte de `RoutineInput`) sigue creando un plan nuevo e independiente.

## Pasos

1. **Tipos y normalización** (S) — `Routine` suma `planId` y `version`;
   `normalizeRoutine` completa el fallback para documentos legacy.
2. **`src/lib/planVersions.ts`** (S) — funciones puras: `latestVersions(routines)` y
   `versionsOf(routines, planId)` (ordenadas desc).
3. **Servicio** (S) — `createRoutine` recibe un `lineage?: { planId; version }` opcional.
   Sin lineage (plan nuevo) usa `doc(routinesCol)` + `setDoc` para grabar `planId` = su propio
   id y `version: 1`.
4. **Listado** (S) — `RoutinesListPage` aplica `latestVersions` antes de filtrar/contar, así
   los chips por profesor cuentan planes y agrupan por el autor de la última versión.
   `RoutineListItem` muestra un badge `v2`, `v3`… cuando `version > 1`. El modal de eliminar
   avisa, si hay versiones previas, que se borra solo esta versión y la anterior vuelve a
   quedar vigente.
5. **Nueva versión** (M) — ruta `/routines/:id/new-version` que abre el `BuilderPage` con el
   contenido de la versión vigente, mismo alumno, `startDate` = día siguiente al `endDate`
   anterior y `endDate` vacío. Nada se escribe hasta "Guardar" (a diferencia de "Copiar", que
   crea el documento al instante): abandonar el formulario no deja una versión fantasma que
   oculte a la vigente. Al guardar: `createRoutine(draft, gymId, user, { planId, version: max + 1 })`.
   Botón "Nueva versión" en el header del builder de la versión vigente y en la fila del
   listado junto a "Copiar".
6. **Historial y solo lectura** (M) — en el builder de la versión vigente, sección
   "Versiones anteriores" (vN · fechas · autor) con link a `/routines/:id/view`. Esa ruta
   reutiliza `RoutinePrintPreview` + exportar PDF, sin controles de edición. Si alguien
   entra a `/routines/:id/edit` de una versión que no es la vigente, redirige a `/view`.
7. **Script de vinculación** (M) — `scripts/link-plan-versions.mjs`, mismo patrón que
   `migrate-prod-english.mjs` (REST + `gcloud` token, backup JSON previo, dry run por defecto):
   - Sin flags: agrupa las rutinas **sin `planId`** por `gymId` + nombre normalizado
     (minúsculas, sin acentos, sin "(copia)", espacios colapsados), descarta grupos de uno,
     ordena cada grupo por `startDate`/`createdAt` y escribe `scripts/plan-links.json` con
     `"link": false` en cada grupo, más alumno, fechas y autor de cada rutina.
   - Matías revisa el archivo: pone `"link": true` en los que correspondan, y puede quitar o
     reordenar ids (p. ej. dos "Juan" distintos).
   - `--apply`: para cada grupo aprobado, patch con `updateMask` solo de `planId` (id del
     primero) y `version` (posición). No toca ningún otro campo.
   - `--emulator`: apunta al emulador local (`127.0.0.1:8080`) en vez de producción, para el
     dry run del paso 8. El PATCH usa `currentDocument.exists=true` para no crear documentos.
   - `plan-links.json` y el backup van a `.gitignore` (tienen nombres de alumnos).
8. **Verificación** (S) — `npm run build`, `npm run lint`, y en emulador (`npm run seed`
   trae rutinas reales sin los campos nuevos, que es justamente el caso legacy):
   crear v2 sobre una legacy, ver que desaparece la v1 del listado, abrir la v1 en solo
   lectura, exportar PDF, borrar la v2 y ver que vuelve la v1, "Copiar" sigue creando un plan
   aparte, correr el script en dry run contra el emulador.

## Deploy

- Solo **hosting**. No cambian `firestore.rules` ni `firestore.indexes.json` (el filtrado
  por versión es en el cliente, que ya carga todas las rutinas del gimnasio).
- El script corre después del deploy, cuando se quiera; es aditivo y la app vieja ignora
  los campos nuevos.
- Una pestaña vieja abierta: `updateDoc` no borra `planId`/`version`; "Copiar" crea un plan
  legacy (v1 de sí mismo). Ningún caso rompe.

## Qué se deja afuera y por qué

- **Bloquear edición de versiones anteriores en `firestore.rules`**: exigiría guardar un
  `supersededBy` en la versión vieja (escritura en dos documentos) y cambiar reglas en
  producción. Se bloquea solo en la UI; alcanza para el uso real.
- **Bloquear alumno/fechas**: decidido no hacerlo (ver tabla).
- **Entidad "Alumno"**: sería la solución de fondo para vincular sin depender del nombre,
  pero es un cambio de modelo mucho mayor que lo que pide el requerimiento.
- **Vinculación automática por nombre**: descartada; errores de tipeo y homónimos. El
  script solo propone, la decisión es manual.
- **Tests con vitest**: el repo no tiene setup de tests; agregarlo es un cambio aparte.
  `planVersions.ts` queda como funciones puras para que sea trivial testearlo cuando exista.

## Comunicación a los profesores

> Cuando un plan vence (o querés cambiarlo de fondo), entrá al plan y tocá **"Nueva
> versión"** en vez de "Copiar" o "+ Nueva rutina". Se arma con los mismos ejercicios y
> fechas a partir del día siguiente. En el listado vas a ver solo la versión más nueva; las
> anteriores quedan en el detalle del plan, en "Versiones anteriores". Los ajustes de
> ejercicios, series, reps o RIR se siguen haciendo sobre el mismo plan, como hasta ahora.
> "Copiar" queda para usar un plan como base para **otro** alumno.
