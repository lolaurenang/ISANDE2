/**
 * Wordmark stand-in for the shop's existing logo.
 * Drop the real artwork into client/public/logo.png and this component
 * will render it instead - no other file needs to change.
 */
export default function Logo({ variant = 'light', size = 'md' }) {
  return (
    <div className={`logo logo-${variant} logo-${size}`}>
      <img
        src="/logo.png"
        alt="Andoy's Enterprises"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.nextElementSibling.style.display = 'block';
        }}
      />
      <span className="logo-fallback">
        Andoy&rsquo;s
        <small>ENTERPRISES</small>
      </span>
    </div>
  );
}
