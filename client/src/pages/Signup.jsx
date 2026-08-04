import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import Banner from '../components/Banner.jsx';

const EMPTY = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  jobTitle: 'Mechanic',
  managerCode: '',
};

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('The two passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Use at least 8 characters for your password');
      return;
    }

    setBusy(true);
    try {
      const { confirmPassword, ...payload } = form;
      await signup(payload);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.details?.[0]?.message || err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-split">
      <aside className="auth-brand">
        <Logo variant="light" size="lg" />
      </aside>

      <section className="auth-form-side">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Create account</h2>
          <Banner message={error} onDismiss={() => setError('')} />

          <label className="field">
            <span>Full name</span>
            <input name="fullName" value={form.fullName} onChange={update} required />
          </label>

          <label className="field">
            <span>Email</span>
            <input name="email" type="email" value={form.email} onChange={update} required />
          </label>

          <label className="field">
            <span>Phone number</span>
            <input name="phone" value={form.phone} onChange={update} placeholder="0912 345 6789" />
          </label>

          <label className="field">
            <span>Job title</span>
            <select name="jobTitle" value={form.jobTitle} onChange={update}>
              <option>Mechanic</option>
              <option>Cashier</option>
              <option>Sales Associate</option>
              <option>Driver</option>
              <option>Marketing Associate</option>
              <option>Accounting Staff</option>
            </select>
          </label>

          <div className="field-row">
            <label className="field">
              <span>Password</span>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={update}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="field">
              <span>Confirm password</span>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={update}
                autoComplete="new-password"
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Manager code (optional)</span>
            <input
              name="managerCode"
              value={form.managerCode}
              onChange={update}
              placeholder="Leave blank if you are not the manager"
            />
          </label>

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Creating account...' : 'Sign up'}
          </button>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
