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

const JOB_PERFORMED_OPTIONS = [
  "Inspection / Diagnosis",
  "General Repair",
  "Engine Repair",
  "Engine Tune-Up",
  "Oil Change",
  "Parts Replacement",
  "Brake Service",
  "Tire Service",
  "Chain & Sprocket Service",
  "Electrical Repair",
  "Battery Replacement",
  "Suspension Repair",
  "Fuel System Service",
  "Cooling System Service",
  "Cleaning / Detailing",
  "Quality Check / Test Ride",
  "Waiting for Parts",
  "Assisted Another Employee",
  "Other"
];

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

function parseWorkToDraft(workItems) {
  const work = [];
  const customItems = [];

  for (const item of workItems) {
    if (JOB_PERFORMED_OPTIONS.includes(item)) {
      work.push(item);
    } else {
      customItems.push(item);
    }
  }

  if (customItems.length) {
    work.push('Other');
  }

  return {
    work,
    otherWork: customItems.join(', '),
  };
}

const emptyLogDraft = () => ({ work: [], otherWork: '', clientName: '', assignedTo: '' });

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
  const [logDraft, setLogDraft] = useState(emptyLogDraft());

  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');

  const [detailTarget, setDetailTarget] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
    title: job.title || '',
    description: job.description || '',
    serviceType: job.serviceType || 'motorcycle-repair',
    otherService: job.otherService || '',
    clientName: job.clientName || '',
    startDate: toDateKey(job.startDate),
    endDate: toDateKey(job.endDate),
    assignedTo: job.assignedTo?._id || job.assignedTo || '',
    priority: job.priority || 'normal',
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

  async function markJobDone(job) {
    setError('');
    try {
      await jobsApi.update(job._id, { status: 'completed' });
      setNotice(`"${job.title}" marked as done`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function openApprovalModal(job) {
    setApprovalTarget(job);
    setApprovalNotes('');
  }

  function closeApprovalModal() {
    setApprovalTarget(null);
    setApprovalNotes('');
  }

  async function submitForApproval(e) {
    e.preventDefault();
    setError('');
    try {
      await jobsApi.update(approvalTarget._id, {
        status: 'for-approval',
        additionalNotes: approvalNotes.trim(),
      });
      setNotice(`"${approvalTarget.title}" submitted for approval`);
      closeApprovalModal();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function openJobDetails(job) {
    setDetailTarget(job);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await jobsApi.getDetails(job._id);
      setDetailData(res.data);
    } catch (err) {
      setError(err.message);
      setDetailTarget(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeJobDetails() {
    setDetailTarget(null);
    setDetailData(null);
  }

  function renderJobActions(job) {
    const isActive = !['completed', 'cancelled'].includes(job.status);
    const canSubmit = !isManager && ['scheduled', 'in-progress'].includes(job.status);
    const canLogWork = isActive && job.status !== 'for-approval';
    const showDetails = ['for-approval', 'completed'].includes(job.status);

    return (
      <>
        {isManager && job.status === 'for-approval' && (
          <button type="button" className="btn btn-sm btn-dark" onClick={() => markJobDone(job)}>
            Mark as done
          </button>
        )}
        {canSubmit && (
          <button type="button" className="btn btn-sm btn-dark" onClick={() => openApprovalModal(job)}>
            Job done
          </button>
        )}
        {canLogWork && !isManager && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => openWorkLog(job)}>
            Log work
          </button>
        )}
        {showDetails && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => openJobDetails(job)}>
            Details
          </button>
        )}
        {isManager && (
          <>
            <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => openEdit(job)}
          >
            Edit
          </button>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => removeJob(job._id)}>
              Remove
            </button>
          </>
        )}
      </>
    );
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

  async function loadSavedWorkDraft(job) {
    const draft = {
      ...emptyLogDraft(),
      clientName: job.clientName || '',
      assignedTo: job.assignedTo?._id || job.assignedTo || '',
    };

    try {
      const res = await jobsApi.getDetails(job._id);
      const { workByEmployee } = res.data;

      let workItems = [];
      if (isManager) {
        const assigneeName = job.assignedTo?.fullName;
        const employeeEntry = workByEmployee.find((entry) => entry.employeeName === assigneeName);
        workItems = employeeEntry?.work?.length
          ? employeeEntry.work
          : workByEmployee.flatMap((entry) => entry.work);
      } else {
        const myEntry = workByEmployee.find((entry) => entry.employeeName === user.fullName);
        workItems = myEntry?.work || [];
      }

      if (workItems.length) {
        return { ...draft, ...parseWorkToDraft(workItems) };
      }
    } catch (err) {
      setError(err.message);
    }

    return draft;
  }

  async function openWorkLog(job) {
    setLogTarget(job);
    setLogDraft(await loadSavedWorkDraft(job));
  }

  async function openWorkLogForManager(job) {
    setLogTarget(job);
    setLogDraft(await loadSavedWorkDraft(job));
  }

  function closeWorkLog() {
    setLogTarget(null);
    setLogDraft(emptyLogDraft());
  }

  async function submitWorkLog(e) {
    e.preventDefault();
    setError('');

    const selectedJobs = Array.isArray(logDraft.work) ? logDraft.work : [];
    const parts = selectedJobs.filter((item) => item !== 'Other');

    if (selectedJobs.includes('Other')) {
      const other = logDraft.otherWork.trim();
      if (!other) {
        setError('Describe what you did');
        return;
      }
      parts.push(other);
    }

    const work = parts.join(', ');

    try {
      if (isManager) {
        await jobsApi.update(logTarget._id, {
          clientName: logDraft.clientName,
          assignedTo: logDraft.assignedTo || null,
        });
      }

      if (work) {
        await jobsApi.logWork(logTarget._id, {
          work,
          clientName: logDraft.clientName,
        });
      }

      setNotice(isManager ? 'Job updated' : 'Work logged');
      closeWorkLog();
      await load();
    } catch (err) {
      const detail = err.details?.[0]?.message;
      setError(detail || err.message);
    }
  }

  const todayKey = toDateKey();
  const todayJobs = jobs.filter((j) => toDateKey(j.startDate) <= todayKey && todayKey <= toDateKey(j.endDate));
  const todayJobsDisplay = isManager
    ? todayJobs.filter((j) => j.status !== 'for-approval')
    : todayJobs;
  const upcoming = jobs.filter((j) => toDateKey(j.startDate) > todayKey);
  const open = jobs.filter((j) => !j.assignedTo && j.status === 'scheduled');
  const pendingApproval = jobs.filter((j) => j.status === 'for-approval');
  const selectedLogJobs = Array.isArray(logDraft.work) ? logDraft.work : [];

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
          {isManager && pendingApproval.length > 0 && (
            <section>
              <p className="section-label">Awaiting approval</p>
              {pendingApproval.map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  showAssignee
                  actions={renderJobActions(job)}
                />
              ))}
            </section>
          )}

          <section>
            <p className="section-label">Today&rsquo;s schedule</p>
            {todayJobsDisplay.length ? (
              todayJobsDisplay.map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  showAssignee={isManager}
                  actions={renderJobActions(job)}
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
    title={editingId ? "Edit job" : "Add job"} onClose={() => setModalOpen(false)}>
        <form className="stack-form" onSubmit={saveJob}>
          <label className="field">
            <span>Title</span>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
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
            <span>Client name</span>
            <input
              value={draft.clientName}
              onChange={(e) => setDraft({ ...draft, clientName: e.target.value })}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Start date</span>
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>End date</span>
              <input
                type="date"
                value={draft.endDate}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                required
              />
            </label>
          </div>
          <label className="field">
            <span>Assigned to</span>
            <select
              value={draft.assignedTo}
              onChange={(e) => setDraft({ ...draft, assignedTo: e.target.value })}
            >
              <option value="">Unassigned</option>
              {staff
                .filter((person) => person.role !== 'manager')
                .map((person) => (
                  <option key={person._id} value={person._id}>
                    {person.fullName}
                  </option>
                ))}
            </select>
          </label>
          <button className="btn btn-primary" type="submit">
            {editingId ? "Save changes" : "Schedule job"}
          </button>
        </form>
      </Modal>

      <Modal open={Boolean(approvalTarget)} title="Job done" onClose={closeApprovalModal}>
        <form className="stack-form" onSubmit={submitForApproval}>
          <p className="help-text">
            Submit this job for manager approval. Add any notes about the work below.
          </p>
          <label className="field">
            <span>Additional Notes</span>
            <textarea
              rows={4}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Anything the manager should know..."
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Submit for approval
          </button>
        </form>
      </Modal>

      <Modal open={Boolean(detailTarget)} title="Job details" onClose={closeJobDetails}>
        {detailLoading && <Spinner label="Loading details" />}
        {!detailLoading && detailData && (
          <dl className="detail-list">
            <div>
              <dt>Job</dt>
              <dd>{detailData.job.title}</dd>
            </div>
            {detailData.workByEmployee.length ? (
              detailData.workByEmployee
              .filter(
                ({ employeeName }) =>
                  employeeName === detailData.job.assignedTo?.fullName
              )
              .map(({ employeeName, work }) => (
                <div key={employeeName}>
                  <dt>Work Performed ({employeeName})</dt>
                  <dd>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                      {work.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))
            ) : (
              <div>
                <dt>Work Performed</dt>
                <dd>No work logged yet</dd>
              </div>
            )}
            <div>
              <dt>Additional Notes</dt>
              <dd>{detailData.additionalNotes || 'None'}</dd>
            </div>
          </dl>
        )}
      </Modal>

      <Modal open={Boolean(logTarget)} title="Log work" onClose={closeWorkLog}>
        <form className="stack-form" onSubmit={submitWorkLog}>
          {isManager && (
            <>
              <label className="field">
                <span>Client name</span>
                <input
                  value={logDraft.clientName}
                  onChange={(e) => setLogDraft({ ...logDraft, clientName: e.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Assigned to</span>
                <select
                  value={logDraft.assignedTo}
                  onChange={(e) => setLogDraft({ ...logDraft, assignedTo: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {staff
                    .filter((person) => person.role !== 'manager')
                    .map((person) => (
                      <option key={person._id} value={person._id}>
                        {person.fullName}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}
          <div className="field" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', textAlign: 'left' }}>
            <span style={{ display: 'block', textAlign: 'left', marginBottom: '6px', fontWeight: '500' }}>
              Jobs performed
            </span>
            <div 
              style={{
                maxHeight: '180px',
                overflowY: 'auto',
                overflowX: 'hidden',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                width: '100%'
              }}
            >
              {JOB_PERFORMED_OPTIONS.map((job) => {
                const isChecked = selectedLogJobs.includes(job);

                return (
                  <div 
                    key={job}
                    onClick={() => {
                      const updated = isChecked
                        ? selectedLogJobs.filter((item) => item !== job)
                        : [...selectedLogJobs, job];
                      setLogDraft({
                        ...logDraft,
                        work: updated,
                        otherWork: updated.includes('Other') ? logDraft.otherWork : '',
                      });
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'flex-start',
                      gap: '10px', 
                      cursor: 'pointer', 
                      width: '100%',
                      margin: 0,
                      padding: '4px 0',
                      userSelect: 'none'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      style={{ 
                        margin: 0, 
                        padding: 0,
                        cursor: 'pointer', 
                        flexShrink: 0,
                        width: '16px',
                        height: '16px'
                      }}
                    />
                    <span 
                      style={{ 
                        textAlign: 'left', 
                        lineHeight: '1.3',
                        margin: 0,
                        padding: 0,
                        fontSize: '14px',
                        color: '#333333',
                        display: 'inline',
                        width: 'auto'
                      }}
                    >
                      {job}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedLogJobs.includes('Other') && (
            <label className="field">
              <span>Other</span>
              <input
                value={logDraft.otherWork}
                onChange={(e) => setLogDraft({ ...logDraft, otherWork: e.target.value })}
                placeholder="Describe what you did..."
              />
            </label>
          )}

          <button className="btn btn-primary" type="submit">
            {isManager ? 'Save changes' : 'Save log'}
          </button>
        </form>
      </Modal>
    </div>
  );
}