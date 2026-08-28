import { useState } from 'react';
import { Link } from 'react-router-dom';
import GymMark from '../layout/GymMark';
import NuevoGymModal from './NuevoGymModal';
import { useAppData } from '../../context/AppDataContext';
import { useProfesores } from '../../hooks/useProfesores';
import { ROL_LABELS } from '../../types';
import type { Profesor } from '../../types';

// A gym starts with one coordinador but its coordinadores can promote others, so this
// summarises rather than naming a single person.
function resumenCoordinadores(profesores: Profesor[]): string {
  const coords = profesores.filter((p) => p.rol === 'coordinador');
  if (coords.length === 0) return 'Sin coordinador asignado';
  if (coords.length === 1) {
    return `${ROL_LABELS.coordinador}: ${coords[0].nombre} ${coords[0].apellido}`.trim();
  }
  return `${coords.length} coordinadores`;
}

export default function GymsAdminPage() {
  const { gyms, gymsLoading, routines, activeGymId } = useAppData();
  // Every profesor across every gym, so each card can show its own headcount and
  // coordinador without one query per gym.
  const { profesores } = useProfesores(true, null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex-1 p-8 max-w-[1180px] w-full mx-auto">
      <div className="flex items-end justify-between mb-[22px] gap-4 flex-wrap">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">Gimnasios</div>
          <div className="text-stone-500 text-sm mt-1">
            Cada gimnasio es independiente: sus profesores y rutinas no se ven desde ningún otro.
          </div>
          <div className="text-stone-400 text-[12.5px] mt-0.5">
            Vos creás el gimnasio y su coordinador; el coordinador se encarga de sus profesores.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="bg-red-600 text-white font-semibold text-sm px-[18px] py-2.75 rounded-lg cursor-pointer whitespace-nowrap border-none"
        >
          + Nuevo gimnasio
        </button>
      </div>

      {gymsLoading ? (
        <div className="py-16 text-center text-stone-500 text-sm">Cargando…</div>
      ) : gyms.length === 0 ? (
        <div className="py-16 text-center text-stone-500 text-sm">
          Todavía no hay gimnasios cargados.
        </div>
      ) : (
        <div
          className="grid gap-3.5"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
        >
          {gyms.map((gym) => {
            const profes = profesores.filter((p) => p.gymId === gym.id);
            // `routines` follows the admin's active scope, so a per-gym count is only
            // truthful in the "todos los gimnasios" view — omitted otherwise rather than
            // rendered as a confident zero.
            const rutinas =
              activeGymId === null ? routines.filter((r) => r.gymId === gym.id).length : null;

            return (
              <Link
                key={gym.id}
                to={`/admin/gimnasios/${gym.id}`}
                className="flex items-center gap-4 bg-white border border-stone-200 rounded-[13px] px-[18px] py-4 no-underline text-inherit"
              >
                <GymMark
                  nombre={gym.nombre}
                  logo={gym.logo ?? null}
                  size={48}
                  rounded="rounded-xl"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15px] truncate">{gym.nombre}</div>
                  <div className="text-[12.5px] text-stone-500 mt-0.5">
                    {profes.length} {profes.length === 1 ? 'profesor' : 'profesores'}
                    {rutinas === null
                      ? ''
                      : ` · ${rutinas} ${rutinas === 1 ? 'rutina' : 'rutinas'}`}
                  </div>
                  <div className="text-[12.5px] text-stone-500 mt-0.5 truncate">
                    {resumenCoordinadores(profes)}
                  </div>
                </div>
                <div className="text-stone-400 text-lg shrink-0">&gt;</div>
              </Link>
            );
          })}
        </div>
      )}

      {creating ? <NuevoGymModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
