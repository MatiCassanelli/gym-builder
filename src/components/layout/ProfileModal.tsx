import ChangePasswordForm from './ChangePasswordForm';
import ProfileForm from './ProfileForm';
import { upsertProfesor } from '../../services/profesoresService';
import type { Profesor, ProfesorInput } from '../../types';

interface ProfileModalProps {
  uid: string;
  email: string;
  profesor: Profesor | null;
  onClose: () => void;
}

export default function ProfileModal({ uid, email, profesor, onClose }: ProfileModalProps) {
  async function handleSave(input: ProfesorInput) {
    await upsertProfesor(uid, input);
    onClose();
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
        <div className="text-[17px] font-extrabold">Mi perfil</div>
        <ProfileForm
          mail={email}
          initialNombre={profesor?.nombre}
          initialApellido={profesor?.apellido}
          initialFoto={profesor?.foto}
          onSave={handleSave}
          onCancel={onClose}
        />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
