type FilterChipOption<T extends string> = {
  value: T;
  label: string;
};

type QueueFilterChipsProps<T extends string> = {
  options: FilterChipOption<T>[];
  active: string;
  onChange: (value: T) => void;
};

export function QueueFilterChips<T extends string>({ options, active, onChange }: QueueFilterChipsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = active === option.value;

        return (
          <button
            key={option.value}
            className={`inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-md border px-4 py-2 text-sm font-semibold shadow-[0_1px_3px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_3px_6px_rgba(15,23,42,0.16)] active:translate-y-0 active:shadow-[inset_0_2px_4px_rgba(15,23,42,0.12)] ${
              isActive
                ? 'border-[#475569] bg-[#E2E8F0] text-[#334155]'
                : 'border-[#94A3B8] bg-white text-[#334155] hover:border-[#64748B] hover:bg-[#F8FAFC]'
            }`}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.label}
          >
            <span className="block max-w-full truncate whitespace-nowrap">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
