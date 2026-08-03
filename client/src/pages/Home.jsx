/**
 * Home: the first screen after logging in.
 * A mechanic sees their clock and today's job. A manager sees the same
 * calendar plus the live activity feed and headcount.
 */
import { useEffect, useState, useCallback } from 'react';
import { dashboardApi, attendanceApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import JobCard from '../components/JobCard.jsx';
import LogEntry from '../components/LogEntry.jsx';
import Banner from '../components/Banner.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatTime, greetingFor } from '../utils.js';

export default function Home() {
  const { user, setUser, isManager } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const today = new Date();

  const load = useCallback(async () => {
    try {
      const res = await dashboardApi.home();
      setData(res.data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleClock() {
    setBusy(true);
    setError('');
    try {
      const open = data?.attendance?.clockIn && !data?.attendance?.clockOut;
      if (open) {
        await attendanceApi.clockOut();
        setNotice('Clocked out. Your hours for today are saved.');
        setUser({ ...user, status: 'available' });
      } else {
        await attendanceApi.clockIn();
        setNotice('Clocked in. Have a good shift.');
        setUser({ ...user, status: 'on-duty' });
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <Spinner label="Loading your day" />;

  const attendance = data.attendance;
  const isOpenShift = Boolean(attendance?.clockIn && !attendance?.clockOut);
  const isDone = Boolean(attendance?.clockOut);

  return (
    <div className="page">
      <header className="page-head">
        <p className="page-label">Home</p>
        <h1 className="greeting">
          {greetingFor()}, <span>{user.fullName.split(' ')[0]}!</span>
        </h1>
        <p className="page-sub">
          {isManager ? "Here is what is happening in the shop today." : 'Here is your schedule for today.'}
        </p>
      </header>

      <Banner message={error} onDismiss={() => setError('')} />
      <Banner tone="success" message={notice} onDismiss={() => setNotice('')} />

      <section className="clock-card">
        <div>
          <p className="clock-label">Your shift</p>
          <p className="clock-value">
            {attendance?.clockIn ? `In at ${formatTime(attendance.clockIn)}` : 'Not clocked in yet'}
            {attendance?.clockOut ? ` - out at ${formatTime(attendance.clockOut)}` : ''}
          </p>
          {attendance?.status === 'late' && <p className="clock-note">Marked late</p>}
        </div>
        <button
          type="button"
          className={`btn ${isOpenShift ? 'btn-dark' : 'btn-primary'}`}
          onClick={toggleClock}
          disabled={busy || isDone}
        >
          {isDone ? 'Shift finished' : isOpenShift ? 'Clock out' : 'Clock in'}
        </button>
      </section>

      <div className="home-grid">
        <div>
          <p className="section-label">Calendar</p>
          <div className="card">
            <MonthCalendar
              year={today.getFullYear()}
              month={today.getMonth()}
              jobs={[...data.todayJobs, ...data.upcoming]}
              variant="compact"
            />
          </div>
        </div>

        <div className="home-right">
          <section>
            <p className="section-label">Today&rsquo;s schedule</p>
            {data.todayJobs.length ? (
              data.todayJobs.map((job) => (
                <JobCard key={job._id} job={job} showAssignee={isManager} />
              ))
            ) : (
              <EmptyState
                title="Nothing booked for today"
                hint={isManager ? 'Add a job from the Schedule page.' : 'Check the Schedule tab for open jobs.'}
              />
            )}
          </section>

          {data.upcoming.length > 0 && (
            <section>
              <p className="section-label">Coming up</p>
              {data.upcoming.map((job) => (
                <JobCard key={job._id} job={job} showAssignee={isManager} />
              ))}
            </section>
          )}

          {isManager && (
            <>
              <section className="headcount">
                <div className="stat">
                  <b>{data.headcount.onDuty}</b>
                  <span>On duty</span>
                </div>
                <div className="stat">
                  <b>{data.headcount.available}</b>
                  <span>Available</span>
                </div>
                <div className="stat">
                  <b>{data.headcount.absent}</b>
                  <span>Absent</span>
                </div>
                <div className="stat">
                  <b>{data.pendingRequests}</b>
                  <span>Requests</span>
                </div>
              </section>

              <section>
                <p className="section-label">Today&rsquo;s logs</p>
                {data.todayLogs?.length ? (
                  data.todayLogs.map((log) => <LogEntry key={log._id} log={log} />)
                ) : (
                  <EmptyState title="No activity yet today" hint="Logs appear here as staff clock in and record work." />
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
