import { useEffect, useState, useCallback } from 'react';
import { dashboardApi, usersApi } from '../api/client.js';
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
  const [staffList, setStaffList] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      // 1. Fetch mechanic home dashboard data
      const dashRes = await dashboardApi.home();
      const payload = dashRes?.data || dashRes;
      setData(payload);

      // 2. Fetch staff list from users endpoint (copied from Manager Dashboard source)
      if (usersApi?.list) {
        const staffRes = await usersApi.list();
        const users = staffRes?.data || staffRes || [];
        setStaffList(users);
      } else if (payload.staff) {
        setStaffList(payload.staff);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err.message || 'Failed to load dashboard data');
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

  // Safely extract mechanic activity logs and jobs
  const todayJobs = data?.todayJobs || [];
  const upcomingJobs = data?.upcoming || [];

  // Combine logs for the mechanic view
  const activityLogs = [...todayJobs, ...upcomingJobs];

  // Filter completed/accomplished jobs specifically for this mechanic
  const accomplishedJobs = activityLogs.filter(
    (job) => job.status === 'completed' || job.status === 'accomplished'
  );

  return (
    <div className="page">
      <h1>Mechanic Dashboard</h1>

      {/* Tabs Header */}
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

      {data?.today && (
        <p className="range-label small">
          Today: {formatDate(data.today)}
        </p>
      )}

      <Banner message={error} onDismiss={() => setError('')} />
      <Banner tone="success" message={notice} onDismiss={() => setNotice('')} />

      {/* 1. Logs Tab */}
      {tab === 'logs' && (
        <section>
          <div className="stat-row">
            <div className="stat">
              <b>{todayJobs.length}</b>
              <span>Today's Jobs</span>
            </div>

            <div className="stat">
              <b>{upcomingJobs.length}</b>
              <span>Upcoming</span>
            </div>

            <div className="stat">
              <b>{accomplishedJobs.length}</b>
              <span>Accomplished</span>
            </div>
          </div>

          {activityLogs.length ? (
            activityLogs.map((log) => (
              <LogEntry key={log._id || log.id} log={log} />
            ))
          ) : (
            <EmptyState
              title="No activity in this view"
              hint="Check back later for new task assignments."
            />
          )}
        </section>
      )}

      {/* 2. Staff Tab (exact layout from Manager Dashboard) */}
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
              {staffList.length ? (
                staffList.map((s) => (
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
                    No staff members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Accomplished Tab */}
      {tab === 'accomplished' && (
        <section>
          {accomplishedJobs.length ? (
            accomplishedJobs.map((job) => (
              <LogEntry key={job._id || job.id} log={job} />
            ))
          ) : (
            <EmptyState
              title="No accomplished jobs yet"
              hint="Jobs marked as completed will appear here."
            />
          )}
        </section>
      )}
    </div>
  );
}