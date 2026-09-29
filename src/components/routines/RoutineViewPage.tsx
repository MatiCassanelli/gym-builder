/** Read-only preview and PDF export of one saved routine version (no editing controls). */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumb from '../layout/Breadcrumb';
import RoutinePrintPreview from '../preview/RoutinePrintPreview';
import { authorLabel, formatDateEs } from '../../lib/format';
import { gymBranding } from '../../lib/branding';
import { exportRoutinePdf } from '../../lib/pdfExport';
import { versionsOf } from '../../lib/planVersions';
import VersionSelect from '../builder/VersionSelect';
import type { Exercise, Gym, Routine, Trainer } from '../../types';

interface RoutineViewPageProps {
  routine: Routine;
  routines: Routine[];
  exercises: Exercise[];
  trainers: Trainer[];
  gyms: Gym[];
}

export default function RoutineViewPage({
  routine,
  routines,
  exercises,
  trainers,
  gyms,
}: RoutineViewPageProps) {
  const [exporting, setExporting] = useState(false);
  const exercisesMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const authorName = authorLabel(trainers, routine.createdBy);
  const branding = gymBranding(gyms.find((g) => g.id === routine.gymId) ?? null);
  const planVersions = versionsOf(routines, routine.planId);
  const currentVersion = planVersions[0];

  async function handleExportPdf() {
    setExporting(true);
    try {
      await exportRoutinePdf(routine, exercisesMap, authorName, branding);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Breadcrumb
        title={`${routine.student || 'Alumno'} — v${routine.version}`}
        right={<VersionSelect versions={planVersions} selectedId={routine.id} trainers={trainers} />}
      />
      <div className="flex-1 p-8 max-w-[1180px] w-full mx-auto flex flex-col gap-5">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">
              {routine.student || 'Alumno'} — versión {routine.version}
            </div>
            <div className="text-stone-500 text-sm mt-1">
              {formatDateEs(routine.startDate)} - {formatDateEs(routine.endDate)} · Solo lectura.
            </div>
          </div>
          <div className="flex gap-2.5 items-center">
            {currentVersion && currentVersion.id !== routine.id ? (
              <Link
                to={`/routines/${currentVersion.id}/edit`}
                className="bg-white border-[1.5px] border-red-600 text-red-600 font-bold text-sm px-[18px] py-2.5 rounded-lg whitespace-nowrap no-underline"
              >
                Ir a la versión vigente
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={exporting}
              className="bg-red-600 text-white font-bold text-sm px-5 py-3 rounded-lg cursor-pointer border-none disabled:opacity-60"
            >
              {exporting ? 'Generando…' : 'Exportar PDF'}
            </button>
          </div>
        </div>
        <div className="bg-stone-200 rounded-2xl p-7 flex justify-center">
          <RoutinePrintPreview
            routine={routine}
            exercisesMap={exercisesMap}
            authorName={authorName}
            gym={branding}
          />
        </div>
      </div>
    </>
  );
}
