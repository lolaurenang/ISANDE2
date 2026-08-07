import { formatDate, formatTime } from '../utils.js';

/**
 * One row of the activity feed, matching the prototype's log card.
 * showTaskName: mechanics reviewing their own logs already know it was
 * them - showing the job/task name instead of their own name is more
 * useful there than on the manager's shop-wide feed.
 */
export default function LogEntry({ log, showTaskName = false }) {
  const heading = showTaskName
    ? log.relatedJob?.title || log.work || 'Task'
    : log.employee?.fullName || 'Unknown';

  return (
    <article className="log-entry">
      <div className="log-left">
        <p className="log-name">{heading}</p>
        <p className="log-time">
          {formatDate(log.loggedAt)} &nbsp;{formatTime(log.loggedAt)}
        </p>
      </div>
      <div className="log-right">
        {log.type === 'work' ? (
          <>
            <p>
              <b>WORK:</b> {log.work}
            </p>
            {log.clientName && (
              <p>
                <b>CLIENT:</b> {log.clientName}
              </p>
            )}
          </>
        ) : (
          <p>{log.message}</p>
        )}
      </div>
    </article>
  );
}
