import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function Leagues() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (!user) return;

    api
      .get("/api/leagues")
      .then((res) => {
        setLeagues(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load leagues");
        setLoading(false);
      });
  }, [user, authLoading, navigate]);

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
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">My Leagues</h1>
        <div className="d-flex gap-2">
          <Link to="/leagues/create" className="btn btn-primary">
            Create League
          </Link>
          <Link to="/leagues/join" className="btn btn-outline-primary">
            Join League
          </Link>
        </div>
      </div>

      {leagues.length === 0 ? (
        <div className="alert alert-info">
          You haven't joined any leagues yet. Create one or join with an invite
          code!
        </div>
      ) : (
        <div className="row">
          {leagues.map((league) => (
            <div key={league._id} className="col-md-6 col-lg-4 mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">{league.name}</h5>
                  <p className="text-muted mb-2">
                    {league.members.length} member
                    {league.members.length !== 1 ? "s" : ""}
                  </p>
                  <Link
                    to={`/leagues/${league._id}`}
                    className="btn btn-outline-primary btn-sm"
                  >
                    View League
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Leagues;
