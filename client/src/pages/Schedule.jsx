/**
 * Schedule: two tabs, exactly as in the prototype.
 *   Availability - tap the days you can work (mechanics)
 *   Jobs         - today's and upcoming work; managers can add and assign
 */
import { useEffect, useState, useCallback } from 'react';
import { jobsApi, availabilityApi, usersApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import JobCard from '../components/JobCard.jsx';
import Modal from '../components/Modal.jsx';
import Banner from '../components/Banner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Spinner from '../components/Spinner.jsx';
import { toDateKey, formatDate } from '../utils.js';

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
  const [anchor, setAnchor] = useState(new Date());

  const [jobs, setJobs] = useState([]);
  const [slots, setSlots] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(emptyJob());
  const [editingId, setEditingId] = useState(null);

  const [logTarget, setLogTarget] = useState(null);
  const [logDraft, setLogDraft] = useState({ work: '', clientName: '' });

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);

      const [jobRes, slotRes] = await Promise.all([
        jobsApi.list({ view: 'month', date: toDateKey(anchor) }),
        availabilityApi.list({ from: toDateKey(monthStart), to: toDateKey(monthEnd) }),
      ]);
      setJobs(jobRes.data);
      setSlots(slotRes.data);

      if (isManager && !staff.length) {
        const staffRes = await usersApi.list();
        setStaff(staffRes.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [anchor, isManager, staff.length]);

  useEffect(() => {
    load();
  }, [load]);

  /* ------------------------------- availability ------------------------------ */
  const myKeys = slots.filter((s) => s.isAvailable).map((s) => s.workDate);

  async function toggleDay(key) {
    setError('');
    try {
      if (myKeys.includes(key)) {
        await availabilityApi.remove(key);
        setNotice(`Removed ${formatDate(key)} from your availability`);
      } else {
        await availabilityApi.set({ workDate: key });
        setNotice(`You are marked available on ${formatDate(key)}`);
      }
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  /* ---------------------------------- jobs ---------------------------------- */
  function openNew() {
    setDraft(emptyJob());
    setEditingId(null);
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
    setModalOpen(true);
  }

  async function saveJob(e) {
    e.preventDefault();
    setError('');
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
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeJob(id) {
    if (!window.confirm('Remove this job from the schedule?')) return;
    try {
      await jobsApi.remove(id);
      setNotice('Job removed');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function advance(job, status) {
    try {
      await jobsApi.update(job._id, { status });
      setNotice(`"${job.title}" is now ${status}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function claim(job) {
    try {
      await jobsApi.update(job._id, { assignedTo: user.id, status: 'in-progress' });
      setNotice(`You picked up "${job.title}"`);
      await load();
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
  const todayJobs = jobs.filter((j) => toDateKey(j.startDate) <= todayKey && todayKey <= toDateKey(j.endDate));
  const upcoming = jobs.filter((j) => toDateKey(j.startDate) > todayKey);
  const open = jobs.filter((j) => !j.assignedTo && j.status === 'scheduled');

  if (loading && !jobs.length) return <Spinner label="Loading the schedule" />;

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

      <Banner message={error} onDismiss={() => setError('')} />
      <Banner tone="success" message={notice} onDismiss={() => setNotice('')} />

      {tab === 'availability' && (
        <div className="schedule-grid">
          <div className="card">
            <MonthCalendar
              year={anchor.getFullYear()}
              month={anchor.getMonth()}
              markedKeys={myKeys}
              onSelect={toggleDay}
              onNavigate={(d) => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + d, 1))}
              variant="compact"
            />
            <p className="help-text">
              Tap a day to mark yourself available. Tap it again to take it back.
            </p>
          </div>

          <div>
            <p className="section-label">You are available on</p>
            {myKeys.length ? (
              <ul className="chip-list">
                {myKeys.sort().map((key) => (
                  <li key={key} className="chip">
                    {formatDate(key)}
                    <button type="button" onClick={() => toggleDay(key)} aria-label={`Remove ${key}`}>
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="No days marked yet"
                hint="Pick the days you can come in so the manager can book you."
              />
            )}
          </div>
        </div>
      )}

      {tab === 'jobs' && (
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
                        <button type="button" className="btn btn-sm btn-dark" onClick={() => advance(job, 'completed')}>
                          Mark completed
                        </button>
                      )}
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setLogTarget(job)}>
                        Log work
                      </button>
                      {isManager && (
                        <>
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => openEdit(job)}>
                            Edit
                          </button>
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => removeJob(job._id)}>
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

          {open.length > 0 && !isManager && (
            <section>
              <p className="section-label">Open jobs you can pick up</p>
              {open.map((job) => (
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
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => openEdit(job)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => removeJob(job._id)}>
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

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit job' : 'Add job'}
        onClose={() => setModalOpen(false)}
      >
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
            <span>Assign to</span>
            <select
              value={draft.assignedTo}
              onChange={(e) => setDraft({ ...draft, assignedTo: e.target.value })}
            >
              <option value="">Leave open for anyone to pick up</option>
              {staff
                .filter((s) => s.role !== 'manager')
                .map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.fullName} - {s.jobTitle}
                  </option>
                ))}
            </select>
          </label>

          <button className="btn btn-primary" type="submit">
            {editingId ? 'Save changes' : 'Schedule job'}
          </button>
        </form>
      </Modal>

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
