import { useEffect, useState } from "react";

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatRemaining(ms) {
  if (ms <= 0) return "Locking…";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

// Live clock until the 1-hour lock (kickoff minus 1 hour).
function LockCountdown({ kickoff, locked }) {
  const lockAt = kickoff ? new Date(kickoff).getTime() - 60 * 60 * 1000 : null;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (locked || !lockAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [locked, lockAt]);

  if (locked || !lockAt) return null;
  const left = lockAt - now;
  if (left > 2 * 60 * 60 * 1000) {
    return (
      <span style={{ color: "var(--green)", fontSize: "0.75rem", fontWeight: 600 }}>
        Open
      </span>
    );
  }

  return (
    <span className="badge bg-warning text-dark lock-clock" aria-live="polite">
      Locks {formatRemaining(left)}
    </span>
  );
}

export default LockCountdown;
