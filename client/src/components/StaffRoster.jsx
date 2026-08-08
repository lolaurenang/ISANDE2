/**
 * Read-only staff roster: name, role, and a binary clocked-in status.
 * Employees confirm their own attendance by clocking in themselves, so
 * this never shows a manager-editable toggle.
 */
import { useEffect, useState } from 'react';
import { usersApi } from '../api/client.js';
import StatusBadge from './StatusBadge.jsx';
import Banner from './Banner.jsx';
import Spinner from './Spinner.jsx';
import { initials } from '../utils.js';

export default function StaffRoster() {
  const [staffList, setStaffList] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await usersApi.list();
        setStaffList((res.data || []).filter((s) => s.role !== 'manager'));
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  if (!staffList) return <Spinner label="Loading the staff list" />;

  return (
    <>
      <Banner message={error} onDismiss={() => setError('')} />
      <div className="card table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Job title</th>
              <th>Department</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {staffList.length ? (
              staffList.map((s) => (
                <tr key={s._id}>
                  <td>
                    <span className="avatar-sm">{initials(s.fullName)}</span> {s.fullName}
                  </td>
                  <td>{s.jobTitle}</td>
                  <td>{s.department}</td>
                  <td>
                    <StatusBadge
                      status={s.clockedInToday ? 'on-duty' : 'unavailable'}
                      label={s.clockedInToday ? 'Clocked in' : 'Not clocked in'}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center' }}>No staff members found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
