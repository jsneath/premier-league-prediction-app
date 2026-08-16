import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="offside-page">
      <div className="offside-flag" />
      <p className="offside-call">OFFSIDE</p>
      <h1>That page never got onside.</h1>
      <p className="text-muted">The assistant has the flag up. Go back and play the ball.</p>
      <Link to="/" className="btn btn-primary mt-3">Back to the pitch</Link>
    </div>
  );
}

export default NotFound;
