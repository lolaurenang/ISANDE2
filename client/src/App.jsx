/**
 * Route table for the View layer.
 * Public routes render on their own; everything behind ProtectedRoute
 * renders inside the AppShell frame.
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppShell from './components/AppShell.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Home from './pages/Home.jsx';
import Calendar from './pages/Calendar.jsx';
import Schedule from './pages/Schedule.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MechanicDashboard from './pages/MechanicDashboard';
import Reports from './pages/Reports.jsx';
import Profile from './pages/Profile.jsx';
import Notifications from './pages/Notifications.jsx';
import NotFound from './pages/NotFound.jsx';

function Shell({ children, roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/home" replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/home" replace /> : <Signup />} />

      <Route path="/home" element={<Shell><Home /></Shell>} />
      <Route path="/calendar" element={<Shell><Calendar /></Shell>} />
      <Route path="/schedule" element={<Shell><Schedule /></Shell>} />
      <Route path="/notifications" element={<Shell><Notifications /></Shell>} />
      <Route path="/profile" element={<Shell><Profile /></Shell>} />
      <Route path="/dashboard" element={<Shell>{user?.role === 'manager'? <Dashboard />: <MechanicDashboard />}</Shell>}/>
      <Route path="/reports" element={<Shell roles={['manager']}><Reports /></Shell>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
