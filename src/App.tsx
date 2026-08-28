import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Navigate, Outlet, RouterProvider, createBrowserRouter, useParams } from 'react-router-dom';
import TopNav from './components/layout/TopNav';
import LoginScreen from './components/layout/LoginScreen';
import NoAccessScreen from './components/layout/NoAccessScreen';
import ProfileSetupScreen from './components/layout/ProfileSetupScreen';
import RoutinesListPage from './components/routines/RoutinesListPage';
import { useAuthUser } from './hooks/useAuthUser';
import { useGyms } from './hooks/useGyms';
import { useMyProfesor } from './hooks/useMyProfesor';
import { useRoutines } from './hooks/useRoutines';
import { useExercises } from './hooks/useExercises';
import { useProfesores } from './hooks/useProfesores';
import { toUserRef } from './services/authService';
import { AppDataContext, useAppData, type AppData } from './context/AppDataContext';
import type { Gym, Profesor } from './types';

const ExercisesPage = lazy(() => import('./components/exercises/ExercisesPage'));
const BuilderPage = lazy(() => import('./components/builder/BuilderPage'));
const GymsAdminPage = lazy(() => import('./components/admin/GymsAdminPage'));
const GymDetailPage = lazy(() => import('./components/admin/GymDetailPage'));
const MyGymPage = lazy(() => import('./components/admin/MyGymPage'));

// Which gym a site admin last chose to look at. Persisted so switching gyms survives a
// reload; `null`/absent means the "todos los gimnasios" scope.
const ADMIN_GYM_KEY = 'gymBuilder.adminGymId';

function readStoredAdminGym(): string | null {
  try {
    return window.localStorage.getItem(ADMIN_GYM_KEY);
  } catch {
    return null;
  }
}

function PageFallback() {
  return (
    <div className="flex-1 p-8 text-center text-sm text-stone-500">Cargando…</div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-stone-500">
      Cargando…
    </div>
  );
}

function Layout() {
  const { routinesError, profesoresError } = useAppData();
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      {routinesError || profesoresError ? (
        <div className="bg-red-50 border-b border-red-200 text-red-700 text-[13px] text-center py-2 px-4">
          No pudimos cargar los datos. Probá recargar la página.
        </div>
      ) : null}
      <Outlet />
    </div>
  );
}

// Routes that only exist for one role: a profesor who types the URL by hand lands back on
// their routines instead of on a page that would only ever fail against the rules anyway.
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAppData();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RoutinesRoute() {
  const { routines, routinesLoading, currentUser, profesores } = useAppData();
  return (
    <RoutinesListPage
      routines={routines}
      loading={routinesLoading}
      currentUser={currentUser}
      profesores={profesores}
    />
  );
}

function ExercisesRoute() {
  const { exercises, exercisesLoading, currentUser, isAdmin } = useAppData();
  return (
    <ExercisesPage
      exercises={exercises}
      loading={exercisesLoading}
      currentUser={currentUser}
      canDelete={isAdmin}
    />
  );
}

// BuilderPage reads its initial draft once, at mount, from `routines` and `exercises` (the
// latter to preload default mobility items) — so this wrapper waits until both have loaded
// and remounts BuilderPage (via `key`) whenever the routine id in the URL changes, instead
// of BuilderPage syncing itself via an effect.
function BuilderRoute() {
  const { id } = useParams<{ id: string }>();
  const { routines, routinesLoading, exercises, exercisesLoading, profesores, currentUser, gyms, activeGymId } =
    useAppData();
  if (routinesLoading || exercisesLoading) return <PageFallback />;
  return (
    <BuilderPage
      key={id ?? 'new'}
      routines={routines}
      exercises={exercises}
      profesores={profesores}
      currentUser={currentUser}
      gyms={gyms}
      activeGymId={activeGymId}
    />
  );
}

function GymsAdminRoute() {
  return (
    <RequireAdmin>
      <GymsAdminPage />
    </RequireAdmin>
  );
}

function GymDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireAdmin>
      <GymDetailPage key={id} />
    </RequireAdmin>
  );
}

