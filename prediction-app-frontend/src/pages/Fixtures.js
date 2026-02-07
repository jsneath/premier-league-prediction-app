import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

function Fixtures() {
  const [fixtures, setFixtures] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    api
      .get("/api/fixtures/current")
      .then((res) => {
        setCurrentWeek(res.data.matchweek);
        setSelectedWeek(res.data.matchweek);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load fixtures");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedWeek === null) return;
    setLoading(true);
    setError(null);
    api
      .get(`/api/fixtures?matchweek=${selectedWeek}`)
      .then((res) => {
        setFixtures(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Could not load fixtures");
        setLoading(false);
      });
  }, [selectedWeek]);

  const hasOpenFixtures = fixtures.some(
    (f) => new Date(f.date).getTime() - Date.now() > 60 * 60 * 1000
  );
  const allFinished =
    fixtures.length > 0 && fixtures.every((f) => f.status?.short === "FT");

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Matchweek {selectedWeek}</h1>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={selectedWeek <= 1}
            onClick={() => setSelectedWeek((w) => w - 1)}
          >
            &laquo; Prev
          </button>
          {selectedWeek !== currentWeek && (
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={() => setSelectedWeek(currentWeek)}
            >
              Current
            </button>
          )}
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={selectedWeek >= 38}
            onClick={() => setSelectedWeek((w) => w + 1)}
          >
            Next &raquo;
          </button>
        </div>
      </div>

      {allFinished && (
        <span className="badge bg-secondary mb-3">Completed</span>
      )}
      {!allFinished && fixtures.length > 0 && (
        <span className="badge bg-success mb-3">Upcoming</span>
      )}

      {loading ? (
        <div className="text-center mt-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">
          <strong>Failed to load fixtures.</strong> Please check your connection
          and try again.
          <button
            className="btn btn-outline-danger btn-sm ms-3"
            onClick={() => setSelectedWeek((w) => w)}
          >
            Retry
          </button>
        </div>
      ) : fixtures.length === 0 ? (
        <div className="alert alert-info">
          No fixtures for Matchweek {selectedWeek} yet. They may not have been
          scheduled — check back later.
        </div>
      ) : (
        <>
          <table className="table table-hover">
            <tbody>
              {fixtures
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map((fixture) => (
                  <tr key={fixture._id}>
                    <td className="text-end" style={{ width: "35%" }}>
                      {fixture.teams.home.name}
                      <img
                        src={fixture.teams.home.logo}
                        alt=""
                        width="24"
                        className="ms-2"
                      />
                    </td>
                    <td
                      className="text-center fw-bold"
                      style={{ width: "12%" }}
                    >
                      {fixture.status?.short === "FT"
                        ? `${fixture.goals.home} - ${fixture.goals.away}`
                        : "vs"}
                    </td>
                    <td style={{ width: "35%" }}>
                      <img
                        src={fixture.teams.away.logo}
                        alt=""
                        width="24"
                        className="me-2"
                      />
                      {fixture.teams.away.name}
                    </td>
                    <td className="text-muted small" style={{ width: "18%" }}>
                      {new Date(fixture.date).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {hasOpenFixtures && user && (
            <div className="text-center mt-3">
              <Link
                to={`/predictions/${selectedWeek}`}
                className="btn btn-primary"
              >
                Make Predictions
              </Link>
            </div>
          )}
          {hasOpenFixtures && !user && (
            <div className="text-center mt-3">
              <Link to="/login" className="btn btn-outline-primary">
                Login to Predict
              </Link>
            </div>
          )}
          {!hasOpenFixtures && !allFinished && (
            <div className="alert alert-info mt-3 text-center">
              All fixtures in this matchweek have locked (less than 1 hour to
              kickoff).
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Fixtures;
