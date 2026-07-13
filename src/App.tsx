import { lazy, Suspense, useMemo } from 'react';
import { Navigate, Outlet, RouterProvider, createBrowserRouter, useParams } from 'react-router-dom';
import TopNav from './components/layout/TopNav';
import LoginScreen from './components/layout/LoginScreen';
import ProfileSetupScreen from './components/layout/ProfileSetupScreen';
import RoutinesListPage from './components/routines/RoutinesListPage';
import { useAuthUser } from './hooks/useAuthUser';
import { useRoutines } from './hooks/useRoutines';
import { useExercises } from './hooks/useExercises';
import { useProfesores } from './hooks/useProfesores';
import { toUserRef } from './services/authService';
import { AppDataContext, useAppData, type AppData } from './context/AppDataContext';
import type { Profesor } from './types';

const ExercisesPage = lazy(() => import('./components/exercises/ExercisesPage'));
const BuilderPage = lazy(() => import('./components/builder/BuilderPage'));

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
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <Outlet />
    </div>
  );
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
  const { exercises, exercisesLoading, currentUser } = useAppData();
  return (
    <ExercisesPage exercises={exercises} loading={exercisesLoading} currentUser={currentUser} />
  );
}

// BuilderPage reads its initial draft once, at mount, from `routines` — so this wrapper
// waits until routines have loaded and remounts BuilderPage (via `key`) whenever the
// routine id in the URL changes, instead of BuilderPage syncing itself via an effect.
function BuilderRoute() {
  const { id } = useParams<{ id: string }>();
  const { routines, routinesLoading, exercises, profesores, currentUser } = useAppData();
  if (routinesLoading) return <PageFallback />;
  return (
    <BuilderPage
      key={id ?? 'new'}
      routines={routines}
      exercises={exercises}
      profesores={profesores}
      currentUser={currentUser}
    />
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
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

interface AuthenticatedAppProps {
  uid: string;
  email: string;
  profesores: Profesor[];
  myProfesor: Profesor;
}

function AuthenticatedApp({ uid, email, profesores, myProfesor }: AuthenticatedAppProps) {
  const currentUser = useMemo(() => ({ uid, email }), [uid, email]);
  const { routines, loading: routinesLoading } = useRoutines(true);
  const { exercises, loading: exercisesLoading } = useExercises(true, uid, email);
  const userLabel = (email[0] ?? '?').toUpperCase();

  const appData = useMemo<AppData>(
    () => ({
      routines,
      routinesLoading,
      exercises,
      exercisesLoading,
      profesores,
      myProfesor,
      currentUser,
      userLabel,
    }),
    [routines, routinesLoading, exercises, exercisesLoading, profesores, myProfesor, currentUser, userLabel],
  );

  return (
    <AppDataContext.Provider value={appData}>
      <RouterProvider router={router} />
    </AppDataContext.Provider>
  );
}

function hasCompleteProfile(p: Profesor | undefined): p is Profesor {
  return !!p && !!p.nombre.trim() && !!p.apellido.trim();
}

// Fetches the shared profesores collection once (needed both to gate on the current
// trainer's own profile and to show "who made this plan" for routines authored by other
// trainers), and blocks the whole app behind ProfileSetupScreen until the signed-in
// trainer's own profesores/{uid} doc has a name — reactively, via the live subscription,
// so saving the form there flips straight into the app with no extra navigation.
function Gate({ uid, email }: { uid: string; email: string }) {
  const { profesores, loading } = useProfesores(true);

  if (loading) return <LoadingScreen />;

  const myProfesor = profesores.find((p) => p.id === uid);
  if (!hasCompleteProfile(myProfesor)) {
    return <ProfileSetupScreen uid={uid} email={email} />;
  }

  return (
    <AuthenticatedApp uid={uid} email={email} profesores={profesores} myProfesor={myProfesor} />
  );
}

export default function App() {
  const { user, loading } = useAuthUser();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;

  const ref = toUserRef(user);
  return <Gate uid={ref.uid} email={ref.email} />;
}
