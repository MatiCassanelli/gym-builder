import ChangePasswordForm from './ChangePasswordForm';
import ProfileForm from './ProfileForm';
import { upsertTrainer } from '../../services/trainersService';
import type { Trainer, TrainerInput } from '../../types';

interface ProfileModalProps {
  uid: string;
  email: string;
  trainer: Trainer | null;
  onClose: () => void;
}

export default function ProfileModal({ uid, email, trainer, onClose }: ProfileModalProps) {
  async function handleSave(input: TrainerInput) {
    await upsertTrainer(uid, input);
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
          email={email}
          initialName={trainer?.name}
          initialLastName={trainer?.lastName}
          initialPhoto={trainer?.photo}
          onSave={handleSave}
          onCancel={onClose}
        />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
