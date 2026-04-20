import { useState, useEffect } from "react";
import api from "../api/axios";

const ONE_HOUR_MS = 60 * 60 * 1000;

const PredictionForm = ({ fixtures, matchweek }) => {
  const [predictions, setPredictions] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setMessage("login"); return; }

    api.get(`/api/predictions/${matchweek}`).then((res) => {
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
    }).catch((err) => {
      setMessage(err.response?.data?.message || "Could not load predictions.");
      setMessageType("danger");
      setPredictions(fixtures.map((f) => ({
        fixtureId: f._id, predictedHomeScore: "", predictedAwayScore: "", isDoublePoints: false,
      })));
    });
  }, [fixtures, matchweek]);

  const isLocked = (fixtureId) => {
    const dl = deadlines.find((d) => d.fixtureId === fixtureId);
    return dl ? dl.locked : false;
  };

  const allLocked = deadlines.length > 0 && fixtures.every((f) => isLocked(f._id));

  const handleScoreChange = (idx, field, value) => {
    if (!predictions[idx] || isLocked(fixtures[idx]._id)) return;
    const updated = [...predictions];
    updated[idx][field] = value === "" ? "" : parseInt(value) || 0;
    setPredictions(updated);
  };

  const handleDoubleChange = (idx) => {
    if (isLocked(fixtures[idx]._id)) return;
    setPredictions(predictions.map((p, i) => ({ ...p, isDoublePoints: i === idx })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const res = await api.post("/api/predictions", {
        matchweek: parseInt(matchweek),
        predictions,
      });
      setMessage(res.data.message);
      setMessageType("success");
      setSavedAt(new Date());
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to submit predictions.");
      setMessageType("danger");
    } finally {
      setSubmitting(false);
    }
  };

  if (message === "login") {
    return (
      <div className="alert alert-warning">
        Please <a href="/login" className="alert-link">log in</a> to make predictions.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {allLocked && (
        <div className="alert alert-info mb-3">
          All fixtures have locked — predictions can no longer be changed.
        </div>
      )}

      {fixtures.map((f, idx) => {
        const locked = isLocked(f._id);
        const pred = predictions[idx];
        const kickoff = deadlines.find((d) => d.fixtureId === f._id)?.kickoff;
        const timeUntil = kickoff ? new Date(kickoff).getTime() - Date.now() : null;
        const minsLeft = timeUntil ? Math.max(0, Math.floor(timeUntil / 60000)) : null;
        const soonWarning = !locked && minsLeft !== null && minsLeft < 120;

        return (
          <div className={`prediction-card ${locked ? "locked" : ""}`} key={f._id}>
            <div className="prediction-card-header">
              <span>
                {new Date(f.date).toLocaleDateString("en-GB", {
                  weekday: "long", day: "numeric", month: "short",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
              <span>
                {locked
                  ? <span className="badge bg-secondary">🔒 Locked</span>
                  : soonWarning
                  ? <span className="badge bg-warning text-dark">⚠️ Locks in {minsLeft}m</span>
                  : <span style={{ color: "var(--green)", fontSize: "0.75rem", fontWeight: 600 }}>Open</span>
                }
              </span>
            </div>

            <div className="prediction-card-body">
              <div className="prediction-teams">
                <div className="prediction-team home">
                  <span>{f.teams.home.name}</span>
                  <img src={f.teams.home.logo} alt="" width="32" height="32" style={{ objectFit: "contain" }} />
                </div>

                <div className="score-inputs">
                  <input
                    type="number"
                    className="form-control score-input"
                    min="0"
                    value={pred?.predictedHomeScore ?? ""}
                    onChange={(e) => handleScoreChange(idx, "predictedHomeScore", e.target.value)}
                    disabled={locked}
                    placeholder="0"
                  />
                  <span className="score-divider">–</span>
                  <input
                    type="number"
                    className="form-control score-input"
                    min="0"
                    value={pred?.predictedAwayScore ?? ""}
                    onChange={(e) => handleScoreChange(idx, "predictedAwayScore", e.target.value)}
                    disabled={locked}
                    placeholder="0"
                  />
                </div>

                <div className="prediction-team">
                  <img src={f.teams.away.logo} alt="" width="32" height="32" style={{ objectFit: "contain" }} />
                  <span>{f.teams.away.name}</span>
                </div>
              </div>

              <label className={`double-points-toggle w-100 ${pred?.isDoublePoints ? "active" : ""}`}>
                <input
                  type="radio"
                  name="doublePoints"
                  checked={pred?.isDoublePoints || false}
                  onChange={() => handleDoubleChange(idx)}
                  disabled={locked}
                  style={{ accentColor: "var(--gold)" }}
                />
                <span className="double-points-label">
                  ⚡ Double Points
                  <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 400, fontSize: "0.78rem" }}>
                    — pick one match to double your points this week
                  </span>
                </span>
              </label>
            </div>
          </div>
        );
      })}

      {message && message !== "login" && (
        <div className={`alert alert-${messageType}`}>
          {message}
          {savedAt && messageType === "success" && (
            <span className="ms-2" style={{ opacity: 0.7, fontSize: "0.82rem" }}>
              (saved at {savedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })})
            </span>
          )}
        </div>
      )}

      {!allLocked && (
        <button type="submit" className="btn btn-primary w-100 btn-lg" disabled={submitting}>
          {submitting ? (
            <><span className="spinner-border spinner-border-sm me-2"></span>Saving…</>
          ) : (
            "Save Predictions"
          )}
        </button>
      )}
    </form>
  );
};

export default PredictionForm;
