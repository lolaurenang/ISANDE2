/**
 * The frame every signed-in page sits inside.
 * Desktop gets the dark rail on the left (manager layout from the
 * prototype); phones get the bottom tab bar (mechanic layout). One
 * component, so the nav never drifts between the two.
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import Icon from './Icon.jsx';
import { initials } from '../utils.js';

const NAV = [
  { to: '/home', icon: 'home', label: 'Home' },
  { to: '/calendar', icon: 'calendar', label: 'Calendar' },
  { to: '/schedule', icon: 'schedule', label: 'Schedule' },
  { to: '/dashboard',
icon: 'manager', label: 'Dashboard', },
];

export default function AppShell({ children }) {
  const { user, logout, isManager } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const items = NAV.filter((item) => !item.managerOnly || isManager);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="rail" aria-label="Main navigation">
        <nav className="rail-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `rail-item ${isActive ? 'active' : ''}`}
              title={item.label}
            >
              <Icon name={item.icon} />
              <span className="sr-only">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="rail-foot">
          <NavLink to="/notifications" className="rail-item rail-bell" title="Notifications">
            <Icon name="bell" size={20} />
            {unreadCount > 0 && <span className="dot" aria-label={`${unreadCount} unread`} />}
          </NavLink>
          <NavLink to="/profile" className="rail-avatar" title="Profile">
            {initials(user?.fullName)}
          </NavLink>
          <button type="button" className="rail-item" onClick={handleLogout} title="Log out">
            <Icon name="logout" size={20} />
            <span className="sr-only">Log out</span>
          </button>
        </div>
      </aside>

      <main className="main">{children}</main>

      <nav className="tabbar" aria-label="Main navigation">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink to="/profile" className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
          <Icon name="profile" size={20} />
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
