import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

function CreateLeague() {
  const [name, setName] = useState("");
  const [createdLeague, setCreatedLeague] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/leagues", { name });
      setCreatedLeague(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create league");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(createdLeague.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (createdLeague) {
    return (
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow">
            <div className="card-body p-4 text-center">
              <h3 className="mb-3">League Created!</h3>
              <p className="text-muted">
                Share this invite code with your friends:
              </p>
              <div className="d-flex justify-content-center align-items-center gap-2 mb-3">
                <span
                  className="fs-2 fw-bold font-monospace bg-light px-3 py-2 rounded"
                >
                  {createdLeague.inviteCode}
                </span>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={copyCode}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="d-flex justify-content-center gap-2">
                <Link
                  to={`/leagues/${createdLeague._id}`}
                  className="btn btn-primary"
                >
                  View League
                </Link>
                <Link to="/leagues" className="btn btn-outline-secondary">
                  My Leagues
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <div className="card shadow">
          <div className="card-body p-4">
            <h3 className="mb-3">Create a League</h3>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">League Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={50}
                  placeholder="e.g. The Invincibles"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create League"}
              </button>
            </form>

            <div className="text-center mt-3">
              <Link to="/leagues">Back to My Leagues</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateLeague;
