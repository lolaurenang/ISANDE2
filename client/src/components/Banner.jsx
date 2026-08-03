/** One-line feedback strip used for errors and confirmations. */
export default function Banner({ tone = 'error', message, onDismiss }) {
  if (!message) return null;
  return (
    <div className={`banner banner-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span>{message}</span>
      {onDismiss && (
        <button type="button" className="banner-close" onClick={onDismiss} aria-label="Dismiss">
          &times;
        </button>
      )}
    </div>
  );
}
