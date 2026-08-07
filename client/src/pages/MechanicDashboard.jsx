import { useEffect, useState, useCallback } from 'react';
import { dashboardApi, usersApi, jobsApi } from '../api/client.js';
import LogEntry from '../components/LogEntry.jsx';
import JobCard from '../components/JobCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Banner from '../components/Banner.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { toDateKey, formatDate, initials } from '../utils.js';

const TABS = ['logs', 'staff', 'accomplished'];

export default function MechanicDashboard() {
  const [tab, setTab] = useState('logs');
  const [data, setData] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [accomplishedJobs, setAccomplishedJobs] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
  try {
    const [dashRes, jobsRes] = await Promise.all([
      dashboardApi.logs({ view: 'week', date: toDateKey() }),
      jobsApi.list({ view: 'week', date: toDateKey(), status: 'ready-for-pickup,completed' }),
    ]);

    setData(dashRes);
    setAccomplishedJobs(jobsRes.data || []);

    if (usersApi?.list) {
      const staffRes = await usersApi.list();
      setStaffList(staffRes.data || []);
    }
  } catch (err) {
    console.error(err);
    setError(err.message);
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

  const logs = data?.data?.logs || [];

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

      {data?.range && (
        <p className="range-label small">
          {formatDate(data.range.from)} to {formatDate(data.range.to)}
        </p>
      )}

      <Banner message={error} onDismiss={() => setError('')} />
      <Banner tone="success" message={notice} onDismiss={() => setNotice('')} />

      {/* 1. Logs Tab */}
      {tab === 'logs' && (
        <section>
          <div className="stat-row">
            <div className="stat">
              <b>{data.data.jobs.scheduled}</b>
              <span>Scheduled</span>
            </div>

            <div className="stat">
              <b>{data.data.jobs['in-progress']}</b>
                <span>In Progress</span>
            </div>

            <div className="stat">
              <b>{accomplishedJobs.length}</b>
              <span>Accomplished</span>
            </div>
          </div>

          {logs.length ? (
              logs.map((log) => (
                <LogEntry key={log._id} log={log} />
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
              <JobCard key={job._id} job={job} />
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