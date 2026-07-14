import { useState, type FormEvent } from 'react';
import { FirebaseError } from 'firebase/app';
import { changePassword } from '../../services/authService';

export default function ChangePasswordForm() {
  const [expanded, setExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(false);
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (err) {
      if (err instanceof FirebaseError && (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')) {
        setError('La contraseña actual es incorrecta.');
      } else {
        setError('No pudimos cambiar tu contraseña. Probá de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  }

  function toggleExpanded() {
    setExpanded((prev) => {
      if (prev) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError(null);
        setSuccess(false);
      }
      return !prev;
    });
  }

  return (
    <div className="flex flex-col gap-3 pt-3.5 border-t border-stone-200">
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex items-center justify-between text-[13.5px] font-bold cursor-pointer bg-transparent border-none p-0"
      >
        Cambiar contraseña
        <span className="text-stone-400 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded ? (
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-stone-500">Contraseña actual</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-stone-500">Nueva contraseña</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-stone-500">Confirmar nueva contraseña</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
            />
          </div>

          {error ? <div className="text-[13px] font-medium text-red-700">{error}</div> : null}
          {success ? (
            <div className="text-[13px] font-medium text-emerald-800">Contraseña actualizada correctamente.</div>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="py-2.75 rounded-lg border border-stone-300 font-semibold text-sm cursor-pointer bg-white disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
