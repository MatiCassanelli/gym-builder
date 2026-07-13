import { useState, type ChangeEvent, type FormEvent } from 'react';
import { resizeImageToDataUrl } from '../../lib/image';
import type { ProfesorInput } from '../../types';

interface ProfileFormProps {
  mail: string;
  initialNombre?: string;
  initialApellido?: string;
  initialFoto?: string;
  onSave: (input: ProfesorInput) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

export default function ProfileForm({
  mail,
  initialNombre = '',
  initialApellido = '',
  initialFoto,
  onSave,
  onCancel,
  submitLabel = 'Guardar',
}: ProfileFormProps) {
  const [nombre, setNombre] = useState(initialNombre);
  const [apellido, setApellido] = useState(initialApellido);
  const [foto, setFoto] = useState<string | undefined>(initialFoto);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setFoto(await resizeImageToDataUrl(file));
    } catch {
      setError('No pudimos procesar esa imagen. Probá con otra.');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedNombre = nombre.trim();
    const trimmedApellido = apellido.trim();
    if (!trimmedNombre || !trimmedApellido) {
      setError('Completá tu nombre y apellido.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({ nombre: trimmedNombre, apellido: trimmedApellido, mail, foto });
    } catch {
      setError('No pudimos guardar tus datos. Probá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-stone-200 overflow-hidden flex items-center justify-center shrink-0">
          {foto ? (
            <img src={foto} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-stone-500 text-xl font-bold">
              {(nombre[0] ?? '?').toUpperCase()}
            </span>
          )}
        </div>
        <label className="text-[12.5px] font-semibold text-red-600 cursor-pointer">
          {foto ? 'Cambiar foto' : 'Subir foto (opcional)'}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => void handleFileChange(e)}
            className="hidden"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-semibold text-stone-500">Nombre</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre"
          className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-semibold text-stone-500">Apellido</label>
        <input
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          placeholder="Tu apellido"
          className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-semibold text-stone-500">Email</label>
        <input
          value={mail}
          disabled
          className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm bg-stone-100 text-stone-500"
        />
      </div>

      {error ? <div className="text-[13px] font-medium text-red-700">{error}</div> : null}

      <div className="flex gap-2.5 mt-1">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 text-center py-2.75 rounded-lg border border-stone-300 font-semibold text-sm cursor-pointer bg-white"
          >
            Cancelar
          </button>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="flex-1 text-center py-2.75 rounded-lg bg-red-600 text-white font-semibold text-sm cursor-pointer border-none disabled:opacity-60"
        >
          {saving ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
