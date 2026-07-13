import ProfileForm from './ProfileForm';
import { upsertProfesor } from '../../services/profesoresService';

interface ProfileSetupScreenProps {
  uid: string;
  email: string;
}

// Mandatory, full-page (no cancel option) — shown instead of the app whenever the signed-in
// trainer doesn't have a complete profesores/{uid} doc yet. Saving triggers the profesores
// subscription (see App.tsx's Gate) to update and reactively swap this out for the app.
export default function ProfileSetupScreen({ uid, email }: ProfileSetupScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[380px] bg-white border border-stone-200 rounded-2xl p-8 flex flex-col gap-5">
        <div className="flex items-center gap-2.5">
          <img
            src="/forge-logo.png"
            alt="Forge Gym & Box"
            className="w-[34px] h-[34px] rounded-[9px] object-cover"
          />
          <div className="font-extrabold text-lg tracking-tight">Gym Builder</div>
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
