import { memo, useMemo } from 'react';
import { ACCENT, NEUTRAL, WARMUP_DAY_ID, dayPalette } from '../../lib/colors';

interface DayTabsProps {
  dayIds: number[];
  activeDay: number;
  onSelect: (day: number) => void;
}

function DayTabs({ dayIds, activeDay, onSelect }: DayTabsProps) {
  const warmupActive = activeDay === WARMUP_DAY_ID;
  const palettes = useMemo(() => new Map(dayIds.map((id) => [id, dayPalette(id)])), [dayIds]);

  return (
    <div className="flex gap-2 mb-[18px] flex-wrap border-b border-stone-200">
      {/* This tab uses the neutral accent rather than dayPalette's warm-up tone — the tab
          strip stays achromatic so the day tabs are what carries color. */}
      <button
        type="button"
        onClick={() => onSelect(WARMUP_DAY_ID)}
        className="px-5 py-2.5 font-bold text-[13.5px] cursor-pointer bg-transparent border-0 border-b-[2.5px] rounded-t-lg"
        style={{
          borderBottomColor: warmupActive ? ACCENT.base : 'transparent',
          color: warmupActive ? NEUTRAL.ink : NEUTRAL.muted,
        }}
      >
        Entrada en calor
      </button>
      {dayIds.map((id) => {
        const active = id === activeDay;
        const palette = palettes.get(id)!;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className="px-5 py-2.5 font-bold text-[13.5px] cursor-pointer border-0 border-b-[2.5px] rounded-t-lg"
            style={{
              borderBottomColor: active ? palette.tabAccent : 'transparent',
              background: active ? palette.base : 'transparent',
              color: active ? palette.ink : NEUTRAL.muted,
            }}
          >
            Día {id}
          </button>
        );
      })}
    </div>
  );
}

export default memo(DayTabs);
