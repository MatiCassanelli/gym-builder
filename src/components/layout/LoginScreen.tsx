import { useState, type FormEvent } from 'react';
import { resetPassword, signIn } from '../../services/authService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResetMessage(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      setError('Email o contraseña incorrectos.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    if (!email) {
      setError('Ingresá tu email para recuperar la contraseña.');
      return;
    }
    setError(null);
    try {
      await resetPassword(email);
      setResetMessage('Te enviamos un email para restablecer tu contraseña.');
    } catch {
      setError('No pudimos enviar el email de recuperación.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[380px] bg-white border border-stone-200 rounded-2xl p-8 flex flex-col gap-5"
      >
        <div className="flex items-center gap-2.5">
          <img
            src="/forge-logo.png"
            alt="Forge Gym & Box"
            className="w-[34px] h-[34px] rounded-[9px] object-cover"
          />
          <div className="font-extrabold text-lg tracking-tight">Gym Builder</div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-sm text-stone-500">Iniciá sesión con tu cuenta.</div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-stone-500">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@gimnasio.com"
            className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12.5px] font-semibold text-stone-500">
            Contraseña
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="px-3 py-2.5 rounded-lg border border-stone-300 text-sm"
          />
        </div>

        {error ? <div className="text-[13px] font-medium text-red-700">{error}</div> : null}
        {resetMessage ? (
          <div className="text-[13px] font-medium text-emerald-800">{resetMessage}</div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="bg-red-600 text-white font-semibold text-sm py-2.5 rounded-lg cursor-pointer disabled:opacity-60"
        >
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="text-[12.5px] font-semibold text-stone-500 cursor-pointer bg-transparent border-none"
        >
          Olvidé mi contraseña
        </button>
      </form>
    </div>
  );
}
