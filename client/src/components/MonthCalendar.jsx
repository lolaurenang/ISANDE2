/**
 * Month grid. Two densities:
 *   compact - the small card on Home and Schedule
 *   full    - the big Calendar page with event tags inside each cell
 */
import { buildMonthGrid, DAY_INITIALS, DAY_SHORT, MONTHS, jobCoversDate, jobTypeClass } from '../utils.js';
import Icon from './Icon.jsx';

export default function MonthCalendar({
  year,
  month,
  jobs = [],
  selectedKey,
  onSelect,
  onNavigate,
  variant = 'compact',
  markedKeys = [],
}) {
  const cells = buildMonthGrid(year, month);
  const marked = new Set(markedKeys);

  const showHeader = variant === 'compact' || Boolean(onNavigate);

  return (
    <div className={`calendar calendar-${variant}`}>
      {showHeader && (
      <header className="calendar-head">
        {onNavigate && (
          <button type="button" className="icon-btn" onClick={() => onNavigate(-1)} aria-label="Previous month">
            <Icon name="back" size={18} />
          </button>
        )}
        <p className="calendar-title">
          {MONTHS[month]} {variant === 'full' ? year : ''}
        </p>
        {onNavigate && (
          <button type="button" className="icon-btn" onClick={() => onNavigate(1)} aria-label="Next month">
            <Icon name="next" size={18} />
          </button>
        )}
      </header>
      )}

      <div className={variant === 'full' ? 'month-grid' : 'cal-grid'}>
        {(variant === 'full' ? DAY_SHORT : DAY_INITIALS).map((d, i) => (
          <div key={`${d}-${i}`} className="cal-weekday">
            {d}
          </div>
        ))}

        {cells.map((cell) => {
          const dayJobs = jobs.filter((job) => jobCoversDate(job, cell.key));
          const classes = [
            variant === 'full' ? 'month-cell' : 'cal-day',
            cell.inMonth ? '' : 'muted',
            cell.isToday ? 'today' : '',
            selectedKey === cell.key ? 'selected' : '',
            marked.has(cell.key) ? 'marked' : '',
            dayJobs.length && variant === 'compact' ? 'has-job' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              type="button"
              key={cell.key}
              className={classes}
              onClick={() => onSelect?.(cell.key)}
              aria-pressed={selectedKey === cell.key}
              aria-label={cell.key}
            >
              <span className="day-num">{cell.dayNumber}</span>
              {variant === 'full' &&
                dayJobs.slice(0, 3).map((job) => (
                  <span key={job._id} className={`event-tag ${jobTypeClass(job.serviceType)}`}>
                    {job.title}
                  </span>
                ))}
              {variant === 'full' && dayJobs.length > 3 && (
                <span className="event-more">+{dayJobs.length - 3} more</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
