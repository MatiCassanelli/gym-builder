import { useState } from "react";
import NewTrainerModal from "./NewTrainerModal";
import {
  deleteTrainer,
  updateTrainerRole,
} from "../../services/trainersService";
import { ROLE_LABELS } from "../../types";
import type { Trainer, Role } from "../../types";

/**
 * Authority is nested: an admin can do everything a coordinator can, and more. This is the
 * viewer's level, which decides what each row offers them.
 */
export type PermissionLevel = "admin" | "coordinator";

interface TrainersPanelProps {
  gymId: string;
  gymName: string;
  trainers: Trainer[];
  loading: boolean;
  level: PermissionLevel;
  /** Routines authored per trainer, when that count is meaningful in the current scope. */
  routinesByTrainer: Map<string, number> | null;
  /** The viewer's own uid, so their own row never offers actions against themselves. */
  currentUid: string;
}

interface Actions {
  promote: boolean;
  demote: boolean;
  remove: boolean;
}

/** A pending role change, held while its confirmation modal is open. */
interface RoleChange {
  trainer: Trainer;
  role: Role;
}

interface RoleChangeTexts {
  title: string;
  body: string;
  /** Amber callout — only for the step the viewer can't walk back themselves. */
  warning: string | null;
  button: string;
  buttonLoading: string;
}

/**
 * Copy for the confirmation modal, per direction and per viewer.
 *
 * A promotion is worth confirming mostly because of who is doing it: for a coordinator it is
 * a one-way door, since the rules only let them move a trainer up, never back down. Saying
 * so before the click is the whole point of the modal — afterwards the buttons are simply
 * gone from that row, with no explanation of why.
 */
function roleChangeTexts(
  change: RoleChange,
  level: PermissionLevel,
  gymName: string,
): RoleChangeTexts {
  const name = fullName(change.trainer);

  if (change.role === "coordinator") {
    const body =
      `Como coordinador, ${name} va a poder editar el nombre y el logo de ` +
      `${gymName}, dar de alta y quitar profesores, y ascender a otros a coordinador.`;
    const warning =
      level === "coordinator"
        ? "Esto no tiene vuelta atrás para vos: una vez que sea coordinador no vas a " +
          "poder bajarlo a profesor ni quitarlo del gimnasio. Sólo el administrador puede."
        : null;
    return {
      title: `Ascender a ${name} a coordinador`,
      body,
      warning,
      button: "Ascender a coordinador",
      buttonLoading: "Ascendiendo…",
    };
  }

  return {
    title: `Pasar a ${name} a profesor`,
    body:
      `${name} deja de manejar ${gymName}: no va a poder editar el nombre ni el ` +
      "logo, ni dar de alta o quitar profesores. Sigue viendo y creando rutinas como " +
      "cualquier profesor del gimnasio.",
    warning: null,
    button: "Pasar a profesor",
    buttonLoading: "Guardando…",
  };
}

function fullName(p: Trainer): string {
  return `${p.name} ${p.lastName}`.trim() || p.email;
}

// null when routine counts aren't in scope; 0 rather than null for someone with none yet.
function routinesOf(
  byTrainer: Map<string, number> | null,
  uid: string,
): number | null {
  if (!byTrainer) return null;
  return byTrainer.get(uid) ?? 0;
}

/**
 * What the viewer may do to one row.
 *
 * A coordinator's reach stops at rows that are `role: 'trainer'`: they can promote or remove
 * a trainer and can do nothing at all to a fellow coordinator. That asymmetry is the point —
 * promotion is a one-way street, so nobody can take sole control of a gym by demoting or
 * clearing out the people who share it with them. Only an admin can demote.
 *
 * Nobody ever acts on their own row. This mirrors the trainers rules in firestore.rules;
 * the rules are what actually enforces it, and this only decides which buttons to draw.
 */
function actionsFor(
  level: PermissionLevel,
  row: Trainer,
  currentUid: string,
): Actions {
  if (row.id === currentUid)
    return { promote: false, demote: false, remove: false };
  if (level === "admin") {
    return {
      promote: row.role === "trainer",
      demote: row.role === "coordinator",
      remove: true,
    };
  }
  const isTrainer = row.role === "trainer";
  return { promote: isTrainer, demote: false, remove: isTrainer };
}

