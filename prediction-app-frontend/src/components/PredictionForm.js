import { useState, useEffect } from "react";
import api from "../api/axios";

const PredictionForm = ({ fixtures, matchweek }) => {
  const [predictions, setPredictions] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("Please log in to make predictions.");
      setMessageType("warning");
      return;
    }

    const fetchPreds = async () => {
      try {
        const res = await api.get(`/api/predictions/${matchweek}`);
        const existing = res.data.predictions || [];
        setDeadlines(res.data.deadlines || []);
        setPredictions(
          fixtures.map((f) => {
            const match = existing.find(
              (p) => p.fixtureId === f._id || p.fixtureId?._id === f._id
            );
            return {
              fixtureId: f._id,
              predictedHomeScore: match?.predictedHomeScore ?? "",
              predictedAwayScore: match?.predictedAwayScore ?? "",
              isDoublePoints: match?.isDoublePoints || false,
            };
          })
        );
      } catch (err) {
        setMessage(
          err.response?.data?.message ||
            "Could not load your predictions. Please refresh the page."
        );
        setMessageType("danger");
        setPredictions(
          fixtures.map((f) => ({
            fixtureId: f._id,
            predictedHomeScore: "",
            predictedAwayScore: "",
            isDoublePoints: false,
          }))
        );
      }
    };
    fetchPreds();
  }, [fixtures, matchweek]);

  const isLocked = (fixtureId) => {
    const dl = deadlines.find((d) => d.fixtureId === fixtureId);
    return dl ? dl.locked : false;
  };

  const openCount = fixtures.filter((f) => !isLocked(f._id)).length;
  const allLocked = deadlines.length > 0 && openCount === 0;

  const handleScoreChange = (idx, field, value) => {
    if (!predictions[idx] || isLocked(fixtures[idx]._id)) return;
    const updated = [...predictions];
    updated[idx][field] = value === "" ? "" : parseInt(value) || 0;
    setPredictions(updated);
  };

  const handleDoubleChange = (idx) => {
    if (isLocked(fixtures[idx]._id)) return;
    setPredictions(
      predictions.map((p, i) => ({ ...p, isDoublePoints: i === idx }))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      setMessage("You need to log in first.");
      setMessageType("warning");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const res = await api.post("/api/predictions", {
        matchweek: parseInt(matchweek),
        predictions,
      });
      setMessage(res.data.message);
      setMessageType("success");
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "Failed to submit predictions. Please try again."
      );
      setMessageType("danger");
    } finally {
      setSubmitting(false);
    }
  };

  if (message.includes("log in")) {
    return (
      <div className="alert alert-warning">
        {message}{" "}
        <a href="/login" className="alert-link">
          Log In
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {allLocked && (
        <div className="alert alert-info">
          All fixtures in this matchweek have locked. Predictions can no longer
          be changed.
        </div>
      )}

      {fixtures.map((f, idx) => {
        const locked = isLocked(f._id);
        return (
          <div
            className={`card mb-3 ${locked ? "border-secondary" : ""}`}
            key={f._id}
            style={locked ? { opacity: 0.6 } : {}}
          >
            <div className="card-body">
              {locked && (
                <div className="text-center mb-2">
                  <span className="badge bg-secondary">Locked</span>
                </div>
              )}
              <div className="row align-items-center">
                <div className="col-4 text-end">
                  <img
                    src={f.teams.home.logo}
                    alt=""
                    width="30"
                    className="me-2"
                  />
                  <strong>{f.teams.home.name}</strong>
                </div>
                <div className="col-4">
                  <div className="d-flex justify-content-center align-items-center gap-2">
                    <input
                      type="number"
                      className="form-control text-center"
                      style={{ width: "60px" }}
                      min="0"
                      value={predictions[idx]?.predictedHomeScore ?? ""}
                      onChange={(e) =>
                        handleScoreChange(
                          idx,
                          "predictedHomeScore",
                          e.target.value
                        )
                      }
                      disabled={locked}
                    />
                    <span className="fw-bold">-</span>
                    <input
                      type="number"
                      className="form-control text-center"
                      style={{ width: "60px" }}
                      min="0"
                      value={predictions[idx]?.predictedAwayScore ?? ""}
                      onChange={(e) =>
                        handleScoreChange(
                          idx,
                          "predictedAwayScore",
                          e.target.value
                        )
                      }
                      disabled={locked}
                    />
                  </div>
                </div>
                <div className="col-4">
                  <strong>{f.teams.away.name}</strong>
                  <img
                    src={f.teams.away.logo}
                    alt=""
                    width="30"
                    className="ms-2"
                  />
                </div>
              </div>
              <div className="text-center mt-2">
                <small className="text-muted d-block mb-1">
                  {new Date(f.date).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
                <div className="form-check form-check-inline">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="doublePoints"
                    id={`double-${idx}`}
                    checked={predictions[idx]?.isDoublePoints || false}
                    onChange={() => handleDoubleChange(idx)}
                    disabled={locked}
                  />
                  <label
                    className="form-check-label small text-muted"
                    htmlFor={`double-${idx}`}
                  >
                    Double Points
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {message && (
        <div className={`alert alert-${messageType}`}>{message}</div>
      )}

      {!allLocked && (
        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Submitting...
            </>
          ) : (
            "Submit Predictions"
          )}
        </button>
      )}
    </form>
  );
};

export default PredictionForm;
