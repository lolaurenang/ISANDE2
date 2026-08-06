import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { usersApi, authApi, requestsApi } from '../api/client.js';
import Banner from '../components/Banner.jsx';
import Modal from '../components/Modal.jsx';
import { initials, toDateKey } from '../utils.js';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: user.fullName,
    phone: user.phone || '',
  });
  const [editing, setEditing] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [reqOpen, setReqOpen] = useState(false);
  const [req, setReq] = useState({ type: 'leave', workDate: toDateKey(), reason: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function save(e) {
    e.preventDefault();
    try {
      const res = await usersApi.update(user.id, form);
      setUser(res.data);
      setEditing(false);
      setNotice('Profile updated');
    } catch (err) {
      setError(err.message);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    try {
      await authApi.changePassword(pw);
      setPwOpen(false);
      setPw({ currentPassword: '', newPassword: '' });
      setNotice('Password updated');
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendRequest(e) {
    e.preventDefault();
    try {
      await requestsApi.create(req);
      setReqOpen(false);
      setReq({ type: 'leave', workDate: toDateKey(), reason: '' });
      setNotice('Request sent to your manager');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1 className="page-heading">Profile</h1>

      <Banner message={error} onDismiss={() => setError('')} />
      <Banner tone="success" message={notice} onDismiss={() => setNotice('')} />

      <div className="card profile-card">
        <div className="profile-hero">
          <div className="profile-avatar">{initials(user.fullName)}</div>
          <div>
            <h2>{user.fullName}</h2>
            <p>{user.jobTitle}</p>
          </div>
        </div>

        {editing ? (
          <form className="stack-form" onSubmit={save}>
            <label className="field">
              <span>Full name</span>
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </label>
            <label className="field">
              <span>Phone number</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <div className="button-row">
              <button className="btn btn-primary btn-sm" type="submit">
                Save changes
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="detail-list">
            <div>
              <dt>Full name</dt>
              <dd>{user.fullName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Phone number</dt>
              <dd>{user.phone || 'Not set'}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{user.department}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{user.role === 'manager' ? 'Manager (administrator)' : 'Employee'}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="button-row">
        {!editing && (
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(true)}>
            Edit profile
          </button>
        )}
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setPwOpen(true)}>
          Change password
        </button>
        {user.role !== 'manager' && (
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setReqOpen(true)}>
            Request Leave
          </button>
        )}
        <button
          className="btn btn-danger btn-sm"
          type="button"
          onClick={() => {
            logout();
            navigate('/', { replace: true });
          }}
        >
          Log out
        </button>
      </div>

      <Modal open={pwOpen} title="Change password" onClose={() => setPwOpen(false)}>
        <form className="stack-form" onSubmit={changePassword}>
          <label className="field">
            <span>Current password</span>
            <input
              type="password"
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>New password</span>
            <input
              type="password"
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
              minLength={8}
              required
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Update password
          </button>
        </form>
      </Modal>

      <Modal open={reqOpen} title="Request Leave" onClose={() => setReqOpen(false)}>
        <form className="stack-form" onSubmit={sendRequest}>
          <label className="field">
            <span>Type</span>
            <select value={req.type} onChange={(e) => setReq({ ...req, type: e.target.value })}>
              <option value="leave">Leave</option>
              <option value="shift-change">Shift change</option>
              <option value="schedule-swap">Schedule swap</option>
            </select>
          </label>
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={req.workDate}
              onChange={(e) => setReq({ ...req, workDate: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Reason</span>
            <textarea
              rows="3"
              value={req.reason}
              onChange={(e) => setReq({ ...req, reason: e.target.value })}
              required
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Send request
          </button>
        </form>
      </Modal>
    </div>
  );
}
