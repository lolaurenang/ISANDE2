/**
 * Reports (manager only).
 *
 * Pick a report and a date range, see the rows on screen, then take them
 * away as a CSV or a printed page. The preview and the download come
 * from the same endpoint, so the file can never disagree with what was
 * on screen when Download was pressed.
 */
import { useEffect, useState, useCallback } from 'react';
import { reportsApi } from '../api/client.js';
import Banner from '../components/Banner.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import { toDateKey, formatDate } from '../utils.js';

/** Quick ranges, so nobody has to think about what "last month" means. */
const PRESETS = [
  { id: 'this-week', label: 'This week' },
  { id: 'last-week', label: 'Last week' },
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'this-year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
];

function presetRange(id) {
  const now = new Date();
  const key = (d) => toDateKey(d);

  if (id === 'this-week' || id === 'last-week') {
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay() - (id === 'last-week' ? 7 : 0));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: key(start), to: key(end) };
  }

  if (id === 'last-month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: key(start), to: key(end) };
  }

  if (id === 'this-year') {
    return { from: key(new Date(now.getFullYear(), 0, 1)), to: key(new Date(now.getFullYear(), 11, 31)) };
  }

  // this-month
  return {
    from: key(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: key(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

const PREVIEW_LIMIT = 60;

export default function Reports() {
  const [types, setTypes] = useState([]);
  const [type, setType] = useState('hours');
  const [preset, setPreset] = useState('this-month');
  const [range, setRange] = useState(presetRange('this-month'));

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    reportsApi
      .types()
      .then((res) => setTypes(res.data))
      .catch((err) => setError(err.message));
  }, []);

  const run = useCallback(async () => {
    if (range.from > range.to) {
      setError('The start date has to be on or before the end date');
      return;
    }
    setLoading(true);
    setError('');
    setShowAll(false);
    try {
      const res = await reportsApi.run(type, range);
      setReport(res.data);
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [type, range]);

  useEffect(() => {
    run();
  }, [run]);

  function choosePreset(id) {
    setPreset(id);
    if (id !== 'custom') setRange(presetRange(id));
  }

  async function download() {
    setDownloading(true);
    setError('');
    try {
      const filename = await reportsApi.download(type, range);
      setNotice(`Saved ${filename} to your downloads`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  const current = types.find((t) => t.id === type);
  const rows = report ? (showAll ? report.rows : report.rows.slice(0, PREVIEW_LIMIT)) : [];
  const hidden = report ? report.rows.length - rows.length : 0;

  return (
    <div className="page report-page">
      <div className="page-top-row no-print">
        <h1 className="page-heading">Reports</h1>
      </div>

      <Banner message={error} onDismiss={() => setError('')} />
      <Banner tone="success" message={notice} onDismiss={() => setNotice('')} />

      {/* ---------------------------- controls ---------------------------- */}
      <section className="card report-controls no-print">
        <div className="report-types" role="radiogroup" aria-label="Report">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={type === t.id}
              className={`report-type ${type === t.id ? 'active' : ''}`}
              onClick={() => setType(t.id)}
            >
              <b>{t.name}</b>
              <span>{t.description}</span>
            </button>
          ))}
        </div>

        <div className="report-range">
          <div className="preset-row">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`preset ${preset === p.id ? 'active' : ''}`}
                onClick={() => choosePreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="date-row">
            <label className="field">
              <span>From</span>
              <input
                type="date"
                value={range.from}
                onChange={(e) => {
                  setPreset('custom');
                  setRange({ ...range, from: e.target.value });
                }}
              />
            </label>
            <label className="field">
              <span>To</span>
              <input
                type="date"
                value={range.to}
                onChange={(e) => {
                  setPreset('custom');
                  setRange({ ...range, to: e.target.value });
                }}
              />
            </label>
          </div>
        </div>
      </section>

      {/* ----------------------------- result ----------------------------- */}
      {loading && <Spinner label="Building the report" />}

      {!loading && report && (
        <>
          <header className="report-head">
            <div>
              <h2>{report.title}</h2>
              <p className="report-meta">
                {formatDate(report.range.from)} to {formatDate(report.range.to)} &middot;{' '}
                {report.count === 1 ? '1 row' : `${report.count} rows`} &middot; prepared by{' '}
                {report.generatedBy}
              </p>
              <p className="report-brand">Andoy&rsquo;s Enterprises &middot; San Miguel, Jordan, Guimaras</p>
            </div>

            <div className="report-actions no-print">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={download}
                disabled={downloading || !report.count}
              >
                <Icon name="add" size={16} />
                {downloading ? 'Preparing...' : 'Download CSV'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => window.print()}
                disabled={!report.count}
              >
                Print / Save as PDF
              </button>
            </div>
          </header>

          {report.count ? (
            <div className="card table-card report-table">
              <table className="table">
                <thead>
                  <tr>
                    {report.columns.map((c) => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    // Report rows are a flat snapshot with no stable id of
                    // their own, and the list is never reordered, so the
                    // index is a safe key here.
                    <tr key={i}>
                      {report.columns.map((c) => (
                        <td key={c.key}>{row[c.key] === '' ? '-' : row[c.key]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {hidden > 0 && (
                <div className="report-more no-print">
                  <p>
                    Showing the first {PREVIEW_LIMIT} of {report.count} rows. The download and the
                    printout include every row.
                  </p>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAll(true)}>
                    Show all {report.count} rows
                  </button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title="No rows in this range"
              hint={`There is no ${current?.name.toLowerCase() || 'data'} between those dates. Try a wider range.`}
            />
          )}
        </>
      )}
    </div>
  );
}
