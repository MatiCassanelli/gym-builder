import { useState, type ChangeEvent, type FormEvent } from 'react';
import GymMark from '../layout/GymMark';
import { resizeLogoToDataUrl } from '../../lib/image';
import type { GymInput } from '../../types';

interface GymFormProps {
  initialNombre?: string;
  initialLogo?: string;
  onSave: (input: GymInput) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

// The one editor for a gym's identity. An admin reaches it from the gym detail page and a
// coordinador from "Mi gimnasio" — same fields either way, since name and logo are exactly
// what a coordinador is allowed to change.
export default function GymForm({
  initialNombre = '',
  initialLogo,
  onSave,
  onCancel,
  submitLabel = 'Guardar',
}: GymFormProps) {
  const [nombre, setNombre] = useState(initialNombre);
  const [logo, setLogo] = useState<string | undefined>(initialLogo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLogo(await resizeLogoToDataUrl(file));
      setSaved(false);
    } catch {
      setError('No pudimos procesar esa imagen. Probá con otra.');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = nombre.trim();
    if (!trimmed) {
      setError('Poné un nombre para el gimnasio.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({ nombre: trimmed, logo });
      setSaved(true);
    } catch {
      setError('No pudimos guardar los cambios. Probá de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <GymMark nombre={nombre || '?'} logo={logo ?? null} size={72} rounded="rounded-xl" />
        <div className="flex flex-col gap-1.5 items-start">
          <label className="text-[12.5px] font-semibold text-red-600 cursor-pointer">
            {logo ? 'Cambiar logo' : 'Subir logo'}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void handleFileChange(e)}
              className="hidden"
            />
          </label>
          {logo ? (
            <button
              type="button"
              onClick={() => {
                setLogo(undefined);
                setSaved(false);
              }}
              className="text-[12.5px] font-semibold text-stone-500 cursor-pointer bg-transparent border-none p-0"
            >
              Quitar logo
            </button>
          ) : null}
          <div className="text-[11.5px] text-stone-400">
            Se muestra en la app y en el PDF de cada rutina.
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12.5px] font-semibold text-stone-500">Nombre del gimnasio</label>
        <input
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            setSaved(false);
          }}
          placeholder="Ej. Forge Gym & Box"
          className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
        />
      </div>

      {error ? <div className="text-[13px] font-medium text-red-700">{error}</div> : null}
      {saved && !error ? (
        <div className="text-[13px] font-medium text-emerald-800">Cambios guardados.</div>
      ) : null}

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
