/** Empty screens are an invitation to act, not a dead end. */
export default function EmptyState({ title, hint, action }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      {hint && <p className="empty-hint">{hint}</p>}
      {action}
    </div>
  );
}
