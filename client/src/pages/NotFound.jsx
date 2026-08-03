import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page center-page">
      <h1 className="page-heading">That page does not exist</h1>
      <p>The link may be out of date. Head back to your home screen.</p>
      <Link className="btn btn-primary" to="/home">
        Go to Home
      </Link>
    </div>
  );
}
