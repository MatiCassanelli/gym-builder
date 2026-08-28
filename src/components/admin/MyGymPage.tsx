import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import GymForm from './GymForm';
import GymMark from '../layout/GymMark';
import TrainersPanel from './TrainersPanel';
import { useAppData } from '../../context/AppDataContext';
import { updateGym } from '../../services/gymsService';
import type { GymInput } from '../../types';

/**
 * The coordinator's control panel for their own gym: its name and logo, and the trainers who
 * work there. Staffing lives here because the person running the gym is the one who knows
 * who belongs in it. They can promote a trainer to share the job with them, but never
 * demote or remove a fellow coordinator, and never delete the gym — those stay the admin's.
 * There is no way to reach any other gym from this page.
 */
export default function MyGymPage() {
  const { myTrainer, gyms, gymsLoading, trainers, routines, currentUser } = useAppData();

  const routinesByTrainer = useMemo(() => {
    const counts = new Map<string, number>();
    routines.forEach((r) => {
      counts.set(r.createdBy.uid, (counts.get(r.createdBy.uid) ?? 0) + 1);
    });
    return counts;
  }, [routines]);

  if (myTrainer.role !== 'coordinator') return <Navigate to="/" replace />;
  if (gymsLoading) {
    return <div className="flex-1 p-8 text-center text-sm text-stone-500">Cargando…</div>;
  }

  const gym = gyms.find((g) => g.id === myTrainer.gymId);
  if (!gym) {
    return (
      <div className="flex-1 p-8 max-w-[560px] w-full mx-auto text-sm text-stone-500">
        No pudimos cargar tu gimnasio.
      </div>
    );
  }

  async function handleSave(input: GymInput) {
    await updateGym(gym!.id, input);
  }

  return (
    <div className="flex-1 p-8 max-w-[720px] w-full mx-auto">
      <div className="flex items-center gap-4 mb-7">
        <GymMark name={gym.name} logo={gym.logo ?? null} size={56} rounded="rounded-xl" />
        <div>
          <div className="text-2xl font-extrabold tracking-tight">Mi gimnasio</div>
          <div className="text-stone-500 text-sm mt-0.5">
            Manejá los datos de {gym.name} y a tu equipo de profesores.
          </div>
        </div>
      </div>

      <section className="bg-white border border-stone-200 rounded-2xl p-[26px] mb-6">
        <div className="text-[17px] font-extrabold mb-1.5">Datos del gimnasio</div>
        <div className="text-stone-500 text-[13px] mb-4">
          El nombre y el logo salen en la app y en el PDF de cada rutina.
        </div>
        <GymForm key={gym.id} initialName={gym.name} initialLogo={gym.logo} onSave={handleSave} />
      </section>

      <TrainersPanel
        gymId={gym.id}
        gymName={gym.name}
        trainers={trainers}
        loading={false}
        level="coordinator"
        routinesByTrainer={routinesByTrainer}
        currentUid={currentUser.uid}
      />
    </div>
  );
}
