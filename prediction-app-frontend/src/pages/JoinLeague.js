import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

function JoinLeague() {
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/leagues/join", {
        inviteCode: inviteCode.toUpperCase(),
      });
      navigate(`/leagues/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to join league");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <div className="card shadow">
          <div className="card-body p-4">
            <h3 className="mb-3">Join a League</h3>
            <p className="text-muted">
              Enter the 6-character invite code shared by your league admin.
            </p>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Invite Code</label>
                <input
                  type="text"
                  className="form-control text-center font-monospace fs-4"
                  value={inviteCode}
                  onChange={(e) =>
                    setInviteCode(e.target.value.toUpperCase().slice(0, 6))
                  }
                  required
                  maxLength={6}
                  placeholder="ABC123"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading || inviteCode.length !== 6}
              >
                {loading ? "Joining..." : "Join League"}
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

export default JoinLeague;
