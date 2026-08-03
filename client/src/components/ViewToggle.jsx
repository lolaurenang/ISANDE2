/** Week / Month / Year pill switch from the prototype. */
export default function ViewToggle({ value, onChange, options = ['week', 'month', 'year'] }) {
  return (
    <div className="view-toggle" role="tablist">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="tab"
          aria-selected={value === opt}
          className={value === opt ? 'active' : ''}
          onClick={() => onChange(opt)}
        >
          {opt[0].toUpperCase() + opt.slice(1)}
        </button>
      ))}
    </div>
  );
}
