import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';
import Banner from '../components/Banner.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form);
      navigate(location.state?.from || '/home', { replace: true });
    } catch (err) {
      setError(err.message);
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
          <h2>Log in</h2>
          <Banner message={error} onDismiss={() => setError('')} />

          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={update}
              placeholder="you@andoys.ph"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="field-with-button">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={update}
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Logging in...' : 'Log in'}
          </button>

          <p className="auth-switch">
            Don&rsquo;t have an account? <Link to="/signup">Sign up</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
