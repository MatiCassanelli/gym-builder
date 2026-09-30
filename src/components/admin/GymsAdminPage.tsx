import { useState } from 'react';
import { Link } from 'react-router-dom';
import GymMark from '../layout/GymMark';
import NewGymModal from './NewGymModal';
import { useAppData } from '../../context/AppDataContext';
import { useTrainers } from '../../hooks/useTrainers';
import { ROLE_LABELS } from '../../types';
import type { Trainer } from '../../types';
import { ChevronRightIcon } from '../layout/icons';

// A gym starts with one coordinator but its coordinators can promote others, so this
// summarises rather than naming a single person.
function coordinatorsSummary(trainers: Trainer[]): string {
  const coords = trainers.filter((p) => p.role === 'coordinator');
  if (coords.length === 0) return 'Sin coordinador asignado';
  if (coords.length === 1) {
    return `${ROLE_LABELS.coordinator}: ${coords[0].name} ${coords[0].lastName}`.trim();
  }
  return `${coords.length} coordinadores`;
}

export default function GymsAdminPage() {
  const { gyms, gymsLoading, routines, activeGymId } = useAppData();
  // Every trainer across every gym, so each card can show its own headcount and
  // coordinator without one query per gym.
  const { trainers } = useTrainers(true, null);
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
            const gymTrainers = trainers.filter((p) => p.gymId === gym.id);
            // `routines` follows the admin's active scope, so a per-gym count is only
            // truthful in the "every gym" view — omitted otherwise rather than
            // rendered as a confident zero.
            const gymRoutinesCount =
              activeGymId === null ? routines.filter((r) => r.gymId === gym.id).length : null;

            return (
              <Link
                key={gym.id}
                to={`/admin/gyms/${gym.id}`}
                className="flex items-center gap-4 bg-white border border-stone-200 rounded-[13px] px-[18px] py-4 no-underline text-inherit"
              >
                <GymMark
                  name={gym.name}
                  logo={gym.logo ?? null}
                  size={48}
                  rounded="rounded-xl"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15px] truncate">{gym.name}</div>
                  <div className="text-[12.5px] text-stone-500 mt-0.5">
                    {gymTrainers.length} {gymTrainers.length === 1 ? 'profesor' : 'profesores'}
                    {gymRoutinesCount === null
                      ? ''
                      : ` · ${gymRoutinesCount} ${gymRoutinesCount === 1 ? 'rutina' : 'rutinas'}`}
                  </div>
                  <div className="text-[12.5px] text-stone-500 mt-0.5 truncate">
                    {coordinatorsSummary(gymTrainers)}
                  </div>
                </div>
                <ChevronRightIcon className="text-stone-400 text-lg shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      {creating ? <NewGymModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
