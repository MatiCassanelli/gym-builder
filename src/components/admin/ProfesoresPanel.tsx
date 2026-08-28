import { useState } from "react";
import NuevoProfesorModal from "./NuevoProfesorModal";
import {
  deleteProfesor,
  updateProfesorRol,
} from "../../services/profesoresService";
import { ROL_LABELS } from "../../types";
import type { Profesor, Rol } from "../../types";

/**
 * Authority is nested: an admin can do everything a coordinador can, and more. This is the
 * viewer's level, which decides what each row offers them.
 */
export type NivelPermiso = "admin" | "coordinador";

interface ProfesoresPanelProps {
  gymId: string;
  gymNombre: string;
  profesores: Profesor[];
  loading: boolean;
  nivel: NivelPermiso;
  /** Routines authored per trainer, when that count is meaningful in the current scope. */
  rutinasPorProfesor: Map<string, number> | null;
  /** The viewer's own uid, so their own row never offers actions against themselves. */
  currentUid: string;
}

interface Acciones {
  ascender: boolean;
  degradar: boolean;
  quitar: boolean;
}

/** A pending role change, held while its confirmation modal is open. */
interface CambioRol {
  profesor: Profesor;
  rol: Rol;
}

interface TextosCambioRol {
  titulo: string;
  cuerpo: string;
  /** Amber callout — only for the step the viewer can't walk back themselves. */
  aviso: string | null;
  boton: string;
  botonCargando: string;
}

/**
 * Copy for the confirmation modal, per direction and per viewer.
 *
 * A promotion is worth confirming mostly because of who is doing it: for a coordinador it is
 * a one-way door, since the rules only let them move a profesor up, never back down. Saying
 * so before the click is the whole point of the modal — afterwards the buttons are simply
 * gone from that row, with no explanation of why.
 */
function textosCambioRol(
  cambio: CambioRol,
  nivel: NivelPermiso,
  gymNombre: string,
): TextosCambioRol {
  const nombre = nombreCompleto(cambio.profesor);

  if (cambio.rol === "coordinador") {
    const cuerpo =
      `Como coordinador, ${nombre} va a poder editar el nombre y el logo de ` +
      `${gymNombre}, dar de alta y quitar profesores, y ascender a otros a coordinador.`;
    const aviso =
      nivel === "coordinador"
        ? "Esto no tiene vuelta atrás para vos: una vez que sea coordinador no vas a " +
          "poder bajarlo a profesor ni quitarlo del gimnasio. Sólo el administrador puede."
        : null;
    return {
      titulo: `Ascender a ${nombre} a coordinador`,
      cuerpo,
      aviso,
      boton: "Ascender a coordinador",
      botonCargando: "Ascendiendo…",
    };
  }

  return {
    titulo: `Pasar a ${nombre} a profesor`,
    cuerpo:
      `${nombre} deja de manejar ${gymNombre}: no va a poder editar el nombre ni el ` +
      "logo, ni dar de alta o quitar profesores. Sigue viendo y creando rutinas como " +
      "cualquier profesor del gimnasio.",
    aviso: null,
    boton: "Pasar a profesor",
    botonCargando: "Guardando…",
  };
}

function nombreCompleto(p: Profesor): string {
  return `${p.nombre} ${p.apellido}`.trim() || p.mail;
}

// null when routine counts aren't in scope; 0 rather than null for someone with none yet.
function rutinasDe(
  porProfesor: Map<string, number> | null,
  uid: string,
): number | null {
  if (!porProfesor) return null;
  return porProfesor.get(uid) ?? 0;
}

/**
 * What the viewer may do to one row.
 *
 * A coordinador's reach stops at rows that are `rol: 'profesor'`: they can promote or remove
 * a profesor and can do nothing at all to a fellow coordinador. That asymmetry is the point —
 * promotion is a one-way street, so nobody can take sole control of a gym by demoting or
 * clearing out the people who share it with them. Only an admin can demote.
 *
 * Nobody ever acts on their own row. This mirrors the profesores rules in firestore.rules;
 * the rules are what actually enforces it, and this only decides which buttons to draw.
 */
function accionesPara(
  nivel: NivelPermiso,
  fila: Profesor,
  currentUid: string,
): Acciones {
  if (fila.id === currentUid)
    return { ascender: false, degradar: false, quitar: false };
  if (nivel === "admin") {
    return {
      ascender: fila.rol === "profesor",
      degradar: fila.rol === "coordinador",
      quitar: true,
    };
  }
  const esProfesor = fila.rol === "profesor";
  return { ascender: esProfesor, degradar: false, quitar: esProfesor };
}

