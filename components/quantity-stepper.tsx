export function QuantityStepper({
  value,
  onChange,
  min = 0,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-surface px-3 py-1">
      <button
        aria-label="-"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="text-title-lg text-brasa-primary"
      >
        -
      </button>
      <span className="w-6 text-center text-title-md">{value}</span>
      <button aria-label="+" onClick={() => onChange(value + 1)} className="text-title-lg text-brasa-primary">
        +
      </button>
    </div>
  )
}
