import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import GymMark from './GymMark';
import ProfileModal from './ProfileModal';
import { signOutUser } from '../../services/authService';
import { useAppData } from '../../context/AppDataContext';
import { APP_NAME, gymBranding } from '../../lib/branding';

const tabBase = 'px-4.5 py-2.25 rounded-lg font-semibold text-[13.5px] cursor-pointer transition-colors';
const tabActive = 'bg-white text-red-600 shadow-sm';
const tabInactive = 'text-stone-500';

// Only a site admin sees this: it switches which gym's routines, trainers and branding the
// whole app is showing, plus an "all gyms" scope for looking across the platform at once.
function GymScopePicker() {
  const { gyms, activeGymId, setActiveGymId, activeGym } = useAppData();
  const [open, setOpen] = useState(false);
  const branding = gymBranding(activeGym);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white cursor-pointer"
      >
        <GymMark nombre={branding.nombre} logo={branding.logo} size={22} rounded="rounded-[6px]" />
        <span className="font-semibold text-[13px] text-stone-700 max-w-[180px] truncate">
          {activeGym ? activeGym.nombre : 'Todos los gimnasios'}
        </span>
        <span className="text-stone-400 text-[10px]">▼</span>
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 w-60 bg-white border border-stone-200 rounded-xl shadow-lg py-1.5 z-40 max-h-[60vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setActiveGymId(null);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-[13.5px] font-medium cursor-pointer bg-transparent border-none hover:bg-stone-100 ${
                activeGymId === null ? 'text-red-600' : 'text-stone-700'
              }`}
            >
              Todos los gimnasios
            </button>
            {gyms.map((gym) => (
              <button
                key={gym.id}
                type="button"
                onClick={() => {
                  setActiveGymId(gym.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 text-left px-4 py-2 text-[13.5px] font-medium cursor-pointer bg-transparent border-none hover:bg-stone-100 ${
                  activeGymId === gym.id ? 'text-red-600' : 'text-stone-700'
                }`}
              >
                <GymMark
                  nombre={gym.nombre}
                  logo={gym.logo ?? null}
                  size={20}
                  rounded="rounded-[5px]"
                />
                <span className="truncate">{gym.nombre}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function TopNav() {
  const location = useLocation();
  const { currentUser, myProfesor, isAdmin, activeGym } = useAppData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isRoutinesActive = location.pathname === '/' || location.pathname.startsWith('/routines');
  const isAdminActive = location.pathname.startsWith('/admin');
  const isCoordinador = myProfesor.rol === 'coordinador';

  const initials = (myProfesor.nombre[0] ?? currentUser.email[0] ?? '?').toUpperCase();
  const branding = gymBranding(activeGym);

  return (
    <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-stone-200 sticky top-0 z-20 gap-4">
      {/* The gym in scope is the brand: its own logo and name, never the platform's. */}
      {isAdmin ? (
        <GymScopePicker />
      ) : (
        <div className="flex items-center gap-2.5 min-w-0">
          <GymMark nombre={branding.nombre} logo={branding.logo} />
          <div className="font-extrabold text-lg tracking-tight truncate">{branding.nombre}</div>
        </div>
      )}

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
        {isAdmin ? (
          <NavLink to="/admin" className={`${tabBase} ${isAdminActive ? tabActive : tabInactive}`}>
            Gimnasios
          </NavLink>
        ) : null}
        {isCoordinador ? (
          <NavLink
            to="/mi-gimnasio"
            className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabInactive}`}
          >
            Mi gimnasio
          </NavLink>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          title={`${myProfesor.nombre} ${myProfesor.apellido}`.trim() || currentUser.email}
          onClick={() => setMenuOpen((o) => !o)}
          className="w-[34px] h-[34px] rounded-full bg-stone-200 overflow-hidden flex items-center justify-center font-bold text-[13px] text-stone-700 cursor-pointer border-none"
        >
          {myProfesor.foto ? (
            <img src={myProfesor.foto} alt="" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </button>

        {menuOpen ? (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 mt-2 w-52 bg-white border border-stone-200 rounded-xl shadow-lg py-1.5 z-40">
              <div className="px-4 py-1.5 text-[11.5px] font-semibold text-stone-400 uppercase tracking-wide">
                {isAdmin ? APP_NAME : branding.nombre}
              </div>
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
