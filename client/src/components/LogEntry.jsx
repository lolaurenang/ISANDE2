import { formatDate, formatTime } from '../utils.js';

/** One row of the activity feed, matching the prototype's log card. */
export default function LogEntry({ log }) {
  return (
    <article className="log-entry">
      <div className="log-left">
        <p className="log-name">{log.employee?.fullName || 'Unknown'}</p>
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
