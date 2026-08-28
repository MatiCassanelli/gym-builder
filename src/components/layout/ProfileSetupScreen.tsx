import GymMark from './GymMark';
import ProfileForm from './ProfileForm';
import { upsertProfesor } from '../../services/profesoresService';
import { gymBranding } from '../../lib/branding';
import type { Gym } from '../../types';

interface ProfileSetupScreenProps {
  uid: string;
  email: string;
  /** The gym this trainer was assigned to; null for a site admin, who belongs to none. */
  gym: Gym | null;
}

// Mandatory, full-page (no cancel option) — shown instead of the app whenever the signed-in
// trainer doesn't have their name filled in yet. Saving triggers the profesores/{uid}
// subscription (see SessionGate in App.tsx) to update and reactively swap this out for the
// app. Only the profile fields are written, so the gym and role the admin set stay intact.
export default function ProfileSetupScreen({ uid, email, gym }: ProfileSetupScreenProps) {
  const branding = gymBranding(gym);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[380px] bg-white border border-stone-200 rounded-2xl p-8 flex flex-col gap-5">
        <div className="flex items-center gap-2.5">
          {gym ? <GymMark nombre={branding.nombre} logo={branding.logo} /> : null}
          <div className="font-extrabold text-lg tracking-tight">{branding.nombre}</div>
        </div>

        <div className="text-sm text-stone-500">
          Antes de continuar, completá tus datos de profesor. Van a aparecer en los planes que
          generes.
        </div>

        <ProfileForm
          mail={email}
          onSave={(input) => upsertProfesor(uid, input)}
          submitLabel="Guardar y continuar"
        />
      </div>
    </div>
  );
}
