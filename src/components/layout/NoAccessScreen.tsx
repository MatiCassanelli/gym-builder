import { signOutUser } from '../../services/authService';
import { APP_NAME } from '../../lib/branding';

interface NoAccessScreenProps {
  title: string;
  message: string;
}

// Shown when the account authenticates fine but has no access record to work from — a
// trainer whose alta is still pending, or one an admin has removed from their gym. Neutral
// branding on purpose: there is no gym in scope to brand with.
export default function NoAccessScreen({ title, message }: NoAccessScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[380px] bg-white border border-stone-200 rounded-2xl p-8 flex flex-col gap-5">
        <div className="font-extrabold text-lg tracking-tight">{APP_NAME}</div>
        <div className="flex flex-col gap-2">
          <div className="font-bold text-[15px]">{title}</div>
          <div className="text-sm text-stone-500">{message}</div>
        </div>
        <button
          type="button"
          onClick={() => void signOutUser()}
          className="py-2.75 rounded-lg border border-stone-300 font-semibold text-sm cursor-pointer bg-white"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
