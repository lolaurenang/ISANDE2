import { useNotifications } from '../context/NotificationContext.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatDate, formatTime } from '../utils.js';

export default function Notifications() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <div className="page">
      <div className="page-top-row">
        <h1 className="page-heading">Notifications</h1>
        {unreadCount > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {items.length ? (
        <ul className="notification-list">
          {items.map((n) => (
            <li key={n._id} className={`notification ${n.isRead ? '' : 'unread'}`}>
              <button type="button" onClick={() => !n.isRead && markRead(n._id)}>
                <p className="notification-title">{n.title}</p>
                <p className="notification-message">{n.message}</p>
                <p className="notification-time">
                  {formatDate(n.createdAt)} {formatTime(n.createdAt)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Nothing new" hint="Assignments and schedule changes show up here." />
      )}
    </div>
  );
}
