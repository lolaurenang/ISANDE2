/**
 * Schedule: two tabs.
 *   Jobs         - today's and upcoming work; managers add, assign and edit
 *   Availability - the days you can work (delegated to AvailabilityPanel)
 *
 * When a manager picks dates in the Add job form, the assignee list is
 * checked against who is actually free, so a clash is visible before the
 * form is submitted rather than only as a 409 afterwards.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { jobsApi, usersApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import AvailabilityPanel from '../components/AvailabilityPanel.jsx';
import JobCard from '../components/JobCard.jsx';
import Modal from '../components/Modal.jsx';
import Banner from '../components/Banner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Spinner from '../components/Spinner.jsx';
import { toDateKey } from '../utils.js';

const SERVICE_TYPES = [
  ['motorcycle-repair', 'Motorcycle repair'],
  ['bike-repair', 'Bike repair'],
  ['oil-change', 'Oil change'],
  ['engine-tuneup', 'Engine tune-up'],
  ['overhaul', 'Overhaul'],
  ['wheel-alignment', 'Wheel alignment'],
  ['supplier-delivery', 'Supplier delivery'],
  ['other', 'Other'],
];

const emptyJob = () => ({
  title: '',
  description: '',
  serviceType: 'motorcycle-repair',
  clientName: '',
  startDate: toDateKey(),
  endDate: toDateKey(),
  assignedTo: '',
  priority: 'normal',
});

export default function Schedule() {
  const { user, isManager } = useAuth();
  const [tab, setTab] = useState(isManager ? 'jobs' : 'availability');

  const [jobs, setJobs] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const staffLoaded = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(emptyJob());
  const [editingId, setEditingId] = useState(null);
  const [freeIds, setFreeIds] = useState(null); // null = not checked yet
  const [checking, setChecking] = useState(false);

  const [logTarget, setLogTarget] = useState(null);
  const [logDraft, setLogDraft] = useState({ work: '', clientName: '' });

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobsApi.list({ view: 'month', date: toDateKey() });
      setJobs(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Staff list is fetched once, not on every job reload.
  useEffect(() => {
    if (!isManager || staffLoaded.current) return;
    staffLoaded.current = true;
    usersApi
      .list()
      .then((res) => setStaff(res.data.filter((s) => s.role !== 'manager')))
      .catch((err) => setError(err.message));
  }, [isManager]);

  /* ------------------------- availability-aware assign ------------------------ */
  // Ask the server who is genuinely free across the chosen dates: declared
  // available every day AND not already booked.
  useEffect(() => {
    if (!modalOpen || !isManager || !draft.startDate || !draft.endDate) return;
    if (draft.startDate > draft.endDate) {
      setFreeIds(null);
      return;
    }

    let cancelled = false;
    setChecking(true);

    jobsApi
      .suggest({ startDate: draft.startDate, endDate: draft.endDate })
      .then((res) => {
        if (!cancelled) setFreeIds(new Set(res.data.map((u) => u._id)));
      })
      .catch(() => {
        if (!cancelled) setFreeIds(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [modalOpen, isManager, draft.startDate, draft.endDate]);

  /* ---------------------------------- jobs ---------------------------------- */
  function openNew() {
    setDraft(emptyJob());
    setEditingId(null);
    setFreeIds(null);
    setModalOpen(true);
  }

  function openEdit(job) {
    setDraft({
      title: job.title,
      description: job.description,
      serviceType: job.serviceType,
      clientName: job.clientName,
      startDate: toDateKey(job.startDate),
      endDate: toDateKey(job.endDate),
      assignedTo: job.assignedTo?._id || job.assignedTo || '',
      priority: job.priority,
    });
    setEditingId(job._id);
    setFreeIds(null);
    setModalOpen(true);
  }

  async function saveJob(e) {
    e.preventDefault();
    setError('');

    if (draft.startDate > draft.endDate) {
      setError('The end date cannot be before the start date');
      return;
    }

    const payload = { ...draft, assignedTo: draft.assignedTo || null };

    try {
      if (editingId) {
        await jobsApi.update(editingId, payload);
        setNotice('Job updated');
      } else {
        await jobsApi.create(payload);
        setNotice('Job scheduled');
      }
      setModalOpen(false);
      await loadJobs();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeJob(id) {
    if (!window.confirm('Remove this job from the schedule?')) return;
    try {
      await jobsApi.remove(id);
      setNotice('Job removed');
      await loadJobs();
    } catch (err) {
      setError(err.message);
    }
  }

  async function advance(job, status) {
    try {
      await jobsApi.update(job._id, { status });
      setNotice(`"${job.title}" is now ${status}`);
      await loadJobs();
    } catch (err) {
      setError(err.message);
    }
  }

  async function claim(job) {
    try {
      await jobsApi.update(job._id, { assignedTo: user.id, status: 'in-progress' });
      setNotice(`You picked up "${job.title}"`);
      await loadJobs();
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitWorkLog(e) {
    e.preventDefault();
    try {
      await jobsApi.logWork(logTarget._id, logDraft);
      setNotice('Work logged');
      setLogTarget(null);
      setLogDraft({ work: '', clientName: '' });
    } catch (err) {
      setError(err.message);
    }
  }

  const todayKey = toDateKey();
  const todayJobs = jobs.filter(
    (j) => toDateKey(j.startDate) <= todayKey && todayKey <= toDateKey(j.endDate)
  );
  const upcoming = jobs.filter((j) => toDateKey(j.startDate) > todayKey);
  const openJobs = jobs.filter((j) => !j.assignedTo && j.status === 'scheduled');

  const selectedIsBusy =
    freeIds && draft.assignedTo && !freeIds.has(draft.assignedTo);

  return (
    <div className="page">
      <div className="page-top-row">
        <h1 className="page-heading">Schedule</h1>
        {isManager && (
          <button type="button" className="btn btn-primary btn-sm" onClick={openNew}>
            Add job
          </button>
        )}
      </div>

      <div className="tabs">
        <button type="button" className={tab === 'jobs' ? 'active' : ''} onClick={() => setTab('jobs')}>
          Jobs
        </button>
        <button
          type="button"
          className={tab === 'availability' ? 'active' : ''}
          onClick={() => setTab('availability')}
        >
          Availability
        </button>
      </div>

      {tab === 'availability' && <AvailabilityPanel isManager={isManager} />}

      {tab === 'jobs' && (
        <>
          <Banner message={error} onDismiss={() => setError('')} />
          <Banner tone="success" message={notice} onDismiss={() => setNotice('')} />

          {loading && !jobs.length ? (
            <Spinner label="Loading the schedule" />
          ) : (
            <div className="schedule-stack">
              <section>
                <p className="section-label">Today&rsquo;s schedule</p>
                {todayJobs.length ? (
                  todayJobs.map((job) => (
                    <JobCard
                      key={job._id}
                      job={job}
                      showAssignee={isManager}
                      actions={
                        <>
                          {job.status !== 'completed' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-dark"
                              onClick={() => advance(job, 'completed')}
                            >
                              Mark completed
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => setLogTarget(job)}
                          >
                            Log work
                          </button>
                          {isManager && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                onClick={() => openEdit(job)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => removeJob(job._id)}
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </>
                      }
                    />
                  ))
                ) : (
                  <EmptyState title="Nothing scheduled for today" />
                )}
              </section>

              {openJobs.length > 0 && !isManager && (
                <section>
                  <p className="section-label">Open jobs you can pick up</p>
                  {openJobs.map((job) => (
                    <JobCard
                      key={job._id}
                      job={job}
                      actions={
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => claim(job)}>
                          Take this job
                        </button>
                      }
                    />
                  ))}
                </section>
              )}

              {openJobs.length > 0 && isManager && (
                <section>
                  <p className="section-label">Still unassigned</p>
                  {openJobs.map((job) => (
                    <JobCard
                      key={job._id}
                      job={job}
                      showAssignee
                      actions={
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => openEdit(job)}>
                          Assign someone
                        </button>
                      }
                    />
                  ))}
                </section>
              )}

              <section>
                <p className="section-label">Upcoming schedules</p>
                {upcoming.length ? (
                  upcoming.map((job) => (
                    <JobCard
                      key={job._id}
                      job={job}
                      showAssignee={isManager}
                      actions={
                        isManager && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => openEdit(job)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => removeJob(job._id)}
                            >
                              Remove
                            </button>
                          </>
                        )
                      }
                    />
                  ))
                ) : (
                  <EmptyState title="Nothing booked after today" />
                )}
              </section>
            </div>
          )}
        </>
      )}

      {/* ------------------------------ add / edit ------------------------------ */}
      <Modal open={modalOpen} title={editingId ? 'Edit job' : 'Add job'} onClose={() => setModalOpen(false)}>
        <form className="stack-form" onSubmit={saveJob}>
          <label className="field">
            <span>Job title</span>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Motorcycle repair"
              required
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              rows="3"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Inspect and replace the damaged clutch cable."
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Service type</span>
              <select
                value={draft.serviceType}
                onChange={(e) => setDraft({ ...draft, serviceType: e.target.value })}
              >
                {SERVICE_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Client</span>
              <input
                value={draft.clientName}
                onChange={(e) => setDraft({ ...draft, clientName: e.target.value })}
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Starts</span>
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Ends</span>
              <input
                type="date"
                value={draft.endDate}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                required
              />
            </label>
          </div>

          <label className="field">
            <span>
              Assign to
              {checking && <em className="field-note"> checking who is free...</em>}
            </span>
            <select
              value={draft.assignedTo}
              onChange={(e) => setDraft({ ...draft, assignedTo: e.target.value })}
            >
              <option value="">Leave open for anyone to pick up</option>
              {staff.map((s) => {
                const free = !freeIds || freeIds.has(s._id);
                return (
                  <option key={s._id} value={s._id}>
                    {free ? '' : '(busy or unavailable) '}
                    {s.fullName} - {s.jobTitle}
                  </option>
                );
              })}
            </select>
          </label>

          {freeIds && (
            <p className={`assign-hint ${selectedIsBusy ? 'warn' : ''}`}>
              {selectedIsBusy
                ? 'That person is already booked on these dates, or has not marked themselves available. Saving will be refused.'
                : `${freeIds.size} ${freeIds.size === 1 ? 'person is' : 'people are'} free across these dates.`}
            </p>
          )}

          <button className="btn btn-primary" type="submit">
            {editingId ? 'Save changes' : 'Schedule job'}
          </button>
        </form>
      </Modal>

      {/* -------------------------------- log work ------------------------------ */}
      <Modal open={Boolean(logTarget)} title="Log work" onClose={() => setLogTarget(null)}>
        <form className="stack-form" onSubmit={submitWorkLog}>
          <label className="field">
            <span>What did you do?</span>
            <input
              value={logDraft.work}
              onChange={(e) => setLogDraft({ ...logDraft, work: e.target.value })}
              placeholder="Repaired wheels"
              required
            />
          </label>
          <label className="field">
            <span>Client</span>
            <input
              value={logDraft.clientName}
              onChange={(e) => setLogDraft({ ...logDraft, clientName: e.target.value })}
              placeholder={logTarget?.clientName || 'Walk-in'}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Save log
          </button>
        </form>
      </Modal>
    </div>
  );
}
