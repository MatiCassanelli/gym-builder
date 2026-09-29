import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import GymForm from './GymForm';
import GymMark from '../layout/GymMark';
import TrainersPanel from './TrainersPanel';
import { useAppData } from '../../context/AppDataContext';
import { useTrainers } from '../../hooks/useTrainers';
import { deleteGymWithTrainers, updateGym } from '../../services/gymsService';
import type { GymInput } from '../../types';

/**
 * The admin's view of one gym. Being a superuser, they get everything a coordinator has here
 * — name, logo and roster, including demoting a coordinator, which no coordinator can do —
 * plus the one power that's theirs alone: deleting the gym.
 */
export default function GymDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { gyms, gymsLoading, routines, activeGymId, currentUser } = useAppData();
  const { trainers, loading: trainersLoading } = useTrainers(!!id, id ?? null);
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const gym = gyms.find((g) => g.id === id);

  // Routines only load for the admin's active scope, so per-trainer counts are shown when
  // this gym is in view (or when everything is) and omitted rather than faked otherwise.
  const visibleRoutines = activeGymId === null || activeGymId === id;
  const gymRoutines = useMemo(
    () => routines.filter((r) => r.gymId === id),
    [routines, id],
  );
  const routinesByTrainer = useMemo(() => {
    if (!visibleRoutines) return null;
    const counts = new Map<string, number>();
    gymRoutines.forEach((r) => {
      counts.set(r.createdBy.uid, (counts.get(r.createdBy.uid) ?? 0) + 1);
    });
    return counts;
  }, [gymRoutines, visibleRoutines]);

  if (gymsLoading) {
    return <div className="flex-1 p-8 text-center text-sm text-stone-500">Cargando…</div>;
  }
  if (!gym || !id) {
    return (
      <div className="flex-1 p-8 max-w-[720px] w-full mx-auto text-sm text-stone-500">
        Ese gimnasio ya no existe. <Link to="/admin">Volver a la lista</Link>.
      </div>
    );
  }

  async function handleSaveGym(input: GymInput) {
    await updateGym(id!, input);
  }

  async function handleDelete() {
    setDeleteError(null);
    setRemoving(true);
    try {
      await deleteGymWithTrainers(id!, trainers.map((p) => p.id));
      navigate('/admin');
    } catch {
      setDeleteError('No pudimos eliminar el gimnasio. Probá de nuevo.');
      setRemoving(false);
    }
  }

  const coordinators = trainers.filter((p) => p.role === 'coordinator');

  return (
    <div className="flex-1 p-8 max-w-[860px] w-full mx-auto">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-stone-500 no-underline mb-4"
      >
        <span className="text-base">&lt;</span> Gimnasios
      </Link>

      <div className="flex items-center gap-4 mb-2">
        <GymMark name={gym.name} logo={gym.logo ?? null} size={56} rounded="rounded-xl" />
        <div>
          <div className="text-2xl font-extrabold tracking-tight">{gym.name}</div>
          <div className="text-stone-500 text-sm mt-0.5">
            {trainers.length} {trainers.length === 1 ? 'persona' : 'personas'}
            {visibleRoutines
              ? ` · ${gymRoutines.length} ${gymRoutines.length === 1 ? 'rutina' : 'rutinas'}`
              : ''}
          </div>
        </div>
      </div>

      <div className="text-stone-400 text-[12.5px] mb-7">
        El día a día lo manejan sus coordinadores
        {coordinators.length === 1
          ? ` (${coordinators[0].name} ${coordinators[0].lastName})`.trimEnd()
          : ''}
        . Como administrador podés hacer todo lo que ellos hacen, además de bajarlos a
        profesor y eliminar el gimnasio.
      </div>

      <section className="bg-white border border-stone-200 rounded-2xl p-[26px] mb-6">
        <div className="text-[17px] font-extrabold mb-4">Datos del gimnasio</div>
        <GymForm
          key={gym.id}
          initialName={gym.name}
          initialLogo={gym.logo}
          onSave={handleSaveGym}
        />
      </section>

      <div className="mb-6">
        <TrainersPanel
          gymId={gym.id}
          gymName={gym.name}
          trainers={trainers}
          loading={trainersLoading}
          level="admin"
          routinesByTrainer={routinesByTrainer}
          currentUid={currentUser.uid}
        />
      </div>

      <section className="bg-white border border-red-200 rounded-2xl p-[26px]">
        <div className="text-[17px] font-extrabold mb-1.5">Eliminar gimnasio</div>
        <div className="text-[13px] text-stone-500 mb-4">
          Se borra el gimnasio y el acceso de sus {trainers.length}{' '}
          {trainers.length === 1 ? 'integrante' : 'integrantes'}, coordinadores incluidos. Las
          rutinas no se borran, pero dejan de ser accesibles desde la app.
        </div>
        <button
          type="button"
          onClick={() => {
            setConfirmName('');
            setDeleteError(null);
            setDeleting(true);
          }}
          className="py-2.5 px-[18px] rounded-lg border border-red-300 text-red-700 font-semibold text-sm cursor-pointer bg-white"
        >
          Eliminar {gym.name}
        </button>
      </section>

      {deleting ? (
        <div
          className="fixed inset-0 bg-[rgba(20,15,10,0.45)] flex items-center justify-center z-50"
          onClick={() => setDeleting(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-[440px] max-w-[92vw] p-[26px] flex flex-col gap-3.5"
          >
            <div className="text-[17px] font-extrabold">Eliminar {gym.name}</div>
            <div className="text-sm text-stone-600">Esto no se puede deshacer. Se va a borrar:</div>
            <ul className="text-sm text-stone-600 list-disc pl-5 flex flex-col gap-1">
              <li>el gimnasio {gym.name}</li>
              <li>
                el acceso de {trainers.length}{' '}
                {trainers.length === 1 ? 'persona' : 'personas'}
                {coordinators.length > 0
                  ? `, incluidos sus ${coordinators.length} ${
                      coordinators.length === 1 ? 'coordinador' : 'coordinadores'
                    }`
                  : ''}
              </li>
            </ul>
            <div className="text-[13px] text-stone-500">
              {visibleRoutines
                ? `Sus ${gymRoutines.length} rutinas no se borran, pero quedan inaccesibles.`
                : 'Sus rutinas no se borran, pero quedan inaccesibles.'}
            </div>
            <div className="text-sm text-stone-600">Escribí el nombre del gimnasio para confirmar.</div>
            <input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={gym.name}
              className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
            />
            {deleteError ? (
              <div className="text-[13px] font-medium text-red-700">{deleteError}</div>
            ) : null}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeleting(false)}
                className="flex-1 py-2.75 rounded-lg border border-stone-300 font-semibold text-sm cursor-pointer bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={confirmName.trim() !== gym.name || removing || trainersLoading}
                onClick={() => void handleDelete()}
                className="flex-1 py-2.75 rounded-lg bg-red-600 text-white font-semibold text-sm cursor-pointer border-none disabled:opacity-50"
              >
                {removing ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
