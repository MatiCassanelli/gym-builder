import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import GymForm from './GymForm';
import GymMark from '../layout/GymMark';
import ProfesoresPanel from './ProfesoresPanel';
import { useAppData } from '../../context/AppDataContext';
import { useProfesores } from '../../hooks/useProfesores';
import { deleteGymWithProfesores, updateGym } from '../../services/gymsService';
import type { GymInput } from '../../types';

/**
 * The admin's view of one gym. Being a superuser, they get everything a coordinador has here
 * — name, logo and roster, including demoting a coordinador, which no coordinador can do —
 * plus the one power that's theirs alone: deleting the gym.
 */
export default function GymDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { gyms, gymsLoading, routines, activeGymId, currentUser } = useAppData();
  const { profesores, loading: profesoresLoading } = useProfesores(!!id, id ?? null);
  const [deleting, setDeleting] = useState(false);
  const [confirmNombre, setConfirmNombre] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);

  const gym = gyms.find((g) => g.id === id);

  // Routines only load for the admin's active scope, so per-trainer counts are shown when
  // this gym is in view (or when everything is) and omitted rather than faked otherwise.
  const rutinasVisibles = activeGymId === null || activeGymId === id;
  const rutinasDelGym = useMemo(
    () => routines.filter((r) => r.gymId === id),
    [routines, id],
  );
  const rutinasPorProfesor = useMemo(() => {
    if (!rutinasVisibles) return null;
    const counts = new Map<string, number>();
    rutinasDelGym.forEach((r) => {
      counts.set(r.createdBy.uid, (counts.get(r.createdBy.uid) ?? 0) + 1);
    });
    return counts;
  }, [rutinasDelGym, rutinasVisibles]);

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
    setBorrando(true);
    try {
      await deleteGymWithProfesores(id!, profesores.map((p) => p.id));
      navigate('/admin');
    } catch {
      setDeleteError('No pudimos eliminar el gimnasio. Probá de nuevo.');
      setBorrando(false);
    }
  }

  const coordinadores = profesores.filter((p) => p.rol === 'coordinador');

  return (
    <div className="flex-1 p-8 max-w-[860px] w-full mx-auto">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-stone-500 no-underline mb-4"
      >
        <span className="text-base">&lt;</span> Gimnasios
      </Link>

      <div className="flex items-center gap-4 mb-2">
        <GymMark nombre={gym.nombre} logo={gym.logo ?? null} size={56} rounded="rounded-xl" />
        <div>
          <div className="text-2xl font-extrabold tracking-tight">{gym.nombre}</div>
          <div className="text-stone-500 text-sm mt-0.5">
            {profesores.length} {profesores.length === 1 ? 'persona' : 'personas'}
            {rutinasVisibles
              ? ` · ${rutinasDelGym.length} ${rutinasDelGym.length === 1 ? 'rutina' : 'rutinas'}`
              : ''}
          </div>
        </div>
      </div>

      <div className="text-stone-400 text-[12.5px] mb-7">
        El día a día lo manejan sus coordinadores
        {coordinadores.length === 1
          ? ` (${coordinadores[0].nombre} ${coordinadores[0].apellido})`.trimEnd()
          : ''}
        . Como administrador podés hacer todo lo que ellos hacen, además de bajarlos a
        profesor y eliminar el gimnasio.
      </div>

      <section className="bg-white border border-stone-200 rounded-2xl p-[26px] mb-6">
        <div className="text-[17px] font-extrabold mb-4">Datos del gimnasio</div>
        <GymForm
          key={gym.id}
          initialNombre={gym.nombre}
          initialLogo={gym.logo}
          onSave={handleSaveGym}
        />
      </section>

      <div className="mb-6">
        <ProfesoresPanel
          gymId={gym.id}
          gymNombre={gym.nombre}
          profesores={profesores}
          loading={profesoresLoading}
          nivel="admin"
          rutinasPorProfesor={rutinasPorProfesor}
          currentUid={currentUser.uid}
        />
      </div>

      <section className="bg-white border border-red-200 rounded-2xl p-[26px]">
        <div className="text-[17px] font-extrabold mb-1.5">Eliminar gimnasio</div>
        <div className="text-[13px] text-stone-500 mb-4">
          Se borra el gimnasio y el acceso de sus {profesores.length}{' '}
          {profesores.length === 1 ? 'integrante' : 'integrantes'}, coordinadores incluidos. Las
          rutinas no se borran, pero dejan de ser accesibles desde la app.
        </div>
        <button
          type="button"
          onClick={() => {
            setConfirmNombre('');
            setDeleteError(null);
            setDeleting(true);
          }}
          className="py-2.5 px-[18px] rounded-lg border border-red-300 text-red-700 font-semibold text-sm cursor-pointer bg-white"
        >
          Eliminar {gym.nombre}
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
            <div className="text-[17px] font-extrabold">Eliminar {gym.nombre}</div>
            <div className="text-sm text-stone-600">Esto no se puede deshacer. Se va a borrar:</div>
            <ul className="text-sm text-stone-600 list-disc pl-5 flex flex-col gap-1">
              <li>el gimnasio {gym.nombre}</li>
              <li>
                el acceso de {profesores.length}{' '}
                {profesores.length === 1 ? 'persona' : 'personas'}
                {coordinadores.length > 0
                  ? `, incluidos sus ${coordinadores.length} ${
                      coordinadores.length === 1 ? 'coordinador' : 'coordinadores'
                    }`
                  : ''}
              </li>
            </ul>
            <div className="text-[13px] text-stone-500">
              {rutinasVisibles
                ? `Sus ${rutinasDelGym.length} rutinas no se borran, pero quedan inaccesibles.`
                : 'Sus rutinas no se borran, pero quedan inaccesibles.'}
            </div>
            <div className="text-sm text-stone-600">Escribí el nombre del gimnasio para confirmar.</div>
            <input
              value={confirmNombre}
              onChange={(e) => setConfirmNombre(e.target.value)}
              placeholder={gym.nombre}
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
                disabled={confirmNombre.trim() !== gym.nombre || borrando || profesoresLoading}
                onClick={() => void handleDelete()}
                className="flex-1 py-2.75 rounded-lg bg-red-600 text-white font-semibold text-sm cursor-pointer border-none disabled:opacity-50"
              >
                {borrando ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