function TrainerRow({
  trainer,
  routines,
  actions,
  onRole,
  onRequestDelete,
  isYou,
}: {
  trainer: Trainer;
  routines: number | null;
  actions: Actions;
  onRole: (p: Trainer, role: Role) => void;
  onRequestDelete: (p: Trainer) => void;
  isYou: boolean;
}) {
  return (
    <div className="flex items-center gap-4 bg-white border border-stone-200 rounded-[13px] px-[18px] py-3.5">
      <div className="w-[38px] h-[38px] rounded-full bg-stone-200 overflow-hidden flex items-center justify-center font-bold text-[13px] text-stone-700 shrink-0">
        {trainer.photo ? (
          <img
            src={trainer.photo}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          (trainer.name[0] ?? trainer.email[0] ?? "?").toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <div className="font-bold text-[14.5px] truncate">
            {fullName(trainer)}
          </div>
          {trainer.role === "coordinator" ? (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-stone-900 text-white text-[11px] font-bold">
              {ROLE_LABELS.coordinator}
            </span>
          ) : null}
          {isYou ? (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-[11px] font-bold">
              vos
            </span>
          ) : null}
        </div>
        <div className="text-[12.5px] text-stone-500 truncate">
          {trainer.email}
          {routines === null
            ? ""
            : ` · ${routines} ${routines === 1 ? "rutina" : "rutinas"}`}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {actions.promote ? (
          <button
            type="button"
            onClick={() => onRole(trainer, "coordinator")}
            className="text-[12.5px] font-semibold text-stone-700 cursor-pointer bg-transparent border-none p-0 whitespace-nowrap"
          >
            Ascender a coordinador
          </button>
        ) : null}
        {actions.demote ? (
          <button
            type="button"
            onClick={() => onRole(trainer, "trainer")}
            className="text-[12.5px] font-semibold text-stone-700 cursor-pointer bg-transparent border-none p-0 whitespace-nowrap"
          >
            Pasar a profesor
          </button>
        ) : null}
        {actions.remove ? (
          <button
            type="button"
            onClick={() => onRequestDelete(trainer)}
            className="text-[12.5px] font-semibold text-red-700 cursor-pointer bg-transparent border-none p-0"
          >
            Quitar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RoleChangeModal({
  texts,
  saving,
  error,
  onCancel,
  onConfirm,
}: {
  texts: RoleChangeTexts;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-[rgba(20,15,10,0.45)] flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-[440px] max-w-[92vw] p-[26px] flex flex-col gap-3.5"
      >
        <div className="text-[17px] font-extrabold">{texts.title}</div>
        <div className="text-sm text-stone-600">{texts.body}</div>
        {texts.warning ? (
          <div className="px-3.5 py-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-[13px] font-semibold">
            {texts.warning}
          </div>
        ) : null}
        {error ? (
          <div className="text-[13px] font-medium text-red-700">{error}</div>
        ) : null}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.75 rounded-lg border border-stone-300 font-semibold text-sm cursor-pointer bg-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onConfirm}
            className="flex-1 py-2.75 rounded-lg bg-red-600 text-white font-semibold text-sm cursor-pointer border-none disabled:opacity-60"
          >
            {saving ? texts.buttonLoading : texts.button}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TrainersPanel({
  gymId,
  gymName,
  trainers,
  loading,
  level,
  routinesByTrainer,
  currentUid,
}: TrainersPanelProps) {
  const [adding, setAdding] = useState(false);
  const [toRemove, setToRemove] = useState<Trainer | null>(null);
  const [removing, setRemoving] = useState(false);
  const [roleChange, setRoleChange] = useState<RoleChange | null>(null);
  const [changingRole, setChangingRole] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmRole() {
    if (!roleChange) return;
    setChangingRole(true);
    setRoleError(null);
    try {
      await updateTrainerRole(roleChange.trainer.id, roleChange.role);
      setRoleChange(null);
    } catch {
      setRoleError(
        `No pudimos cambiarle el rol a ${fullName(roleChange.trainer)}.`,
      );
    } finally {
      setChangingRole(false);
    }
  }

  async function handleRemove() {
    if (!toRemove) return;
    setRemoving(true);
    setError(null);
    try {
      await deleteTrainer(toRemove.id);
      setToRemove(null);
    } catch {
      setError("No pudimos quitar a esta persona. Probá de nuevo.");
    } finally {
      setRemoving(false);
    }
  }

  // Coordinators first, then the rest alphabetically — whoever runs the gym leads its list.
  const sorted = [...trainers].sort((a, b) => {
    if (a.role !== b.role) return a.role === "coordinator" ? -1 : 1;
    return fullName(a).localeCompare(fullName(b));
  });

  return (
    <section>
      <div className="flex items-end justify-between mb-3.5 gap-4 flex-wrap">
        <div>
          <div className="text-[17px] font-extrabold">Profesores</div>
          <div className="text-stone-500 text-[13px] mt-0.5">
            Sólo ellos ven las rutinas de {gymName}. Un coordinador además
            maneja el nombre, el logo y el equipo.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="bg-red-600 text-white font-semibold text-sm px-[18px] py-2.5 rounded-lg cursor-pointer whitespace-nowrap border-none"
        >
          + Nuevo profesor
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-stone-500 text-sm">
          Cargando…
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-10 text-center text-stone-500 text-sm bg-white border border-stone-200 rounded-[13px]">
          Todavía no hay profesores en este gimnasio.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((p) => (
            <TrainerRow
              key={p.id}
              trainer={p}
              isYou={p.id === currentUid}
              routines={routinesOf(routinesByTrainer, p.id)}
              actions={actionsFor(level, p, currentUid)}
              onRole={(trainer, role) => {
                setRoleError(null);
                setRoleChange({ trainer, role });
              }}
              onRequestDelete={setToRemove}
            />
          ))}
        </div>
      )}

      {level === "coordinator" ? (
        <div className="text-[12px] text-stone-400 mt-2.5">
          Podés ascender a un profesor a coordinador, pero no dar marcha atrás:
          sólo el administrador puede volver a bajar a alguien a profesor.
        </div>
      ) : null}

      {error ? (
        <div className="text-[13px] font-medium text-red-700 mt-2">{error}</div>
      ) : null}

      {adding ? (
        <NewTrainerModal
          gymId={gymId}
          gymName={gymName}
          onClose={() => setAdding(false)}
        />
      ) : null}

      {roleChange ? (
        <RoleChangeModal
          texts={roleChangeTexts(roleChange, level, gymName)}
          saving={changingRole}
          error={roleError}
          onCancel={() => setRoleChange(null)}
          onConfirm={() => void handleConfirmRole()}
        />
      ) : null}

      {toRemove ? (
        <div
          className="fixed inset-0 bg-[rgba(20,15,10,0.45)] flex items-center justify-center z-50"
          onClick={() => setToRemove(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-[420px] max-w-[92vw] p-[26px] flex flex-col gap-3.5"
          >
            <div className="text-[17px] font-extrabold">
              Quitar a {fullName(toRemove)}
            </div>
            <div className="text-sm text-stone-600">
              Pierde el acceso a la app en cuanto recargue. Las rutinas que creó
              siguen en {gymName} a su nombre.
              <br />
              {level === "admin" && (
                <span className="text-stone-500">
                  Su cuenta de Firebase Auth sigue existiendo pero ya no puede
                  ver nada. Si más adelante vuelve, hay que borrarla desde la
                  consola de Firebase antes de poder darlo de alta otra vez con
                  el mismo email.
                </span>
              )}
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setToRemove(null)}
                className="flex-1 py-2.75 rounded-lg border border-stone-300 font-semibold text-sm cursor-pointer bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={() => void handleRemove()}
                className="flex-1 py-2.75 rounded-lg bg-red-600 text-white font-semibold text-sm cursor-pointer border-none disabled:opacity-60"
              >
                {removing ? "Quitando…" : "Quitar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
