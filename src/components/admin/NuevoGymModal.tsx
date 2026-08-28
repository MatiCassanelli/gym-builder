import { useState, type ChangeEvent, type FormEvent } from 'react';
import GymMark from '../layout/GymMark';
import { AltaProfesorError, altaGimnasio } from '../../services/adminUsersService';
import { resizeLogoToDataUrl } from '../../lib/image';

interface NuevoGymModalProps {
  onClose: () => void;
}

/**
 * A gym and the coordinador who will run it are created together, in one form: staffing is
 * the coordinador's job, so a gym without one would have nobody able to add trainers, and
 * appointing a coordinador is the one thing only an admin can do.
 */
export default function NuevoGymModal({ onClose }: NuevoGymModalProps) {
  const [nombre, setNombre] = useState('');
  const [logo, setLogo] = useState<string | undefined>();
  const [mail, setMail] = useState('');
  const [coordNombre, setCoordNombre] = useState('');
  const [coordApellido, setCoordApellido] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ gym: string; mail: string } | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogo(await resizeLogoToDataUrl(file));
    } catch {
      setError('No pudimos procesar esa imagen. Probá con otra.');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedNombre = nombre.trim();
    const trimmedMail = mail.trim();
    if (!trimmedNombre) {
      setError('Poné un nombre para el gimnasio.');
      return;
    }
    if (!trimmedMail || !coordNombre.trim() || !coordApellido.trim()) {
      setError('Completá email, nombre y apellido del coordinador.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await altaGimnasio(
        { nombre: trimmedNombre, logo },
        { mail: trimmedMail, nombre: coordNombre, apellido: coordApellido },
      );
      setDone({ gym: trimmedNombre, mail: trimmedMail });
    } catch (err) {
      setError(
        err instanceof AltaProfesorError ? err.message : 'No pudimos crear el gimnasio.',
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
        className="bg-white rounded-2xl w-[440px] max-w-[92vw] max-h-[92vh] overflow-y-auto p-[26px] flex flex-col gap-3.5"
      >
        <div className="text-[17px] font-extrabold">Nuevo gimnasio</div>

        {done ? (
          <>
            <div className="text-sm text-stone-600">
              <span className="font-semibold">{done.gym}</span> quedó creado. Le mandamos un mail
              a <span className="font-semibold">{done.mail}</span> para que defina su contraseña.
              Como coordinador va a poder dar de alta a sus profesores y editar el nombre y el
              logo del gimnasio.
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
            <div className="flex items-center gap-4">
              <GymMark nombre={nombre || '?'} logo={logo ?? null} size={64} rounded="rounded-xl" />
              <div className="flex flex-col gap-1 items-start">
                <label className="text-[12.5px] font-semibold text-red-600 cursor-pointer">
                  {logo ? 'Cambiar logo' : 'Subir logo (opcional)'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleFileChange(e)}
                    className="hidden"
                  />
                </label>
                <div className="text-[11.5px] text-stone-400">
                  El coordinador lo puede cambiar después.
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-stone-500">
                Nombre del gimnasio
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Iron House"
                className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
              />
            </div>

            <div className="border-t border-stone-200 pt-4 flex flex-col gap-4">
              <div>
                <div className="text-[13.5px] font-bold">Coordinador</div>
                <div className="text-[12.5px] text-stone-500 mt-0.5">
                  Se le crea la cuenta y le llega un mail para definir su contraseña. Después él
                  da de alta al resto de los profesores.
                </div>
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
                    value={coordNombre}
                    onChange={(e) => setCoordNombre(e.target.value)}
                    className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm w-full"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[12.5px] font-semibold text-stone-500">Apellido</label>
                  <input
                    value={coordApellido}
                    onChange={(e) => setCoordApellido(e.target.value)}
                    className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm w-full"
                  />
                </div>
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
                {saving ? 'Creando…' : 'Crear gimnasio'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
