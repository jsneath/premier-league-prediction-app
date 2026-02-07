import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Leaderboard from "../components/Leaderboard";
import api from "../api/axios";

function LeagueDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [league, setLeague] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (!user) return;

    Promise.all([
      api.get(`/api/leagues/${id}`),
      api.get(`/api/leagues/${id}/leaderboard`),
    ])
      .then(([leagueRes, scoresRes]) => {
        setLeague(leagueRes.data);
        setScores(Array.isArray(scoresRes.data) ? scoresRes.data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load league");
        setLoading(false);
      });
  }, [id, user, authLoading, navigate]);

  const copyCode = () => {
    navigator.clipboard.writeText(league.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentMember = league?.members?.find(
    (m) => (m.userId?._id || m.userId)?.toString() === user?.id
  );
  const isAdmin = currentMember?.role === "admin";

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this league?")) return;
    setActionLoading(true);
    try {
      await api.delete(`/api/leagues/${id}/leave`);
      navigate("/leagues");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to leave league");
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this league? This cannot be undone."
      )
    )
      return;
    setActionLoading(true);
    try {
      await api.delete(`/api/leagues/${id}`);
      navigate("/leagues");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete league");
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="alert alert-danger">{error}</div>
        <Link to="/leagues">Back to My Leagues</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-1">{league.name}</h1>
          <span className="text-muted">
            {league.members.length} member
            {league.members.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Link to="/leagues" className="btn btn-outline-secondary">
          Back
        </Link>
      </div>

      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Leaderboard</h5>
              {scores.length === 0 ? (
                <p className="text-muted">
                  No scores yet. The leaderboard will populate once matchweek
                  results are in.
                </p>
              ) : (
                <Leaderboard scores={scores} currentUserId={user?.id} />
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4 mb-4">
          <div className="card mb-3">
            <div className="card-body">
              <h5 className="card-title">Invite Code</h5>
              <div className="d-flex align-items-center gap-2">
                <span className="fs-4 fw-bold font-monospace bg-light px-3 py-1 rounded">
                  {league.inviteCode}
                </span>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={copyCode}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h5 className="card-title">Members</h5>
              <ul className="list-group list-group-flush">
                {league.members.map((m) => (
                  <li
                    key={m._id}
                    className="list-group-item d-flex justify-content-between align-items-center px-0"
                  >
                    <span>
                      {m.userId?.username || "Unknown"}
                      {(m.userId?._id || m.userId)?.toString() === user?.id && (
                        <span className="text-muted ms-1">(you)</span>
                      )}
                    </span>
                    {m.role === "admin" && (
                      <span className="badge bg-primary">Admin</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="d-grid gap-2">
            {!isAdmin && (
              <button
                className="btn btn-outline-danger"
                onClick={handleLeave}
                disabled={actionLoading}
              >
                Leave League
              </button>
            )}
            {isAdmin && league.members.length > 1 && (
              <button
                className="btn btn-outline-warning"
                onClick={handleLeave}
                disabled={actionLoading}
              >
                Leave League (admin transferred)
              </button>
            )}
            {isAdmin && (
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={actionLoading}
              >
                Delete League
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeagueDetail;
