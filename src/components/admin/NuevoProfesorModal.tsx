import { useState, type FormEvent } from 'react';
import { AltaProfesorError, altaProfesor } from '../../services/adminUsersService';

interface NuevoProfesorModalProps {
  gymId: string;
  gymNombre: string;
  onClose: () => void;
}

// Always 'profesor'. Staffing is the coordinador's job, and firestore.rules pins the role
// they may hand out — a coordinador can't mint another coordinador or an admin.
export default function NuevoProfesorModal({ gymId, gymNombre, onClose }: NuevoProfesorModalProps) {
  const [mail, setMail] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedMail = mail.trim();
    if (!trimmedMail || !nombre.trim() || !apellido.trim()) {
      setError('Completá email, nombre y apellido.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await altaProfesor({ mail: trimmedMail, nombre, apellido, rol: 'profesor' }, gymId);
      setDone(trimmedMail);
    } catch (err) {
      setError(
        err instanceof AltaProfesorError ? err.message : 'No pudimos dar de alta al profesor.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-[rgba(20,15,10,0.45)] flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-[420px] max-w-[92vw] p-[26px] flex flex-col gap-3.5"
      >
        <div className="text-[17px] font-extrabold">Nuevo profesor</div>

        {done ? (
          <>
            <div className="text-sm text-stone-600">
              Listo. <span className="font-semibold">{done}</span> ya forma parte de{' '}
              <span className="font-semibold">{gymNombre}</span>. Le mandamos un mail para que
              defina su contraseña; cuando entre por primera vez va a completar su perfil.
            </div>
            <button
              type="button"
              onClick={onClose}
              className="py-2.75 rounded-lg bg-red-600 text-white font-semibold text-sm cursor-pointer border-none"
            >
              Cerrar
            </button>
          </>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <div className="text-[13px] text-stone-500">
              Se crea la cuenta y le llega un mail para definir su contraseña. Queda asignado a{' '}
              <span className="font-semibold text-stone-700">{gymNombre}</span>.
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-stone-500">Email</label>
              <input
                type="email"
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                placeholder="nombre@gimnasio.com"
                className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
              />
            </div>

            <div className="flex gap-2.5">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-stone-500">Nombre</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm w-full"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-stone-500">Apellido</label>
                <input
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm w-full"
                />
              </div>
            </div>

            {error ? <div className="text-[13px] font-medium text-red-700">{error}</div> : null}

            <div className="flex gap-2.5 mt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 text-center py-2.75 rounded-lg border border-stone-300 font-semibold text-sm cursor-pointer bg-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 text-center py-2.75 rounded-lg bg-red-600 text-white font-semibold text-sm cursor-pointer border-none disabled:opacity-60"
              >
                {saving ? 'Dando de alta…' : 'Dar de alta'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
