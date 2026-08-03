import { formatDateRange } from '../utils.js';
import StatusBadge from './StatusBadge.jsx';

/** The orange-titled schedule card used on Home, Schedule and Calendar. */
export default function JobCard({ job, onClick, showAssignee = false, actions }) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      className={`job-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="job-card-top">
        <h3>{job.title}</h3>
        <StatusBadge status={job.status} />
      </div>
      <p className="job-date">{formatDateRange(job.startDate, job.endDate)}</p>
      {job.description && <p className="job-desc">{job.description}</p>}

      <div className="job-meta">
        {job.clientName && <span>Client: {job.clientName}</span>}
        {showAssignee && (
          <span>{job.assignedTo ? `Assigned to ${job.assignedTo.fullName}` : 'Unassigned'}</span>
        )}
      </div>

      {actions && <div className="job-actions">{actions}</div>}
    </Wrapper>
  );
}
