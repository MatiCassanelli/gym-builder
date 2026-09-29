/** Breadcrumb dropdown listing every version of a plan; each opens in a new tab so versions can be compared side by side. */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { authorLabel, formatDateEs } from '../../lib/format';
import type { Routine, Trainer } from '../../types';
import { ChevronDownIcon } from '../layout/icons';

interface VersionSelectProps {
  /** Every version of the plan, newest first (the first one is the current version). */
  versions: Routine[];
  selectedId: string;
  trainers: Trainer[];
}

const describe = (v: Routine, trainers: Trainer[]): string =>
  `${formatDateEs(v.startDate)} - ${formatDateEs(v.endDate)} · ${authorLabel(trainers, v.createdBy)}`;

export default function VersionSelect({ versions, selectedId, trainers }: VersionSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const currentId = versions[0]?.id;
  const selected = versions.find((v) => v.id === selectedId);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  if (versions.length < 2 || !selected) return null;

  return (
    <div ref={rootRef} className="relative ml-auto">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-[13px] text-stone-700 cursor-pointer"
      >
        <span className="font-bold">v{selected.version}</span>
        <span className="text-stone-500">{describe(selected, trainers)}</span>
        <ChevronDownIcon className="text-stone-400" />
      </button>
      {open ? (
        <div
          role="listbox"
          className="absolute right-0 top-10 z-20 min-w-full w-max bg-white border border-stone-200 rounded-[10px] shadow-lg py-1"
        >
          {versions.map((v) => {
            const isSelected = v.id === selectedId;
            const target = v.id === currentId ? 'edit' : 'view';
            return (
              <Link
                key={v.id}
                role="option"
                aria-selected={isSelected}
                to={`/routines/${v.id}/${target}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (isSelected) e.preventDefault();
                  setOpen(false);
                }}
                className={`flex items-center gap-3 px-3.5 py-2 text-[13px] no-underline text-stone-700 hover:bg-stone-50 ${isSelected ? 'bg-stone-50' : ''}`}
              >
                <span className="font-bold w-7">v{v.version}</span>
                <span className="flex-1 text-stone-600">{describe(v, trainers)}</span>
                {v.id === currentId ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-bold">
                    Vigente
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
