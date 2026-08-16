import { useState, useEffect } from "react";
import api from "../api/axios";
import TiltCard from "./TiltCard";
import LockCountdown from "./LockCountdown";
import SaveBurst from "./SaveBurst";
import PitchLean from "./PitchLean";


const PredictionForm = ({ fixtures, matchweek }) => {
  const [predictions, setPredictions] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [burst, setBurst] = useState(0);

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

  const nudgeScore = (idx, field, delta) => {
    if (isLocked(fixtures[idx]._id)) return;
    setPredictions((prev) => {
      if (!prev[idx]) return prev;
      const current = prev[idx][field];
      const base = current === "" || current === null ? 0 : Number(current);
      const next = Math.max(0, Math.min(20, base + delta));
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: next };
      return updated;
    });
  };

  const leanFor = (p) => {
    if (!isFilled(p)) return null;
    const h = Number(p.predictedHomeScore);
    const a = Number(p.predictedAwayScore);
    if (h > a) return "home";
    if (a > h) return "away";
    return "draw";
  };

  const banterFor = (p) => {
    if (!isFilled(p)) return null;
    const h = Number(p.predictedHomeScore);
    const a = Number(p.predictedAwayScore);
    if (h === 0 && a === 0) return "Parking the bus.";
    if (h + a >= 7) return "A cricket score. Someone fetch a new net.";
    if (h >= 3 && a >= 3) return "End-to-end stuff. Midfield has left the building.";
    if ((h === 1 && a === 0) || (h === 0 && a === 1)) return "A smash and grab.";
    if (h === a && h >= 2) return "A thriller that forgets to pick a winner.";
    return null;
  };

  const isLocked = (fixtureId) => {
    const dl = deadlines.find((d) => d.fixtureId === fixtureId);
    return dl ? dl.locked : false;
  };

  const allLocked = deadlines.length > 0 && fixtures.every((f) => isLocked(f._id));

  // Both handlers use the functional form of setState so rapid clicks always
  // act on the latest values rather than a stale render's copy.
  const handleScoreChange = (idx, field, value) => {
    if (isLocked(fixtures[idx]._id)) return;
    setPredictions((prev) => {
      if (!prev[idx]) return prev;
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        [field]: value === "" ? "" : parseInt(value) || 0,
      };
      return updated;
    });
  };

  // Clicking the selected match again clears the pick, so you're never forced
  // into a double before you're ready to choose one.
  const handleDoubleChange = (idx) => {
    if (isLocked(fixtures[idx]._id)) return;
    setPredictions((prev) => {
      const alreadyPicked = prev[idx]?.isDoublePoints;
      return prev.map((p, i) => ({
        ...p,
        isDoublePoints: !alreadyPicked && i === idx,
      }));
    });
  };

  // A match counts as predicted once both boxes have a score in them.
  const isFilled = (p) =>
    p && p.predictedHomeScore !== "" && p.predictedHomeScore !== null &&
    p.predictedAwayScore !== "" && p.predictedAwayScore !== null;

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
      setBurst((n) => n + 1);
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

  const openIdx = fixtures
    .map((f, i) => (isLocked(f._id) ? null : i))
    .filter((i) => i !== null);
  const openTotal = openIdx.length;
  const openFilled = openIdx.filter((i) => isFilled(predictions[i])).length;
  const hasDoublePick = predictions.some((p) => p?.isDoublePoints);

  return (
    <form onSubmit={handleSubmit} className="prediction-form">
      <SaveBurst fire={burst} />
      {allLocked && (
        <div className="alert alert-info mb-3">
          All fixtures have locked — predictions can no longer be changed.
        </div>
      )}

      {!allLocked && openTotal > 0 && (
        <div className="predict-progress mb-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <span>
              <strong>{openFilled} of {openTotal}</strong> predicted
              {!hasDoublePick && openFilled > 0 && (
                <span className="predict-progress-warn"> · no ⚡ double pick yet</span>
              )}
            </span>
            <span className="predict-progress-hint">
              Save as many as you like — the rest stay open until they kick off.
            </span>
          </div>
          <div className="predict-progress-bar">
            <div
              className="predict-progress-fill"
              style={{ width: `${openTotal ? (openFilled / openTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {fixtures.map((f, idx) => {
        const locked = isLocked(f._id);
        const pred = predictions[idx];
        const kickoff = deadlines.find((d) => d.fixtureId === f._id)?.kickoff;
        const filled = isFilled(pred);
        const lean = leanFor(pred);
        const banter = banterFor(pred);

        return (
          <TiltCard
            disabled={locked}
            className={`prediction-card ${locked ? "locked" : ""} ${
              !locked && !filled ? "unpredicted" : ""
            } ${!locked && filled ? "predicted" : ""} ${
              pred?.isDoublePoints ? "doubled" : ""
            }`}
            key={f._id}
            style={{ animationDelay: `${idx * 45}ms` }}
          >
            <div className="prediction-card-header">
              <span>
                {new Date(f.date).toLocaleDateString("en-GB", {
                  weekday: "long", day: "numeric", month: "short",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
              <span className="d-flex align-items-center gap-2">
                {!locked && (
                  filled
                    ? <span className="predict-tag predict-tag-done">✓ Predicted</span>
                    : <span className="predict-tag predict-tag-todo">Not yet</span>
                )}
                {locked ? (
                  <span className="badge bg-secondary">Locked</span>
                ) : kickoff ? (
                  <LockCountdown kickoff={kickoff} locked={locked} />
                ) : (
                  <span style={{ color: "var(--green)", fontSize: "0.75rem", fontWeight: 600 }}>Open</span>
                )}
              </span>
            </div>

            <div className="prediction-card-body">
              <div className="prediction-teams">
                <div className="prediction-team home">
                  <span>{f.teams.home.name}</span>
                  <img src={f.teams.home.logo} alt="" width="32" height="32" style={{ objectFit: "contain" }} />
                </div>

                <div className="score-inputs">
                  <div className="score-stepper">
                    <button type="button" className="step-btn" disabled={locked} onClick={() => nudgeScore(idx, "predictedHomeScore", 1)} aria-label="Home score up">+</button>
                    <input
                      type="number"
                      className="form-control score-input"
                      min="0"
                      value={pred?.predictedHomeScore ?? ""}
                      onChange={(e) => handleScoreChange(idx, "predictedHomeScore", e.target.value)}
                      disabled={locked}
                      placeholder="0"
                    />
                    <button type="button" className="step-btn" disabled={locked} onClick={() => nudgeScore(idx, "predictedHomeScore", -1)} aria-label="Home score down">−</button>
                  </div>
                  <span className="score-divider">–</span>
                  <div className="score-stepper">
                    <button type="button" className="step-btn" disabled={locked} onClick={() => nudgeScore(idx, "predictedAwayScore", 1)} aria-label="Away score up">+</button>
                    <input
                      type="number"
                      className="form-control score-input"
                      min="0"
                      value={pred?.predictedAwayScore ?? ""}
                      onChange={(e) => handleScoreChange(idx, "predictedAwayScore", e.target.value)}
                      disabled={locked}
                      placeholder="0"
                    />
                    <button type="button" className="step-btn" disabled={locked} onClick={() => nudgeScore(idx, "predictedAwayScore", -1)} aria-label="Away score down">−</button>
                  </div>
                </div>

                <div className="prediction-team">
                  <img src={f.teams.away.logo} alt="" width="32" height="32" style={{ objectFit: "contain" }} />
                  <span>{f.teams.away.name}</span>
                </div>
              </div>

              {lean && <PitchLean lean={lean} />}

              {lean && (
                <div className={`result-lean result-lean-${lean}`}>
                  {lean === "home" && `${f.teams.home.name} win`}
                  {lean === "away" && `${f.teams.away.name} win`}
                  {lean === "draw" && "Draw"}
                </div>
              )}
              {banter && <p className="score-banter">{banter}</p>}
              {pred?.isDoublePoints && (
                <div className="captain-band">Armband on. This one counts twice.</div>
              )}

              <label className={`double-points-toggle w-100 ${pred?.isDoublePoints ? "active" : ""}`}>
                <input
                  type="radio"
                  name="doublePoints"
                  checked={pred?.isDoublePoints || false}
                  // onClick rather than onChange: a radio fires no change event
                  // when you click the one already selected, which would make
                  // it impossible to un-pick your double.
                  onClick={() => handleDoubleChange(idx)}
                  onChange={() => {}}
                  disabled={locked}
                  style={{ accentColor: "var(--gold)" }}
                />
                <span className="double-points-label">
                  ⚡ Double Points
                  <span className="double-points-hint">
                    {pred?.isDoublePoints
                      ? "— click again to un-pick"
                      : "— pick one match to double your points this week"}
                  </span>
                </span>
              </label>
            </div>
          </TiltCard>
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
        <div className="save-bar">
          <button
            type="submit"
            className="btn btn-primary w-100 btn-lg"
            disabled={submitting || openFilled === 0}
          >
            {submitting ? (
              <><span className="spinner-border spinner-border-sm me-2"></span>Saving…</>
            ) : openFilled === 0 ? (
              "Enter a score to save"
            ) : openFilled === openTotal ? (
              "Save All Predictions"
            ) : (
              `Save ${openFilled} Prediction${openFilled !== 1 ? "s" : ""}`
            )}
          </button>
          <p className="text-muted text-center small mt-2 mb-0">
            You can come back and predict the rest later — each match stays open
            until an hour before it kicks off.
          </p>
        </div>
      )}
    </form>
  );
};

export default PredictionForm;
