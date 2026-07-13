import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { signOutUser } from '../../services/authService';
import { useAppData } from '../../context/AppDataContext';
import ProfileModal from './ProfileModal';

export default function TopNav() {
  const location = useLocation();
  const { currentUser, myProfesor } = useAppData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isRoutinesActive = location.pathname === '/' || location.pathname.startsWith('/routines');

  const tabBase = 'px-4.5 py-2.25 rounded-lg font-semibold text-[13.5px] cursor-pointer transition-colors';
  const tabActive = 'bg-white text-red-600 shadow-sm';
  const tabInactive = 'text-stone-500';

  const initials = (myProfesor?.nombre[0] ?? currentUser.email[0] ?? '?').toUpperCase();

  return (
    <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-stone-200 sticky top-0 z-20">
      <div className="flex items-center gap-2.5">
        <img
          src="/forge-logo.png"
          alt="Forge Gym & Box"
          className="w-[34px] h-[34px] rounded-[9px] object-cover"
        />
        <div className="font-extrabold text-lg tracking-tight">Gym Builder</div>
      </div>

      <div className="flex gap-1 bg-stone-100 p-1 rounded-[11px]">
        <NavLink to="/" className={`${tabBase} ${isRoutinesActive ? tabActive : tabInactive}`}>
          Mis rutinas
        </NavLink>
        <NavLink
          to="/exercises"
          className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabInactive}`}
        >
          Ejercicios
        </NavLink>
      </div>

      <div className="relative">
        <button
          type="button"
          title={myProfesor ? `${myProfesor.nombre} ${myProfesor.apellido}` : currentUser.email}
          onClick={() => setMenuOpen((o) => !o)}
          className="w-[34px] h-[34px] rounded-full bg-stone-200 overflow-hidden flex items-center justify-center font-bold text-[13px] text-stone-700 cursor-pointer border-none"
        >
          {myProfesor?.foto ? (
            <img src={myProfesor.foto} alt="" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </button>

        {menuOpen ? (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 mt-2 w-44 bg-white border border-stone-200 rounded-xl shadow-lg py-1.5 z-40">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(true);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-[13.5px] font-medium text-stone-700 cursor-pointer bg-transparent border-none hover:bg-stone-100"
              >
                Mi perfil
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  void signOutUser();
                }}
                className="w-full text-left px-4 py-2 text-[13.5px] font-medium text-red-700 cursor-pointer bg-transparent border-none hover:bg-stone-100"
              >
                Cerrar sesión
              </button>
            </div>
          </>
        ) : null}
      </div>

      {profileOpen ? (
        <ProfileModal
          uid={currentUser.uid}
          email={currentUser.email}
          profesor={myProfesor}
          onClose={() => setProfileOpen(false)}
        />
      ) : null}
    </div>
  );
}