// Created once at module scope — recreating it on every render (e.g. inside a component
// that re-renders on every Firestore snapshot) would remount the whole route tree and
// reset any in-progress navigation blocking. Route components read live data from
// AppDataContext instead of via router-supplied props.
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <RoutinesRoute /> },
      {
        path: '/exercises',
        element: (
          <Suspense fallback={<PageFallback />}>
            <ExercisesRoute />
          </Suspense>
        ),
      },
      {
        path: '/routines/new',
        element: (
          <Suspense fallback={<PageFallback />}>
            <BuilderRoute />
          </Suspense>
        ),
      },
      {
        path: '/routines/:id/edit',
        element: (
          <Suspense fallback={<PageFallback />}>
            <BuilderRoute />
          </Suspense>
        ),
      },
      {
        path: '/admin',
        element: (
          <Suspense fallback={<PageFallback />}>
            <GymsAdminRoute />
          </Suspense>
        ),
      },
      {
        path: '/admin/gimnasios/:id',
        element: (
          <Suspense fallback={<PageFallback />}>
            <GymDetailRoute />
          </Suspense>
        ),
      },
      {
        path: '/mi-gimnasio',
        element: (
          <Suspense fallback={<PageFallback />}>
            <MyGymPage />
          </Suspense>
        ),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

interface AuthenticatedAppProps {
  uid: string;
  email: string;
  myProfesor: Profesor;
  gyms: Gym[];
  gymsLoading: boolean;
}

function AuthenticatedApp({ uid, email, myProfesor, gyms, gymsLoading }: AuthenticatedAppProps) {
  const currentUser = useMemo(() => ({ uid, email }), [uid, email]);
  const isAdmin = myProfesor.rol === 'admin';
  const [adminGymId, setAdminGymId] = useState<string | null>(() => readStoredAdminGym());

  // A stored gym that has since been deleted (or a non-admin, who has no say) falls back to
  // the scope their role allows, rather than leaving the app pinned to a gym that's gone.
  const activeGymId = isAdmin
    ? (adminGymId && gyms.some((g) => g.id === adminGymId) ? adminGymId : null)
    : myProfesor.gymId;

  const setActiveGymId = useCallback((gymId: string | null) => {
    setAdminGymId(gymId);
    try {
      if (gymId) window.localStorage.setItem(ADMIN_GYM_KEY, gymId);
      else window.localStorage.removeItem(ADMIN_GYM_KEY);
    } catch {
      // Private-mode browsers just lose the preference between reloads.
    }
  }, []);

  const activeGym = gyms.find((g) => g.id === activeGymId) ?? null;

  const { routines, loading: routinesLoading, error: routinesError } = useRoutines(
    true,
    activeGymId,
  );
  const { exercises, loading: exercisesLoading } = useExercises(true, uid);
  const { profesores, error: profesoresError } = useProfesores(true, activeGymId);
  const userLabel = (email[0] ?? '?').toUpperCase();

  const appData = useMemo<AppData>(
    () => ({
      routines,
      routinesLoading,
      routinesError,
      exercises,
      exercisesLoading,
      profesores,
      profesoresError,
      gyms,
      gymsLoading,
      myProfesor,
      isAdmin,
      activeGymId,
      setActiveGymId,
      activeGym,
      currentUser,
      userLabel,
    }),
    [
      routines,
      routinesLoading,
      routinesError,
      exercises,
      exercisesLoading,
      profesores,
      profesoresError,
      gyms,
      gymsLoading,
      myProfesor,
      isAdmin,
      activeGymId,
      setActiveGymId,
      activeGym,
      currentUser,
      userLabel,
    ],
  );

  return (
    <AppDataContext.Provider value={appData}>
      <RouterProvider router={router} />
    </AppDataContext.Provider>
  );
}

function hasCompleteProfile(p: Profesor): boolean {
  return !!p.nombre?.trim() && !!p.apellido?.trim();
}

/**
 * Resolves who the signed-in user is before any gym-scoped data is requested. Their
 * profesores/{uid} doc is the access record: without it (or without a gym, for a non-admin)
 * there is nothing they're allowed to read, so the app stops here rather than firing queries
 * the rules would reject.
 */
function SessionGate({ uid, email }: { uid: string; email: string }) {
  const { profesor, loading } = useMyProfesor(uid);
  const isAdmin = profesor?.rol === 'admin';
  const { gyms, loading: gymsLoading } = useGyms(profesor?.gymId ?? null, isAdmin);

  if (loading) return <LoadingScreen />;

  if (!profesor) {
    return (
      <NoAccessScreen
        title="Tu cuenta todavía no está habilitada"
        message="Pedile al administrador que te dé de alta en un gimnasio para poder entrar."
      />
    );
  }

  if (!isAdmin && !profesor.gymId) {
    return (
      <NoAccessScreen
        title="No tenés un gimnasio asignado"
        message="Pedile al administrador que te asigne a un gimnasio para poder ver sus rutinas."
      />
    );
  }

  if (gymsLoading) return <LoadingScreen />;

  if (!hasCompleteProfile(profesor)) {
    // An admin belongs to no single gym, so their setup screen keeps the neutral app mark.
    return <ProfileSetupScreen uid={uid} email={email} gym={isAdmin ? null : (gyms[0] ?? null)} />;
  }

  return (
    <AuthenticatedApp
      uid={uid}
      email={email}
      myProfesor={profesor}
      gyms={gyms}
      gymsLoading={gymsLoading}
    />
  );
}

export default function App() {
  const { user, loading } = useAuthUser();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;

  const ref = toUserRef(user);
  return <SessionGate uid={ref.uid} email={ref.email} />;
}
