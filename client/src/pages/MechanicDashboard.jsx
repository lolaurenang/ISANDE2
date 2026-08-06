import { useEffect, useState, useCallback } from 'react';
import { dashboardApi } from '../api/client.js';
import LogEntry from '../components/LogEntry.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Banner from '../components/Banner.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatDate, initials } from '../utils.js';

const TABS = ['logs', 'staff', 'accomplished'];

export default function MechanicDashboard() {
  const [tab, setTab] = useState('logs');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const dashRes = await dashboardApi.home();
      const payload = dashRes?.data || dashRes;
      setData(payload);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data && !error) {
    return (
      <div className="page">
        <Spinner />
      </div>
    );
  }

  // Safely extract properties with fallback defaults
  const logs = data?.logs || data?.data?.logs || [];
  const staff = data?.staff || data?.data?.staff || [];
  const jobs = data?.jobs || data?.data?.jobs || {};
  const todayJobs = data?.todayJobs || [];
  const upcomingJobs = data?.upcoming || [];

  // Filter completed jobs assigned to or completed by the mechanic
  const accomplishedJobs = [
    ...todayJobs,
    ...upcomingJobs,
    ...logs,
  ].filter((job) => job.status === 'completed' || job.status === 'accomplished');

  return (
    <div className="page">
      <h1>Mechanic Dashboard</h1>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Optional Range Label */}
      {data?.range && (
        <p className="range-label small">
          {formatDate(data.range.from)} to {formatDate(data.range.to)}
        </p>
      )}

      <Banner message={error} onDismiss={() => setError('')} />
      <Banner tone="success" message={notice} onDismiss={() => setNotice('')} />

      {/* Logs Tab */}
      {tab === 'logs' && (
        <section>
          {jobs && (
            <div className="stat-row">
              <div className="stat">
                <b>{jobs.scheduled ?? 0}</b>
                <span>Scheduled</span>
              </div>

              <div className="stat">
                <b>{jobs['in-progress'] ?? 0}</b>
                <span>In progress</span>
              </div>

              <div className="stat">
                <b>{jobs.completed ?? 0}</b>
                <span>Completed</span>
              </div>
            </div>
          )}

          {logs.length ? (
            logs.map((log) => <LogEntry key={log._id || log.id} log={log} />)
          ) : (
            <EmptyState
              title="No activity logs found"
              hint="Check back later for recent updates."
            />
          )}
        </section>
      )}

      {/* Staff Tab */}
      {tab === 'staff' && (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Job title</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {staff.length ? (
                staff.map((s) => (
                  <tr key={s._id || s.id}>
                    <td>
                      <span className="avatar-sm">
                        {initials(s.fullName || s.name || '')}
                      </span>{' '}
                      {s.fullName || s.name}
                    </td>

                    <td>{s.jobTitle || 'Staff'}</td>
                    <td>{s.department || 'General'}</td>

                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center' }}>
                    No staff data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Accomplished Tab */}
      {tab === 'accomplished' && (
        <section>
          {accomplishedJobs.length ? (
            accomplishedJobs.map((job) => (
              <LogEntry key={job._id || job.id} log={job} />
            ))
          ) : (
            <EmptyState
              title="No accomplished jobs yet"
              hint="Jobs marked as completed will appear in this list."
            />
          )}
        </section>
      )}
    </div>
  );
}