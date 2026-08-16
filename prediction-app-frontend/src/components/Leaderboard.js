import CountUp from "./CountUp";

function RankBadge({ rank }) {
  if (rank <= 3) return <span className={`rank-badge rank-${rank}`}>{rank}</span>;
  return <span className="rank-badge rank-other">{rank}</span>;
}

// Consistent colour per player, derived from their name
const AVATAR_HUES = [14, 188, 38, 205, 340, 25];
function Avatar({ name }) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const hue = AVATAR_HUES[hash % AVATAR_HUES.length];
  return (
    <span
      className="player-avatar"
      style={{
        background: `linear-gradient(135deg, hsl(${hue},60%,45%), hsl(${hue},70%,30%))`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Leaderboard({ scores, currentUserId }) {
  if (!scores || scores.length === 0) {
    return <p className="text-muted mb-0">No players yet.</p>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover mb-0">
        <thead className="table-dark">
          <tr>
            <th style={{ width: "48px" }}>Rank</th>
            <th>Player</th>
            <th className="text-end">Points</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((entry, idx) => {
            const isMe = entry._id === currentUserId;
            const podium = idx < 3 ? `podium-${idx + 1}` : "";
            return (
              <tr key={entry._id} className={podium}>
                <td><RankBadge rank={idx + 1} /></td>
                <td>
                  <span className="d-inline-flex align-items-center gap-2">
                    <Avatar name={entry.username} />
                    <span className={isMe ? "fw-bold" : ""}>{entry.username}</span>
                    {isMe && <span className="badge bg-secondary" style={{ fontSize: "0.65rem" }}>you</span>}
                  </span>
                </td>
                <td className="text-end">
                  <CountUp
                    value={entry.totalPoints}
                    className="points-value"
                    // top three get the medal colours, everyone else stays neutral
                  />
                  <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginLeft: "3px" }}>pts</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;
