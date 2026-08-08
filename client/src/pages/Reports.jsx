/**
 * Reports: two standalone, printable "papers" for turnover/hand-off -
 * employee hours worked, and tasks accomplished (filterable by mechanic,
 * service type, and client) - each with CSV and a real A4 PDF export
 * (company header + page numbers), over a date range the manager picks.
 */
import { useEffect, useState, useCallback } from 'react';
import { reportsApi, usersApi } from '../api/client.js';
import Banner from '../components/Banner.jsx';
import Spinner from '../components/Spinner.jsx';
import Icon from '../components/Icon.jsx';
import { toDateKey, formatDate, initials } from '../utils.js';
import { SERVICE_TYPES } from '../constants.js';
import { downloadReportPdf } from '../utils/pdfReport.js';

function csvCell(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  return { from: toDateKey(from), to: toDateKey(to) };
}

export default function Reports() {
  const [range, setRange] = useState(defaultRange());
  const [mechanics, setMechanics] = useState([]);
  const [filters, setFilters] = useState({ mechanic: '', serviceType: '', clientName: '' });
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    usersApi.list({ role: 'mechanic' }).then((res) => setMechanics(res.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await reportsApi.summary({ ...range, ...filters });
      setReport(res);
    } catch (err) {
      setError(err.message);
    }
  }, [range, filters]);

  useEffect(() => {
    load();
  }, [load]);

  function applyQuick(kind) {
    const to = new Date();
    const from = new Date();
    if (kind === 'week') from.setDate(from.getDate() - 7);
    else if (kind === 'year') from.setFullYear(from.getFullYear() - 1);
    else from.setMonth(from.getMonth() - 1);
    setRange({ from: toDateKey(from), to: toDateKey(to) });
  }

  if (!report) return <Spinner label="Building the report" />;

  const { staffHours, tasksAccomplished } = report.data;
  const rangeLabel = `${formatDate(report.range.from)} to ${formatDate(report.range.to)}`;

  function downloadHoursCsv() {
    const header = ['Name', 'Job title', 'Department', 'Hours', 'Days present', 'Completed jobs'];
    const lines = [header.map(csvCell).join(',')];
    for (const s of staffHours) {
      lines.push(
        [s.fullName, s.jobTitle, s.department, s.totalHours, s.daysPresent, s.completedJobs].map(csvCell).join(',')
      );
    }
    downloadCsv(`andoys-hours-${report.range.from}-to-${report.range.to}.csv`, lines.join('\n'));
  }

  function downloadHoursPdf() {
    downloadReportPdf({
      title: 'Employee Hours Worked',
      rangeLabel,
      columns: ['Name', 'Job title', 'Department', 'Hours', 'Days present', 'Completed jobs'],
      rows: staffHours.map((s) => [s.fullName, s.jobTitle, s.department, s.totalHours, s.daysPresent, s.completedJobs]),
      filename: `andoys-hours-${report.range.from}-to-${report.range.to}.pdf`,
    });
  }

  function downloadTasksCsv() {
    const header = ['Task', 'Client', 'Service type', 'Mechanic(s)', 'Completed on'];
    const lines = [header.map(csvCell).join(',')];
    for (const t of tasksAccomplished) {
      lines.push(
        [t.title, t.clientName, t.serviceType, t.mechanics, t.completedAt ? formatDate(t.completedAt) : '']
          .map(csvCell)
          .join(',')
      );
    }
    downloadCsv(`andoys-tasks-${report.range.from}-to-${report.range.to}.csv`, lines.join('\n'));
  }

  function downloadTasksPdf() {
    downloadReportPdf({
      title: 'Tasks Accomplished',
      rangeLabel,
      columns: ['Task', 'Client', 'Service type', 'Mechanic(s)', 'Completed on'],
      rows: tasksAccomplished.map((t) => [
        t.title,
        t.clientName,
        t.serviceType?.replace(/-/g, ' '),
        t.mechanics,
        t.completedAt ? formatDate(t.completedAt) : '-',
      ]),
      filename: `andoys-tasks-${report.range.from}-to-${report.range.to}.pdf`,
    });
  }

  return (
    <div className="page">
      <div className="page-top-row">
        <h1 className="page-heading">Reports</h1>
      </div>

      <Banner message={error} onDismiss={() => setError('')} />

      <div className="report-toolbar">
        <div className="field">
          <label htmlFor="report-from">From</label>
          <input
            id="report-from"
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="report-to">To</label>
          <input
            id="report-to"
            type="date"
            value={range.to}
            min={range.from}
            max={toDateKey()}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>&nbsp;</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => applyQuick('week')}>Week</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => applyQuick('month')}>Month</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => applyQuick('year')}>Year</button>
          </div>
        </div>
      </div>

      {/* ---------------- Paper 1: Employee hours worked ---------------- */}
      <section className="report-paper">
        <div className="report-paper-head">
          <div>
            <h2>Employee hours worked</h2>
            <p>{rangeLabel}</p>
          </div>
          <div className="report-actions">
            <button type="button" className="btn btn-sm btn-ghost" onClick={downloadHoursCsv}>
              <Icon name="download" size={16} /> CSV
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={downloadHoursPdf}>
              Save as PDF
            </button>
          </div>
        </div>
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
            {staffHours.map((s) => (
              <tr key={s.id}>
                <td>
                  <span className="avatar-sm">{initials(s.fullName)}</span>
                  {s.fullName}
                </td>
                <td>{s.jobTitle}</td>
                <td>{s.department}</td>
                <td><b>{s.totalHours}</b></td>
                <td>{s.daysPresent}</td>
                <td>{s.completedJobs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ---------------- Paper 2: Tasks accomplished ---------------- */}
      <section className="report-paper">
        <div className="report-paper-head">
          <div>
            <h2>Tasks accomplished</h2>
            <p>{rangeLabel}</p>
          </div>
          <div className="report-actions">
            <button type="button" className="btn btn-sm btn-ghost" onClick={downloadTasksCsv}>
              <Icon name="download" size={16} /> CSV
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={downloadTasksPdf}>
              Save as PDF
            </button>
          </div>
        </div>

        <div className="report-toolbar" style={{ margin: '0 0 14px' }}>
          <div className="field">
            <label htmlFor="filter-mechanic">Mechanic</label>
            <select
              id="filter-mechanic"
              value={filters.mechanic}
              onChange={(e) => setFilters((f) => ({ ...f, mechanic: e.target.value }))}
            >
              <option value="">All mechanics</option>
              {mechanics.map((m) => (
                <option key={m._id} value={m._id}>{m.fullName}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-service">Service type</label>
            <select
              id="filter-service"
              value={filters.serviceType}
              onChange={(e) => setFilters((f) => ({ ...f, serviceType: e.target.value }))}
            >
              <option value="">All service types</option>
              {SERVICE_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="filter-client">Client</label>
            <input
              id="filter-client"
              type="text"
              placeholder="Search by client name"
              value={filters.clientName}
              onChange={(e) => setFilters((f) => ({ ...f, clientName: e.target.value }))}
            />
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Client</th>
              <th>Service type</th>
              <th>Mechanic(s)</th>
              <th>Completed on</th>
            </tr>
          </thead>
          <tbody>
            {tasksAccomplished.length ? (
              tasksAccomplished.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>{t.clientName}</td>
                  <td>{t.serviceType?.replace(/-/g, ' ')}</td>
                  <td>{t.mechanics}</td>
                  <td>{t.completedAt ? formatDate(t.completedAt) : '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>No jobs completed in this range.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
