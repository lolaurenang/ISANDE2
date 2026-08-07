/**
 * Reports: one consolidated summary for the manager to review or hand
 * off - staff hours, attendance, and completed vs scheduled jobs for a
 * week / month / year, with a CSV download for record-keeping.
 */
import { useEffect, useState, useCallback } from 'react';
import { reportsApi } from '../api/client.js';
import ViewToggle from '../components/ViewToggle.jsx';
import Banner from '../components/Banner.jsx';
import Spinner from '../components/Spinner.jsx';
import Icon from '../components/Icon.jsx';
import { toDateKey, formatDate, initials } from '../utils.js';

const JOB_STATUS_LABELS = {
  scheduled: 'Scheduled',
  'in-progress': 'In progress',
  'for-approval': 'For approval',
  'ready-for-pickup': 'Ready for pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function toCsv(rows) {
  const header = ['Name', 'Job title', 'Department', 'Hours', 'Days present', 'Completed jobs'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [r.fullName, r.jobTitle, r.department, r.totalHours, r.daysPresent, r.completedJobs]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
  }
  return lines.join('\n');
}

function download(filename, content, type = 'text/csv') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [view, setView] = useState('month');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await reportsApi.summary({ view, date: toDateKey() });
      setReport(res);
    } catch (err) {
      setError(err.message);
    }
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  if (!report) return <Spinner label="Building the report" />;

  const { staffSummary, jobStatusTotals, jobTypeTotals, totals } = report.data;

  function downloadCsv() {
    const csv = toCsv(staffSummary);
    download(`andoys-report-${report.range.from}-to-${report.range.to}.csv`, csv);
  }

  return (
    <div className="page">
      <div className="page-top-row">
        <h1 className="page-heading">Reports</h1>
        <ViewToggle value={view} onChange={setView} />
      </div>

      <Banner message={error} onDismiss={() => setError('')} />

      <p className="range-label small">
        {formatDate(report.range.from)} to {formatDate(report.range.to)}
      </p>

      <div className="stat-row">
        <div className="stat">
          <b>{totals.staffCount}</b>
          <span>Active staff</span>
        </div>
        <div className="stat">
          <b>{totals.totalHours}</b>
          <span>Hours logged</span>
        </div>
        <div className="stat">
          <b>{totals.totalCompletedJobs}</b>
          <span>Jobs completed</span>
        </div>
        <div className="stat">
          <b>{totals.totalJobsInRange}</b>
          <span>Jobs in range</span>
        </div>
      </div>

      <div className="page-top-row" style={{ marginTop: '18px' }}>
        <p className="section-label">Staff summary</p>
        <button type="button" className="btn btn-sm btn-primary" onClick={downloadCsv}>
          <Icon name="download" size={16} /> Download CSV
        </button>
      </div>

      <div className="card table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Job title</th>
              <th>Department</th>
              <th>Hours</th>
              <th>Days present</th>
              <th>Completed jobs</th>
            </tr>
          </thead>
          <tbody>
            {staffSummary.map((s) => (
              <tr key={s.id}>
                <td>
                  <span className="avatar-sm">{initials(s.fullName)}</span>
                  {s.fullName}
                </td>
                <td>{s.jobTitle}</td>
                <td>{s.department}</td>
                <td>
                  <b>{s.totalHours}</b>
                </td>
                <td>{s.daysPresent}</td>
                <td>{s.completedJobs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="section-label" style={{ marginTop: '18px' }}>Jobs by status</p>
      <div className="stat-row">
        {Object.entries(jobStatusTotals).map(([key, count]) => (
          <div className="stat" key={key}>
            <b>{count}</b>
            <span>{JOB_STATUS_LABELS[key] || key}</span>
          </div>
        ))}
      </div>

      {Object.keys(jobTypeTotals).length > 0 && (
        <>
          <p className="section-label" style={{ marginTop: '18px' }}>Jobs by service type</p>
          <div className="stat-row">
            {Object.entries(jobTypeTotals).map(([key, count]) => (
              <div className="stat" key={key}>
                <b>{count}</b>
                <span>{key.replace(/-/g, ' ')}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
