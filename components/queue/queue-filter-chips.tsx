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
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition ${
              isActive ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
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
