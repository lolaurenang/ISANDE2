/**
 * Dashboard for non-mechanic staff (cashier, sales, marketing, driver,
 * accounting). They don't work on jobs, so there's no logs/accomplished
 * tabs here - just the staff roster so they can see who else is on shift.
 */
import { useEffect, useState } from 'react';
import { usersApi } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Banner from '../components/Banner.jsx';
import Spinner from '../components/Spinner.jsx';
import { initials } from '../utils.js';

export default function StaffDashboard() {
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
    <div className="page">
      <div className="page-top-row">
        <h1 className="page-heading">Staff</h1>
      </div>

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
                  <td><StatusBadge status={s.status} /></td>
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
    </div>
  );
}
