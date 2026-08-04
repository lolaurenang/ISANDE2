/**
 * The availability tab, extracted from Schedule so both halves of the
 * feature can be honest about whose data they show.
 *
 * An employee sees and edits ONLY their own days. A manager sees their
 * own calendar the same way, plus a roster panel showing who is free
 * each day and, just as importantly, who has not filled anything in.
 */
import { useEffect, useState, useCallback } from 'react';
import { availabilityApi } from '../api/client.js';
import MonthCalendar from './MonthCalendar.jsx';
import Banner from './Banner.jsx';
import EmptyState from './EmptyState.jsx';
import Spinner from './Spinner.jsx';
import { toDateKey, formatDate, DAY_SHORT, buildWeek } from '../utils.js';

const DEFAULT_HOURS = { startTime: '08:00', endTime: '17:00' };

export default function AvailabilityPanel({ isManager }) {
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [slots, setSlots] = useState([]);
  const [roster, setRoster] = useState(null);
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const fromKey = toDateKey(monthStart);
  const toKey = toDateKey(monthEnd);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // availabilityApi.mine() never returns other people's rows, which
      // is what used to break this screen for managers.
      const mine = await availabilityApi.mine({ from: fromKey, to: toKey });
      setSlots(mine.data);

      if (isManager) {
        const r = await availabilityApi.roster({ view: 'week', date: toDateKey() });
        setRoster(r);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fromKey, toKey, isManager]);

  useEffect(() => {
    load();
  }, [load]);

  const myKeys = slots.filter((s) => s.isAvailable).map((s) => s.workDate);

  async function toggleDay(key) {
    setError('');
    setSaving(true);
    try {
      if (myKeys.includes(key)) {
        await availabilityApi.remove(key);
        setNotice(`${formatDate(key)} removed`);
      } else {
        await availabilityApi.set({ workDate: key, ...hours });
        setNotice(`Available on ${formatDate(key)}, ${hours.startTime} to ${hours.endTime}`);
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  /** Mark every working day of the current week, in one request. */
  async function markThisWeek() {
    setError('');
    setSaving(true);
    try {
      const week = buildWeek(new Date());
      const res = await availabilityApi.bulk({
        from: week[0].key,
        to: week[6].key,
        skipSundays: true,
        ...hours,
      });
      setNotice(res.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  /** Mark every working day left in the month being viewed. */
  async function markRestOfMonth() {
    setError('');
    setSaving(true);
    try {
      const todayKey = toDateKey();
      const start = fromKey > todayKey ? fromKey : todayKey;
      const res = await availabilityApi.bulk({
        from: start,
        to: toKey,
        skipSundays: true,
        ...hours,
      });
      setNotice(res.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function clearMonth() {
    if (!myKeys.length) return;
    if (!window.confirm(`Clear all ${myKeys.length} days you marked this month?`)) return;
    setSaving(true);
    try {
      const res = await availabilityApi.bulkRemove(myKeys);
      setNotice(res.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !slots.length) return <Spinner label="Loading your availability" />;

  return (
    <>
      <Banner message={error} onDismiss={() => setError('')} />
      <Banner tone="success" message={notice} onDismiss={() => setNotice('')} />

      <div className="schedule-grid">
        <div>
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
              Tap a day to offer it. Tap it again to take it back. Orange days are the ones your
              manager can book you on.
            </p>
          </div>

          <div className="card hours-card">
            <p className="section-label">Hours you can work</p>
            <div className="field-row">
              <label className="field">
                <span>From</span>
                <input
                  type="time"
                  value={hours.startTime}
                  onChange={(e) => setHours({ ...hours, startTime: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Until</span>
                <input
                  type="time"
                  value={hours.endTime}
                  onChange={(e) => setHours({ ...hours, endTime: e.target.value })}
                />
              </label>
            </div>
            <p className="help-text">These times apply to days you mark from now on.</p>
          </div>
        </div>

        <div>
          <div className="button-row bulk-row">
            <button type="button" className="btn btn-sm btn-primary" onClick={markThisWeek} disabled={saving}>
              Mark this week
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={markRestOfMonth} disabled={saving}>
              Mark rest of the month
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={clearMonth}
              disabled={saving || !myKeys.length}
            >
              Clear this month
            </button>
          </div>

          <p className="section-label">
            You offered {myKeys.length === 1 ? '1 day' : `${myKeys.length} days`} this month
          </p>

          {myKeys.length ? (
            <ul className="chip-list">
              {[...myKeys].sort().map((key) => {
                const slot = slots.find((s) => s.workDate === key);
                return (
                  <li key={key} className="chip">
                    <span>
                      {formatDate(key)}
                      <small>
                        {' '}
                        {slot?.startTime}&ndash;{slot?.endTime}
                      </small>
                    </span>
                    <button type="button" onClick={() => toggleDay(key)} aria-label={`Remove ${key}`}>
                      &times;
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              title="No days offered yet"
              hint="Pick the days you can come in. The manager can only book you on days you have marked."
            />
          )}

          {isManager && roster && (
            <section className="roster">
              <p className="section-label">Who is free this week</p>
              <div className="card roster-card">
                {buildWeek(new Date()).map((day, i) => {
                  const people = roster.data[day.key] || [];
                  return (
                    <div key={day.key} className={`roster-day ${day.isToday ? 'today' : ''}`}>
                      <p className="roster-date">
                        <span>{DAY_SHORT[i]}</span>
                        <b>{day.dayNumber}</b>
                      </p>
                      {people.length ? (
                        <ul>
                          {people.map((p) => (
                            <li key={p.id}>
                              {p.fullName}
                              <small>
                                {' '}
                                {p.startTime}&ndash;{p.endTime}
                              </small>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="roster-empty">Nobody</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {roster.noAvailability?.length > 0 && (
                <div className="roster-gap">
                  <p className="roster-gap-title">Has not filled in any availability</p>
                  <p>
                    {roster.noAvailability.map((p) => p.fullName).join(', ')}
                  </p>
                  <p className="roster-gap-hint">
                    They cannot be booked until they mark some days. Worth a reminder.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