function ProfesorRow({
  profesor,
  rutinas,
  acciones,
  onRol,
  onRequestDelete,
  esVos,
}: {
  profesor: Profesor;
  rutinas: number | null;
  acciones: Acciones;
  onRol: (p: Profesor, rol: Rol) => void;
  onRequestDelete: (p: Profesor) => void;
  esVos: boolean;
}) {
  return (
    <div className="flex items-center gap-4 bg-white border border-stone-200 rounded-[13px] px-[18px] py-3.5">
      <div className="w-[38px] h-[38px] rounded-full bg-stone-200 overflow-hidden flex items-center justify-center font-bold text-[13px] text-stone-700 shrink-0">
        {profesor.foto ? (
          <img
            src={profesor.foto}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          (profesor.nombre[0] ?? profesor.mail[0] ?? "?").toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <div className="font-bold text-[14.5px] truncate">
            {nombreCompleto(profesor)}
          </div>
          {profesor.rol === "coordinador" ? (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-stone-900 text-white text-[11px] font-bold">
              {ROL_LABELS.coordinador}
            </span>
          ) : null}
          {esVos ? (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-[11px] font-bold">
              vos
            </span>
          ) : null}
        </div>
        <div className="text-[12.5px] text-stone-500 truncate">
          {profesor.mail}
          {rutinas === null
            ? ""
            : ` · ${rutinas} ${rutinas === 1 ? "rutina" : "rutinas"}`}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {acciones.ascender ? (
          <button
            type="button"
            onClick={() => onRol(profesor, "coordinador")}
            className="text-[12.5px] font-semibold text-stone-700 cursor-pointer bg-transparent border-none p-0 whitespace-nowrap"
          >
            Ascender a coordinador
          </button>
        ) : null}
        {acciones.degradar ? (
          <button
            type="button"
            onClick={() => onRol(profesor, "profesor")}
            className="text-[12.5px] font-semibold text-stone-700 cursor-pointer bg-transparent border-none p-0 whitespace-nowrap"
          >
            Pasar a profesor
          </button>
        ) : null}
        {acciones.quitar ? (
          <button
            type="button"
            onClick={() => onRequestDelete(profesor)}
            className="text-[12.5px] font-semibold text-red-700 cursor-pointer bg-transparent border-none p-0"
          >
            Quitar
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CambioRolModal({
  textos,
  guardando,
  error,
  onCancel,
  onConfirm,
}: {
  textos: TextosCambioRol;
  guardando: boolean;
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
        <div className="text-[17px] font-extrabold">{textos.titulo}</div>
        <div className="text-sm text-stone-600">{textos.cuerpo}</div>
        {textos.aviso ? (
          <div className="px-3.5 py-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-[13px] font-semibold">
            {textos.aviso}
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
            disabled={guardando}
            onClick={onConfirm}
            className="flex-1 py-2.75 rounded-lg bg-red-600 text-white font-semibold text-sm cursor-pointer border-none disabled:opacity-60"
          >
            {guardando ? textos.botonCargando : textos.boton}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfesoresPanel({
  gymId,
  gymNombre,
  profesores,
  loading,
  nivel,
  rutinasPorProfesor,
  currentUid,
}: ProfesoresPanelProps) {
  const [adding, setAdding] = useState(false);
  const [toRemove, setToRemove] = useState<Profesor | null>(null);
  const [removing, setRemoving] = useState(false);
  const [cambioRol, setCambioRol] = useState<CambioRol | null>(null);
  const [cambiandoRol, setCambiandoRol] = useState(false);
  const [rolError, setRolError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmRol() {
    if (!cambioRol) return;
    setCambiandoRol(true);
    setRolError(null);
    try {
      await updateProfesorRol(cambioRol.profesor.id, cambioRol.rol);
      setCambioRol(null);
    } catch {
      setRolError(
        `No pudimos cambiarle el rol a ${nombreCompleto(cambioRol.profesor)}.`,
      );
    } finally {
      setCambiandoRol(false);
    }
  }

  async function handleRemove() {
    if (!toRemove) return;
    setRemoving(true);
    setError(null);
    try {
      await deleteProfesor(toRemove.id);
      setToRemove(null);
    } catch {
      setError("No pudimos quitar a esta persona. Probá de nuevo.");
    } finally {
      setRemoving(false);
    }
  }

  // Coordinadores first, then the rest alphabetically — whoever runs the gym leads its list.
  const ordenados = [...profesores].sort((a, b) => {
    if (a.rol !== b.rol) return a.rol === "coordinador" ? -1 : 1;
    return nombreCompleto(a).localeCompare(nombreCompleto(b));
  });

  return (
    <section>
      <div className="flex items-end justify-between mb-3.5 gap-4 flex-wrap">
        <div>
          <div className="text-[17px] font-extrabold">Profesores</div>
          <div className="text-stone-500 text-[13px] mt-0.5">
            Sólo ellos ven las rutinas de {gymNombre}. Un coordinador además
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
      ) : ordenados.length === 0 ? (
        <div className="py-10 text-center text-stone-500 text-sm bg-white border border-stone-200 rounded-[13px]">
          Todavía no hay profesores en este gimnasio.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {ordenados.map((p) => (
            <ProfesorRow
              key={p.id}
              profesor={p}
              esVos={p.id === currentUid}
              rutinas={rutinasDe(rutinasPorProfesor, p.id)}
              acciones={accionesPara(nivel, p, currentUid)}
              onRol={(profesor, rol) => {
                setRolError(null);
                setCambioRol({ profesor, rol });
              }}
              onRequestDelete={setToRemove}
            />
          ))}
        </div>
      )}

      {nivel === "coordinador" ? (
        <div className="text-[12px] text-stone-400 mt-2.5">
          Podés ascender a un profesor a coordinador, pero no dar marcha atrás:
          sólo el administrador puede volver a bajar a alguien a profesor.
        </div>
      ) : null}

      {error ? (
        <div className="text-[13px] font-medium text-red-700 mt-2">{error}</div>
      ) : null}

      {adding ? (
        <NuevoProfesorModal
          gymId={gymId}
          gymNombre={gymNombre}
          onClose={() => setAdding(false)}
        />
      ) : null}

      {cambioRol ? (
        <CambioRolModal
          textos={textosCambioRol(cambioRol, nivel, gymNombre)}
          guardando={cambiandoRol}
          error={rolError}
          onCancel={() => setCambioRol(null)}
          onConfirm={() => void handleConfirmRol()}
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
              Quitar a {nombreCompleto(toRemove)}
            </div>
            <div className="text-sm text-stone-600">
              Pierde el acceso a la app en cuanto recargue. Las rutinas que creó
              siguen en {gymNombre} a su nombre.
              <br />
              {nivel === "admin" && (
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
