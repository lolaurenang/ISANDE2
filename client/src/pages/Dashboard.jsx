/**
 * Manager Dashboard: Logs, Staff, Hours and Requests.
 * This is the "consolidated performance data" the shop never had.
 */
import { useEffect, useState, useCallback } from 'react';
import { dashboardApi, attendanceApi, requestsApi, usersApi } from '../api/client.js';
import LogEntry from '../components/LogEntry.jsx';
import ViewToggle from '../components/ViewToggle.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Banner from '../components/Banner.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { toDateKey, formatDate, initials } from '../utils.js';

const TABS = ['logs', 'staff', 'hours', 'requests'];

export default function Dashboard() {
  const [tab, setTab] = useState('logs');
  const [view, setView] = useState('week');
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [dashRes, sumRes, reqRes] = await Promise.all([
        dashboardApi.manager({ view, date: toDateKey() }),
        attendanceApi.summary({ view, date: toDateKey() }),
        requestsApi.list(),
      ]);
      setData(dashRes);
      setSummary(sumRes.data);
      setRequests(reqRes.data);
    } catch (err) {
      setError(err.message);
    }
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id, status) {
    try {
      await requestsApi.review(id, { status });
      setNotice(`Request ${status}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function setStatus(userId, status) {
    try {
      await usersApi.update(userId, { status });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!data) return <Spinner label="Loading the dashboard" />;

  const pending = requests.filter((r) => r.status === 'pending');

  return (
    <div className="page">
      <div className="page-top-row">
        <h1 className="page-heading">Dashboard</h1>
        <ViewToggle value={view} onChange={setView} />
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
            {t === 'requests' && pending.length > 0 && <span className="tab-count">{pending.length}</span>}
          </button>
        ))}
      </div>

      <p className="range-label small">
        {formatDate(data.range.from)} to {formatDate(data.range.to)}
      </p>

      <Banner message={error} onDismiss={() => setError('')} />
      <Banner tone="success" message={notice} onDismiss={() => setNotice('')} />

      {tab === 'logs' && (
        <section>
          <div className="stat-row">
            <div className="stat">
              <b>{data.data.jobs.scheduled}</b>
              <span>Scheduled</span>
            </div>
            <div className="stat">
              <b>{data.data.jobs['in-progress']}</b>
              <span>In progress</span>
            </div>
            <div className="stat">
              <b>{data.data.jobs.completed}</b>
              <span>Completed</span>
            </div>
          </div>

          {data.data.logs.length ? (
            data.data.logs.map((log) => <LogEntry key={log._id} log={log} />)
          ) : (
            <EmptyState title="No activity in this range" hint="Try a wider view, or check back after the shop opens." />
          )}
        </section>
      )}

      {tab === 'staff' && (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Job title</th>
                <th>Department</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.data.staff.map((s) => (
                <tr key={s._id}>
                  <td>
                    <span className="avatar-sm">{initials(s.fullName)}</span>
                    {s.fullName}
                  </td>
                  <td>{s.jobTitle}</td>
                  <td>{s.department}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="row-actions">
                    <select value={s.status} onChange={(e) => setStatus(s._id, e.target.value)} aria-label={`Set status for ${s.fullName}`}>
                      <option value="available">Available</option>
                      <option value="on-duty">On duty</option>
                      <option value="absent">Absent</option>
                      <option value="off-duty">Off duty</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'hours' && (
        <div className="card table-card">
          {summary.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Hours</th>
                  <th>Days present</th>
                  <th>Late</th>
                  <th>Absent</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.employee?.id || Math.random()}>
                    <td>{row.employee?.fullName || 'Removed account'}</td>
                    <td>
                      <b>{row.totalHours}</b>
                      {row.targetHours && view === 'week' ? ` / ${row.targetHours}` : ''}
                    </td>
                    <td>{row.daysPresent}</td>
                    <td>{row.daysLate}</td>
                    <td>{row.daysAbsent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No hours recorded in this range" hint="Hours appear once staff start clocking in." />
          )}
        </div>
      )}

      {tab === 'requests' && (
        <section>
          {requests.length ? (
            requests.map((r) => (
              <article key={r._id} className="request-card">
                <div>
                  <p className="request-title">
                    {r.requestedBy?.fullName} &middot; {r.type.replace('-', ' ')}
                  </p>
                  <p className="request-date">{formatDate(r.workDate)}</p>
                  <p className="request-reason">{r.reason}</p>
                </div>
                <div className="request-actions">
                  <StatusBadge status={r.status} />
                  {r.status === 'pending' && (
                    <>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => review(r._id, 'approved')}>
                        Approve
                      </button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => review(r._id, 'denied')}>
                        Deny
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))
          ) : (
            <EmptyState title="No requests" hint="Leave and shift-change requests land here." />
          )}
        </section>
      )}
    </div>
  );
}
