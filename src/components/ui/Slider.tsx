interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (next: number) => void;
  format?: (value: number) => string;
}

/** Range control with a live readout, used across the Editor settings panel. */
export function Slider({ label, value, min, max, step = 1, onChange, format }: SliderProps) {
  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[0.83rem] text-[var(--color-ink)]">{label}</span>
        <span className="font-mono text-[0.74rem] text-[var(--color-ink-faint)]">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-line)] accent-[var(--color-accent)]"
      />
    </div>
  );
}
