interface DayTabsProps {
  dayIds: number[];
  activeDay: number;
  onSelect: (day: number) => void;
}

export default function DayTabs({ dayIds, activeDay, onSelect }: DayTabsProps) {
  return (
    <div className="flex gap-2 mb-[18px] flex-wrap border-b border-stone-200">
      {dayIds.map((id) => {
        const active = id === activeDay;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className="px-5 py-2.5 font-bold text-[13.5px] cursor-pointer bg-transparent border-0 border-b-[2.5px]"
            style={{
              borderBottomColor: active ? 'var(--color-red-600)' : 'transparent',
              color: active ? 'var(--color-stone-900)' : 'var(--color-stone-500)',
            }}
          >
            Día {id}
          </button>
        );
      })}
    </div>
  );
}
