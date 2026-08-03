import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-art" aria-hidden="true" />
      <div className="landing-inner">
        <Logo variant="light" size="lg" />
        <h1 className="landing-title">
          Let&rsquo;s
          <br />
          <span>get started</span>
        </h1>
        <p className="landing-tagline">The Andoy&rsquo;s touch, now on time.</p>
        <div className="landing-actions">
          <Link className="btn btn-primary" to="/login">
            Log in
          </Link>
          <Link className="btn btn-ghost" to="/signup">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
