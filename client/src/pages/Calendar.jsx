/**
 * Calendar: week / month / year views of every job the user can see.
 * Managers can open a day and add a job straight from the grid.
 */
import { useEffect, useState, useCallback } from 'react';
import { dashboardApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import ViewToggle from '../components/ViewToggle.jsx';
import JobCard from '../components/JobCard.jsx';
import Banner from '../components/Banner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Icon from '../components/Icon.jsx';
import {
  MONTHS, DAY_SHORT, buildWeek, toDateKey, formatDate, jobCoversDate, jobTypeClass,
} from '../utils.js';

export default function Calendar() {
  const { isManager } = useAuth();
  const [view, setView] = useState('month');
  const [anchor, setAnchor] = useState(new Date());
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(toDateKey());
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await dashboardApi.calendar({ view, date: toDateKey(anchor) });
      setJobs(res.data);
    } catch (err) {
      setError(err.message);
    }
  }, [view, anchor]);

  useEffect(() => {
    load();
  }, [load]);

  const shift = (delta) => {
    const next = new Date(anchor);
    if (view === 'week') next.setDate(next.getDate() + delta * 7);
    else if (view === 'year') next.setFullYear(next.getFullYear() + delta);
    else next.setMonth(next.getMonth() + delta);
    setAnchor(next);
  };

  const heading =
    view === 'year'
      ? String(anchor.getFullYear())
      : view === 'week'
        ? `Week of ${formatDate(buildWeek(anchor)[0].date)}`
        : `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;

  const selectedJobs = jobs.filter((job) => jobCoversDate(job, selected));

  return (
    <div className="page">
      <div className="page-top-row">
        <h1 className="page-heading">Calendar</h1>
        <ViewToggle value={view} onChange={setView} />
      </div>

      <Banner message={error} onDismiss={() => setError('')} />

      <div className="range-bar">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous">
          <Icon name="back" size={18} />
        </button>
        <p className="range-label">{heading}</p>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next">
          <Icon name="next" size={18} />
        </button>
      </div>

      {view === 'month' && (
        <div className="card">
          <MonthCalendar
            year={anchor.getFullYear()}
            month={anchor.getMonth()}
            jobs={jobs}
            variant="full"
            selectedKey={selected}
            onSelect={setSelected}
          />
        </div>
      )}

      {view === 'week' && (
        <div className="card week-grid">
          {buildWeek(anchor).map((day, i) => {
            const dayJobs = jobs.filter((job) => jobCoversDate(job, day.key));
            return (
              <div key={day.key} className={`week-col ${day.isToday ? 'today' : ''}`}>
                <p className="week-col-head">
                  <span>{DAY_SHORT[i]}</span>
                  <b>{day.dayNumber}</b>
                </p>
                {dayJobs.map((job) => (
                  <div key={job._id} className={`event-block ${jobTypeClass(job.serviceType)}`}>
                    <b>{job.title}</b>
                    {job.assignedTo && <span>{job.assignedTo.fullName}</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {view === 'year' && (
        <div className="year-grid">
          {MONTHS.map((name, m) => {
            const count = jobs.filter(
              (job) => new Date(job.startDate).getMonth() === m
            ).length;
            return (
              <button
                type="button"
                key={name}
                className="year-cell"
                onClick={() => {
                  setAnchor(new Date(anchor.getFullYear(), m, 1));
                  setView('month');
                }}
              >
                <b>{name}</b>
                <span>{count === 1 ? '1 job' : `${count} jobs`}</span>
              </button>
            );
          })}
        </div>
      )}

      {view === 'month' && (
        <section className="day-detail">
          <p className="section-label">{formatDate(selected)}</p>
          {selectedJobs.length ? (
            selectedJobs.map((job) => <JobCard key={job._id} job={job} showAssignee={isManager} />)
          ) : (
            <EmptyState title="No jobs on this day" hint="Pick another date, or add one from the Schedule page." />
          )}
        </section>
      )}
    </div>
  );
}
